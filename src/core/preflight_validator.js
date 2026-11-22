/**
 * @fileoverview 导出前全量合规性体检引擎（PSSplitter.Core.PreflightValidator）
 * 严格实现 10 条前置输入契约检查，对齐 PhotoshopToSpine.jsx v7.42 校验逻辑并补齐跨槽位大小写 PNG 碰撞、
 * [bone] 顶层空层原点污染、>=500 层未栅格化高危阻断等生产级检测规则。
 */

(function () {
  var rootScope = (typeof $ !== "undefined" && $.global)
    ? $.global
    : (typeof global !== "undefined" ? global : (function () { return this; }()));
  rootScope.PSSplitter = rootScope.PSSplitter || {};
  rootScope.PSSplitter.Core = rootScope.PSSplitter.Core || {};
  var PSSplitter = rootScope.PSSplitter;

  function getPolyfill() {
    if (PSSplitter && PSSplitter.Core && PSSplitter.Core.Polyfill) {
      return PSSplitter.Core.Polyfill;
    }
    if (typeof require === "function") {
      return require("./polyfill_es3.js");
    }
    throw new Error("PSSplitter.Core.Polyfill is required");
  }

  function getSpineTags() {
    if (PSSplitter && PSSplitter.Core && PSSplitter.Core.SpineTags) {
      return PSSplitter.Core.SpineTags;
    }
    if (typeof require === "function") {
      return require("./spine_tags.js");
    }
    throw new Error("PSSplitter.Core.SpineTags is required");
  }

  var ADJUSTMENT_KINDS = [
    "LEVELS",
    "CURVES",
    "COLORBALANCE",
    "BRIGHTNESSCONTRAST",
    "HUESATURATION",
    "SELECTIVECOLOR",
    "CHANNELMIXER",
    "GRADIENTMAP",
    "INVERSION",
    "INVERT",
    "THRESHOLD",
    "POSTERIZE",
    "EXPOSURE",
    "VIBRANCE",
    "PHOTOFILTER",
    "BLACKANDWHITE",
    "COLORLOOKUP",
    "ADJUSTMENT"
  ];

  var UNRASTERIZED_KINDS = [
    "SMARTOBJECT",
    "TEXT",
    "SOLIDFILL",
    "GRADIENTFILL",
    "PATTERNFILL",
    "VECTOR",
    "SHAPE"
  ];

  var SUPPORTED_EXPORT_BLENDS = [
    "NORMAL",
    "MULTIPLY",
    "SCREEN",
    "LINEARDODGE"
  ];

  var WINDOWS_RESERVED_RE = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
  var ILLEGAL_NAME_CHARS_RE = /[\\:"*?<>|\x00-\x1F]/g;
  var DOTS_ONLY_RE = /^\.+$/;
  var DRAG_ONLY_RE = /^__drag$/i;

  function normalizeBlend(blendMode) {
    if (!blendMode) {
      return "NORMAL";
    }
    return String(blendMode).toUpperCase().replace(/[\s_]/g, "");
  }

  function findTag(tags, key) {
    var i;
    for (i = 0; i < tags.length; i++) {
      if (tags[i].key === key) {
        return tags[i];
      }
    }
    return null;
  }

  function hasTag(tags, key) {
    return findTag(tags, key) !== null;
  }

  function isEmptyBounds(bounds) {
    var P = getPolyfill();
    if (!P.isArray(bounds) || bounds.length < 4) {
      return false;
    }
    return bounds[2] <= bounds[0] || bounds[3] <= bounds[1];
  }

  /**
   * 沿父链查找最近匹配指定标签的祖先或自身（模拟 PhotoshopToSpine.jsx findTagLayer）
   * @param {Object} wrap 包装节点
   * @param {string} key 标签键
   * @returns {Object|null} 匹配对象 { wrap, tag }
   */
  function findTagInAncestors(wrap, key) {
    var cur = wrap;
    while (cur) {
      var t = findTag(cur.parsed.tags, key);
      if (t !== null) {
        return { wrap: cur, tag: t };
      }
      cur = cur.parentWrap;
    }
    return null;
  }

  /**
   * 获取带有 [bone] 标签的节点的规范骨骼名
   * @param {Object} wrap 包装节点
   * @returns {string} 骨骼名称
   */
  function resolveBoneName(wrap) {
    var t = findTag(wrap.parsed.tags, "bone");
    if (t && t.value !== null && t.value !== "") {
      return t.value;
    }
    return wrap.parsed.cleanName;
  }

  /**
   * 沿父链向上计算所属 [folder]/[skin] 路径前缀（对齐 PhotoshopToSpine.jsx folders()）
   * @param {Object} startParentWrap 起始父包装节点
   * @returns {string} 规范化路径前缀（为空或以 "/" 结尾）
   */
  function computeFoldersPath(startParentWrap) {
    var P = getPolyfill();
    var segments = [];
    var cur = startParentWrap;

    while (cur) {
      var folderTag = findTag(cur.parsed.tags, "folder");
      var skinTag = findTag(cur.parsed.tags, "skin");
      var chosen = folderTag || skinTag;

      if (chosen) {
        if (chosen.key === "skin" && chosen.value && chosen.value.toLowerCase() === "default") {
          cur = cur.parentWrap;
          continue;
        }
        var segVal = (chosen.value !== null && chosen.value !== "") ? chosen.value : cur.parsed.cleanName;
        if (P.startsWith(segVal, "/")) {
          var rootSeg = segVal.slice(1);
          if (rootSeg !== "") {
            segments.unshift(rootSeg);
          }
          break;
        }
        if (segVal !== "") {
          segments.unshift(segVal);
        }
      }
      cur = cur.parentWrap;
    }

    if (segments.length === 0) {
      return "";
    }
    return segments.join("/") + "/";
  }

  /**
   * 对当前节点应用祖先组的 [name:pattern] 命名模板（由内向外）
   * @param {Object} wrap 包装节点
   * @param {string} baseName 清洗后基础名
   * @returns {string} 应用模板后的名称
   */
  function applyAncestorNamePatterns(wrap, baseName) {
    var name = baseName;
    var cur = wrap.parentWrap;
    while (cur) {
      var nt = findTag(cur.parsed.tags, "name");
      if (nt && nt.value && nt.value.indexOf("*") !== -1) {
        name = nt.value.replace(/\*/g, name);
      }
      cur = cur.parentWrap;
    }
    return name;
  }

  /**
   * 计算节点所属最近 [skin] 名称（含其上级 folder 前缀，若无则返回 "default"）
   * @param {Object} wrap 包装节点
   * @returns {string} 皮肤名
   */
  function resolveSkinName(wrap) {
    var P = getPolyfill();
    var found = findTagInAncestors(wrap, "skin");
    if (!found) {
      return "default";
    }
    var skinWrap = found.wrap;
    var skinTag = found.tag;
    var skinSeg = (skinTag.value !== null && skinTag.value !== "") ? skinTag.value : skinWrap.parsed.cleanName;

    if (P.startsWith(skinSeg, "/")) {
      return skinSeg.slice(1);
    }
    var parentFolders = computeFoldersPath(skinWrap.parentWrap);
    return parentFolders + skinSeg;
  }

  /**
   * 对全树节点执行导出前 10 条前置契约体检
   * @param {Object} virtualDoc VirtualDoc 文档快照
   * @param {Object} [options] 选项 {ignoreHiddenLayers?:boolean, ignoreBackground?:boolean, largeDocLayerThreshold?:number}
   * @returns {{passed:boolean, summary:{errors:number, warnings:number, infos:number}, issues:Array, exportStats:{attachmentCount:number, caseInsensitivePaths:Array}}}
   */
  function validateDocument(virtualDoc, options) {
    var P = getPolyfill();
    var T = getSpineTags();
    var opts = options || {};
    var ignoreHiddenLayers = !!opts.ignoreHiddenLayers;
    var ignoreBackground = opts.ignoreBackground !== false;
    var largeThreshold = (typeof opts.largeDocLayerThreshold === "number" && opts.largeDocLayerThreshold > 0)
      ? opts.largeDocLayerThreshold
      : 500;

    var doc = virtualDoc || {};
    var issues = [];
    var summary = { errors: 0, warnings: 0, infos: 0 };

    function addIssue(code, severity, node, nodePath, message, autoFixable, fixAction) {
      issues.push({
        code: code,
        severity: severity,
        layerId: node ? node.id : null,
        layerName: node ? node.name : null,
        path: nodePath || "",
        message: message,
        autoFixable: !!autoFixable,
        fixAction: fixAction || null
      });
      if (severity === "ERROR") {
        summary.errors++;
      } else if (severity === "WARNING") {
        summary.warnings++;
      } else {
        summary.infos++;
      }
    }

    // 1. 文档级契约检查
    if (doc.mode !== "RGB") {
      addIssue(
        "DOC_NOT_RGB",
        "ERROR",
        null,
        "",
        "文档颜色模式必须为 RGB（当前: " + String(doc.mode) + "）",
        true,
        "CONVERT_TO_RGB"
      );
    }
    if (doc.bitsPerChannel !== undefined && doc.bitsPerChannel !== 8) {
      addIssue(
        "DOC_NOT_8BIT",
        "WARNING",
        null,
        "",
        "建议文档位深度为 8-bit（当前: " + String(doc.bitsPerChannel) + "-bit）",
        true,
        "CONVERT_TO_8BIT"
      );
    }
    if (doc.saved !== true) {
      addIssue(
        "DOC_UNSAVED",
        "ERROR",
        null,
        "",
        "文档尚未保存至磁盘，PhotoshopToSpine.jsx 无法读取输出根目录",
        false,
        null
      );
    }
    if (doc.hasArtboards === true) {
      addIssue(
        "ARTBOARD_DETECTED",
        "ERROR",
        null,
        "",
        "检测到画板 (Artboard)，官方导出脚本在画板文档下会导致坐标与切片异常",
        false,
        null
      );
    }
    if (!doc.rulerOrigin || (doc.rulerOrigin.x === 0 && doc.rulerOrigin.y === 0)) {
      addIssue(
        "RULER_ORIGIN_DEFAULT",
        "INFO",
        null,
        "",
        "文档标尺原点仍为默认 (0, 0) 或未记录，请确认是否已对齐角色脚底中心原点",
        false,
        null
      );
    }

    var docWidth = (typeof doc.width === "number" && doc.width > 0) ? doc.width : 0;
    var docHeight = (typeof doc.height === "number" && doc.height > 0) ? doc.height : 0;

    // 2. 第一遍：构建带 parent 引用的包装树并统计层数
    var countedLayers = 0;

    function buildWraps(nodes, parentWrap, parentPath) {
      var list = [];
      if (!P.isArray(nodes)) {
        return list;
      }
      var i;
      for (i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (!n) {
          continue;
        }
        countedLayers++;
        var isGroup = n.type === "LayerSet";
        var parsed = T.parseLayerName(n.name, isGroup);
        var upperKind = n.kind ? String(n.kind).toUpperCase() : "NORMAL";
        var nodePath = parentPath ? (parentPath + "/" + n.name) : String(n.name || "");
        var isEmpty = isGroup
          ? (!P.isArray(n.children) || n.children.length === 0)
          : (n.isEmpty === true || isEmptyBounds(n.bounds));

        var wrap = {
          node: n,
          parentWrap: parentWrap,
          isGroup: isGroup,
          nodePath: nodePath,
          parsed: parsed,
          upperKind: upperKind,
          isAdjustment: !isGroup && P.indexOf(ADJUSTMENT_KINDS, upperKind) !== -1,
          isUnrasterizedKind: !isGroup && P.indexOf(UNRASTERIZED_KINDS, upperKind) !== -1,
          hasIgnoreTag: hasTag(parsed.tags, "ignore"),
          hasMergeTag: hasTag(parsed.tags, "merge"),
          hasOverlayTag: hasTag(parsed.tags, "overlay"),
          isEmptyNode: isEmpty,
          childrenWraps: []
        };
        if (isGroup && P.isArray(n.children)) {
          wrap.childrenWraps = buildWraps(n.children, wrap, nodePath);
        }
        list.push(wrap);
      }
      return list;
    }

    var rootWraps = buildWraps(doc.layers || [], null, "");
    var reportedTotal = (typeof doc.totalLayerCount === "number" && doc.totalLayerCount > 0) ? doc.totalLayerCount : 0;
    var effectiveTotalCount = Math.max(countedLayers, reportedTotal);

    var hasAnyUnrasterized = false;
    var exportRecords = [];
    var boneParentRegistry = {};
    var reportedBoneConflict = {};
    var boneTopEmptySeen = {};

    /**
     * 检查并记录标签层面的详细错误（对齐契约 2）
     * @param {Object} wrap 包装节点
     */
    function checkNodeTags(wrap) {
      var n = wrap.node;
      var parsed = wrap.parsed;
      var i;

      for (i = 0; i < parsed.invalidTags.length; i++) {
        var inv = parsed.invalidTags[i];
        var inner = P.trim(inv.slice(1, inv.length - 1));
        var colonIdx = inner.indexOf(":");
        var rawKey = colonIdx !== -1 ? P.trim(inner.slice(0, colonIdx)) : inner;
        var rawVal = colonIdx !== -1 ? P.trim(inner.slice(colonIdx + 1)) : null;
        var lowerKey = rawKey.toLowerCase();

        if (lowerKey === "notrim") {
          addIssue(
            "INVALID_TAG_NOTRIM",
            "ERROR",
            n,
            wrap.nodePath,
            "不支持非法标签 [notrim]，请替换为 [trim:false]",
            true,
            "REPLACE_NOTRIM_TAG"
          );
        } else if (colonIdx !== -1 && rawVal === "" && P.indexOf(T.OFFICIAL_TAGS, lowerKey) !== -1 && rawKey === lowerKey) {
          addIssue(
            "EMPTY_TAG_VALUE",
            "ERROR",
            n,
            wrap.nodePath,
            "标签参数不能为空: " + inv,
            false,
            null
          );
        } else if (rawKey === "name" && !wrap.isGroup) {
          addIssue(
            "GROUP_ONLY_TAG_ON_LAYER",
            "ERROR",
            n,
            wrap.nodePath,
            "标签 [name:pattern] 仅可用于图层组: " + inv,
            false,
            null
          );
        } else if (rawKey === "name" && wrap.isGroup && rawVal !== null && rawVal.indexOf("*") === -1) {
          addIssue(
            "INVALID_NAME_PATTERN",
            "ERROR",
            n,
            wrap.nodePath,
            "标签 [name:pattern] 必须包含 '*' 通配符: " + inv,
            false,
            null
          );
        } else if (rawKey === "scale" && colonIdx !== -1) {
          addIssue(
            "INVALID_SCALE_VALUE",
            "ERROR",
            n,
            wrap.nodePath,
            "标签 [scale] 参数必须为大于 0 的有限正数: " + inv,
            false,
            null
          );
        } else {
          addIssue(
            "INVALID_TAG",
            "ERROR",
            n,
            wrap.nodePath,
            "包含非法或大小写不合规标签: " + inv,
            false,
            null
          );
        }
      }

      if (wrap.isGroup && hasTag(parsed.tags, "path") && !wrap.hasMergeTag) {
        addIssue(
          "PATH_TAG_ON_NON_MERGE_GROUP",
          "ERROR",
          n,
          wrap.nodePath,
          "普通非 [merge] 图层组严禁使用 [path:]，否则所有子图层将继承同一路径并互相覆盖",
          false,
          null
        );
      }

      if (!wrap.isGroup && wrap.hasMergeTag) {
        addIssue(
          "REDUNDANT_MERGE_ON_LAYER",
          "INFO",
          n,
          wrap.nodePath,
          "普通图层上存在冗余 [merge] 标签",
          true,
          "REMOVE_MERGE_TAG"
        );
      }

      var skinTag = findTag(parsed.tags, "skin");
      if (skinTag && skinTag.value && skinTag.value.toLowerCase() === "default") {
        addIssue(
          "DEFAULT_SKIN_RESERVED",
          "ERROR",
          n,
          wrap.nodePath,
          "皮肤名禁止使用 Spine 保留字 default",
          false,
          null
        );
      }
    }

    /**
     * 记录所属骨骼链路父子一致性（契约 9）
     * @param {Object} wrap 包装节点
     */
    function checkBoneChainConsistency(wrap) {
      var cur = wrap;
      while (cur) {
        if (hasTag(cur.parsed.tags, "bone")) {
          var boneName = resolveBoneName(cur);
          var parentBoneWrap = findTagInAncestors(cur.parentWrap, "bone");
          var parentBoneName = parentBoneWrap ? resolveBoneName(parentBoneWrap.wrap) : "__root__";

          if (!P.hasOwn(boneParentRegistry, boneName)) {
            boneParentRegistry[boneName] = parentBoneName;
          } else if (boneParentRegistry[boneName] !== parentBoneName && !P.hasOwn(reportedBoneConflict, boneName)) {
            reportedBoneConflict[boneName] = true;
            addIssue(
              "INCONSISTENT_BONE_PARENT",
              "ERROR",
              cur.node,
              cur.nodePath,
              "同名骨骼 [" + boneName + "] 存在不一致的父骨骼关系（预期: " + boneParentRegistry[boneName] + "，实际: " + parentBoneName + "）",
              false,
              null
            );
          }
        }
        cur = cur.parentWrap;
      }
    }

    /**
     * 第二遍：递归体检全树
     * @param {Array} wraps 包装节点列表
     * @param {boolean} inMergeGroup 是否处于某个 [merge] 组内部
     */
    function inspectWraps(wraps, inMergeGroup) {
      var i;
      for (i = 0; i < wraps.length; i++) {
        var wrap = wraps[i];
        var n = wrap.node;

        // 契约 7：[ignore] 作用域优先隔离（早于标签检查，对齐官方 L1289）
        if (wrap.hasIgnoreTag) {
          continue;
        }

        // 背景层处理
        if (n.isBackground) {
          if (ignoreBackground) {
            continue;
          }
          addIssue(
            "BACKGROUND_LAYER_INCLUDED",
            "WARNING",
            n,
            wrap.nodePath,
            "背景层未被忽略，导出时可能作为整张底图输出",
            true,
            "UNLOCK_OR_IGNORE_BG"
          );
        }

        // 画板节点检查
        if (n.isArtboard && doc.hasArtboards !== true) {
          addIssue(
            "ARTBOARD_DETECTED",
            "ERROR",
            n,
            wrap.nodePath,
            "检测到画板组 (Artboard)",
            false,
            null
          );
        }

        // 隐藏层策略
        if (n.visible === false) {
          if (ignoreHiddenLayers) {
            addIssue(
              "HIDDEN_LAYER_SKIPPED",
              "INFO",
              n,
              wrap.nodePath,
              "隐藏图层/组已按 ignoreHiddenLayers 策略跳过导出",
              false,
              null
            );
            continue;
          }
          addIssue(
            "HIDDEN_LAYER_WILL_EXPORT",
            "WARNING",
            n,
            wrap.nodePath,
            "隐藏图层/组在默认导出配置下仍会被导出，建议添加 [ignore] 或清理",
            true,
            "TAG_IGNORE_HIDDEN_LAYERS"
          );
        }

        // 标签规范检查
        checkNodeTags(wrap);

        // 锁定检查（非 merge 组内部或组自身）
        if (n.allLocked === true && !inMergeGroup) {
          addIssue(
            "LOCKED_EXPORT_LAYER",
            "WARNING",
            n,
            wrap.nodePath,
            "图层或组处于完全锁定状态，可能阻塞栅格化、烘焙与清理操作",
            true,
            "UNLOCK_LAYERS"
          );
        }

        // 组处理
        if (wrap.isGroup && !wrap.hasMergeTag) {
          var groupBlend = normalizeBlend(n.blendMode);
          if (groupBlend !== "PASSTHROUGH" && P.indexOf(SUPPORTED_EXPORT_BLENDS, groupBlend) === -1) {
            addIssue(
              "UNSUPPORTED_BLEND_MODE",
              "WARNING",
              n,
              wrap.nodePath,
              "图层组使用了 Spine 不支持的混合模式: " + String(n.blendMode),
              true,
              "CONVERT_BLEND_MODE"
            );
          }

          if (wrap.isEmptyNode) {
            addIssue(
              "EMPTY_GROUP",
              "WARNING",
              n,
              wrap.nodePath,
              "存在空图层组（不含任何子图层）",
              true,
              "DELETE_EMPTY_LAYERS"
            );
            continue;
          }

          inspectWraps(wrap.childrenWraps, inMergeGroup);
          continue;
        }

        // [merge] 组内部只检查子层隐藏与标签；其作为整体合并导出
        var isMergeRoot = wrap.isGroup && wrap.hasMergeTag;
        if (isMergeRoot && wrap.isEmptyNode) {
          addIssue(
            "EMPTY_GROUP",
            "WARNING",
            n,
            wrap.nodePath,
            "空的 [merge] 图层组无法生成有效附件",
            true,
            "DELETE_EMPTY_LAYERS"
          );
          continue;
        }

        // 悬空调整层与悬空剪贴蒙版（仅在非 [merge] 组外阻断，对齐官方 L1293）
        if (!inMergeGroup && !isMergeRoot) {
          if (wrap.isAdjustment) {
            addIssue(
              "DANGLING_ADJUSTMENT_LAYER",
              "ERROR",
              n,
              wrap.nodePath,
              "组外调整图层在导出时会被官方脚本跳过且不隐藏，可能污染其他切图",
              true,
              "BAKE_ADJUSTMENTS"
            );
            continue;
          }
          if (n.grouped === true) {
            addIssue(
              "DANGLING_CLIPPING_MASK",
              "ERROR",
              n,
              wrap.nodePath,
              "非 [merge] 组内的剪贴蒙版子层在导出时会被跳过且不隐藏，请先合并剪贴链",
              true,
              "MERGE_CLIP_CHAINS"
            );
            continue;
          }
        }

        // [overlay] 仅检查基础混合/标签，不单独作为附件导出
        if (wrap.hasOverlayTag) {
          continue;
        }

        // 非 [merge] 内部时检查未栅格化、矢量蒙版、FX 与混合模式
        if (!inMergeGroup) {
          if (wrap.isUnrasterizedKind) {
            hasAnyUnrasterized = true;
            if (effectiveTotalCount >= largeThreshold) {
              addIssue(
                "UNRASTERIZED_LAYER_HIGH_RISK_500",
                "ERROR",
                n,
                wrap.nodePath,
                "文档图层总数 >= " + largeThreshold + "，官方 rasterizeAll() 将失效，必须提前栅格化该图层",
                true,
                "RASTERIZE_LAYERS"
              );
            } else {
              addIssue(
                "UNRASTERIZED_LAYER",
                "WARNING",
                n,
                wrap.nodePath,
                "存在未栅格化智能对象/文本/填充/矢量层，建议导出前先栅格化",
                true,
                "RASTERIZE_LAYERS"
              );
            }
          }

          if (n.hasVectorMask === true) {
            hasAnyUnrasterized = true;
            addIssue(
              "VECTOR_MASK_PRESENT",
              "WARNING",
              n,
              wrap.nodePath,
              "图层带有矢量蒙版，建议导出前栅格化固化",
              true,
              "RASTERIZE_LAYERS"
            );
          }

          if (n.hasLayerEffects === true) {
            addIssue(
              "LAYER_EFFECTS_PRESENT",
              "WARNING",
              n,
              wrap.nodePath,
              "图层带有图层样式 (FX)，建议通过 newLayerBelow+merge 烘焙后再导出",
              true,
              "BAKE_LAYER_EFFECTS"
            );
          }

          var leafBlend = normalizeBlend(n.blendMode);
          if (P.indexOf(SUPPORTED_EXPORT_BLENDS, leafBlend) === -1) {
            addIssue(
              "UNSUPPORTED_BLEND_MODE",
              "WARNING",
              n,
              wrap.nodePath,
              "图层使用了 Spine 不支持的混合模式: " + String(n.blendMode),
              true,
              "CONVERT_BLEND_MODE"
            );
          }
        }

        // 空像素层 & [bone] 顶层空层飞角检查
        if (!isMergeRoot && wrap.isEmptyNode) {
          var boneAnc = findTagInAncestors(wrap, "bone");
          var boneKey = boneAnc ? resolveBoneName(boneAnc.wrap) : null;
          if (boneKey !== null && !P.hasOwn(boneTopEmptySeen, boneKey)) {
            boneTopEmptySeen[boneKey] = true;
            addIssue(
              "EMPTY_LAYER_CORRUPTS_BONE_ORIGIN",
              "ERROR",
              n,
              wrap.nodePath,
              "骨骼 [" + boneKey + "] 组内最顶有效导出位置为空像素层，将导致官方脚本将骨骼原点错误覆写为画布角点",
              true,
              "DELETE_EMPTY_LAYERS"
            );
          } else {
            addIssue(
              "EMPTY_LAYER",
              "WARNING",
              n,
              wrap.nodePath,
              "存在无有效像素的空图层",
              true,
              "DELETE_EMPTY_LAYERS"
            );
          }
          // 标记所属骨骼已见过首个候选节点
          if (boneKey !== null) {
            boneTopEmptySeen[boneKey] = true;
          }
          continue;
        }

        // 非空节点也标记所属骨骼已见过最顶有效节点
        var activeBoneAnc = findTagInAncestors(wrap, "bone");
        if (activeBoneAnc) {
          boneTopEmptySeen[resolveBoneName(activeBoneAnc.wrap)] = true;
        }

        // 若是 [merge] 根，仍检查其子孙中是否有非法标签/隐藏提示（不再单独收集导出）
        if (isMergeRoot && wrap.childrenWraps.length > 0) {
          inspectWraps(wrap.childrenWraps, true);
        }

        if (inMergeGroup) {
          continue;
        }

        // 越界像素检查（契约 10）
        if (docWidth > 0 && docHeight > 0 && P.isArray(n.bounds) && n.bounds.length >= 4 && !isEmptyBounds(n.bounds)) {
          if (n.bounds[0] < 0 || n.bounds[1] < 0 || n.bounds[2] > docWidth || n.bounds[3] > docHeight) {
            addIssue(
              "LAYER_OUT_OF_BOUNDS",
              "WARNING",
              n,
              wrap.nodePath,
              "图层像素包围盒超出画布边界，建议按画布裁切避免导出尺寸异常",
              true,
              "CLIP_OUT_OF_BOUNDS"
            );
          }
        }

        // 骨骼一致性检查
        checkBoneChainConsistency(wrap);

        // 附件命名、路径、皮肤、槽位与 Mesh 元数据计算
        var strippedBase = P.trim(wrap.parsed.cleanName);
        var noPngBase = strippedBase.replace(/\.png$/i, "");
        var hadIllegalChars = ILLEGAL_NAME_CHARS_RE.test(noPngBase);
        ILLEGAL_NAME_CHARS_RE.lastIndex = 0;
        var cleanBase = noPngBase.replace(ILLEGAL_NAME_CHARS_RE, "");
        if (DOTS_ONLY_RE.test(cleanBase) || DRAG_ONLY_RE.test(cleanBase)) {
          cleanBase = "";
        }

        var appliedName = applyAncestorNamePatterns(wrap, cleanBase);
        if (hadIllegalChars && appliedName !== "") {
          addIssue(
            "NAME_CONTAINS_ILLEGAL_CHARS",
            "WARNING",
            n,
            wrap.nodePath,
            "图层名称包含非法文件系统字符，导出时将被静默剔除",
            true,
            "SANITIZE_LAYER_NAME"
          );
        }

        // 校验最终分段是否命中 Windows 保留名、空名或超 255 字符
        var invalidAttachReason = null;
        if (appliedName === "" || appliedName === "/") {
          invalidAttachReason = "清洗或套用 [name:] 后附件名为空";
        } else {
          var attSegs = appliedName.replace(/^\//, "").split("/");
          var si;
          for (si = 0; si < attSegs.length; si++) {
            var aseg = attSegs[si];
            if (aseg === "" || DOTS_ONLY_RE.test(aseg) || DRAG_ONLY_RE.test(aseg) || WINDOWS_RESERVED_RE.test(aseg)) {
              invalidAttachReason = "附件路径分段非法或命中 Windows 保留名: " + aseg;
              break;
            }
          }
          if (invalidAttachReason === null && (appliedName.length > 255 || P.utf8ByteLength(appliedName) > 255)) {
            invalidAttachReason = "附件名称超过 255 字符/字节限制";
          }
        }

        if (invalidAttachReason !== null) {
          addIssue(
            "INVALID_ATTACHMENT_NAME",
            "ERROR",
            n,
            wrap.nodePath,
            invalidAttachReason,
            true,
            "SANITIZE_LAYER_NAME"
          );
        }

        var foldersPath = computeFoldersPath(wrap.parentWrap);
        var attachmentName = P.startsWith(appliedName, "/")
          ? appliedName.slice(1)
          : (foldersPath + appliedName);

        var skinName = resolveSkinName(wrap);
        var placeholderName = attachmentName;
        if (skinName.toLowerCase() !== "default") {
          var expectedPrefix = skinName + "/";
          if (!P.startsWith(attachmentName, expectedPrefix)) {
            addIssue(
              "EXPECTED_ATTACHMENT_PREFIX",
              "ERROR",
              n,
              wrap.nodePath,
              "皮肤 [" + skinName + "] 内附件路径 '" + attachmentName + "' 必须以 '" + expectedPrefix + "' 开头（请检查子层或子组是否误加前导 '/'）",
              true,
              "REMOVE_LEADING_SLASH"
            );
          } else {
            placeholderName = attachmentName.slice(expectedPrefix.length);
          }
        }

        var pathFound = findTagInAncestors(wrap, "path");
        var attachmentPath = attachmentName;
        if (pathFound && pathFound.tag.value) {
          var pv = pathFound.tag.value;
          attachmentPath = P.startsWith(pv, "/") ? pv.slice(1) : (foldersPath + pv);
        }

        var slotFound = findTagInAncestors(wrap, "slot");
        var slotName = (slotFound && slotFound.tag.value)
          ? slotFound.tag.value
          : (slotFound ? slotFound.wrap.parsed.cleanName : appliedName.replace(/^\//, ""));

        var meshFound = findTagInAncestors(wrap, "mesh");
        var hasMesh = meshFound !== null;
        var meshSource = (meshFound && meshFound.tag.value) ? meshFound.tag.value : null;

        exportRecords.push({
          wrap: wrap,
          node: n,
          nodePath: wrap.nodePath,
          skinName: skinName,
          slotName: slotName,
          attachmentName: attachmentName,
          attachmentPath: attachmentPath,
          placeholderName: placeholderName,
          blendMode: normalizeBlend(n.blendMode),
          hasMesh: hasMesh,
          meshSource: meshSource
        });
      }
    }

    inspectWraps(rootWraps, false);

    // >=500 层总览告警
    if (effectiveTotalCount >= largeThreshold && hasAnyUnrasterized) {
      addIssue(
        "LARGE_DOC_RASTERIZE_RISK",
        "WARNING",
        null,
        "",
        "文档总图层数 (" + effectiveTotalCount + ") >= " + largeThreshold + "，存在未栅格化图层时官方脚本将无法自动栅格化",
        true,
        "RASTERIZE_LAYERS"
      );
    }

    // 3. 收集后交叉校验：重名、混合模式混用、磁盘 PNG 大小写碰撞、Mesh 引用与环检测
    var slotSkinPlaceholders = {}; // skin::slot::placeholder -> record
    var slotPlaceholderSkins = {}; // slot::placeholder -> { skinName: record }
    var slotBlends = {};           // slot -> { blendMode, reported }
    var pathCaseMap = {};          // lowerPath -> { paths: [], layerIds: [], nodes: [] }
    var slotAttachmentLookup = {}; // slot -> { attachmentName: record }

    var rIdx;
    for (rIdx = 0; rIdx < exportRecords.length; rIdx++) {
      var rec = exportRecords[rIdx];

      // 登记 slot 混合模式一致性
      if (!P.hasOwn(slotBlends, rec.slotName)) {
        slotBlends[rec.slotName] = { blend: rec.blendMode, reported: false };
      } else if (slotBlends[rec.slotName].blend !== rec.blendMode && !slotBlends[rec.slotName].reported) {
        slotBlends[rec.slotName].reported = true;
        addIssue(
          "SLOT_MIXED_BLEND_MODES",
          "INFO",
          rec.node,
          rec.nodePath,
          "槽位 [" + rec.slotName + "] 下存在不同混合模式的图层，导出时后遍历图层会覆盖槽位混合模式",
          false,
          null
        );
      }

      // 同皮肤同槽位重复 placeholderName
      var ssKey = rec.skinName + "::" + rec.slotName + "::" + rec.placeholderName;
      if (P.hasOwn(slotSkinPlaceholders, ssKey)) {
        addIssue(
          "DUPLICATE_SKIN_ATTACHMENT",
          "ERROR",
          rec.node,
          rec.nodePath,
          "皮肤 [" + rec.skinName + "] 的槽位 [" + rec.slotName + "] 下存在重复附件占位名: " + rec.placeholderName,
          false,
          null
        );
      } else {
        slotSkinPlaceholders[ssKey] = rec;
      }

      // default 与命名皮肤同槽位同占位名冲突（对齐官方 L510-537）
      var spKey = rec.slotName + "::" + rec.placeholderName;
      if (!P.hasOwn(slotPlaceholderSkins, spKey)) {
        slotPlaceholderSkins[spKey] = {};
      }
      var existingSkins = slotPlaceholderSkins[spKey];
      var isCurrentDefault = rec.skinName.toLowerCase() === "default";
      var skList = P.keys(existingSkins);
      var skIdx;
      for (skIdx = 0; skIdx < skList.length; skIdx++) {
        var prevSkin = skList[skIdx];
        var isPrevDefault = prevSkin.toLowerCase() === "default";
        if (isCurrentDefault !== isPrevDefault) {
          addIssue(
            "DUPLICATE_SLOT_ATTACHMENT",
            "ERROR",
            rec.node,
            rec.nodePath,
            "槽位 [" + rec.slotName + "] 下的附件 [" + rec.placeholderName + "] 同时出现在 default 皮肤与命名皮肤 [" + (isCurrentDefault ? prevSkin : rec.skinName) + "] 中",
            false,
            null
          );
          break;
        }
      }
      existingSkins[rec.skinName] = rec;

      // 记录 slot 内附件索引（用于 Mesh 查找）
      if (!P.hasOwn(slotAttachmentLookup, rec.slotName)) {
        slotAttachmentLookup[rec.slotName] = {};
      }
      slotAttachmentLookup[rec.slotName][rec.attachmentName] = rec;

      // 磁盘 PNG 路径大小写碰撞（仅针对实际写盘的非 linkedmesh 附件）
      if (!(rec.hasMesh && rec.meshSource !== null) && rec.attachmentPath !== "") {
        var lowerP = rec.attachmentPath.toLowerCase();
        if (!P.hasOwn(pathCaseMap, lowerP)) {
          pathCaseMap[lowerP] = {
            lowerPath: lowerP,
            paths: [rec.attachmentPath],
            layerIds: [rec.node.id],
            records: [rec]
          };
        } else {
          var entry = pathCaseMap[lowerP];
          if (P.indexOf(entry.paths, rec.attachmentPath) === -1) {
            entry.paths.push(rec.attachmentPath);
          }
          entry.layerIds.push(rec.node.id);
          entry.records.push(rec);
        }
      }
    }

    // 汇总跨槽位 / 不区分大小写 PNG 碰撞
    var caseInsensitivePaths = [];
    var pathKeys = P.keys(pathCaseMap);
    var pkIdx;
    for (pkIdx = 0; pkIdx < pathKeys.length; pkIdx++) {
      var bucket = pathCaseMap[pathKeys[pkIdx]];
      if (bucket.layerIds.length > 1) {
        caseInsensitivePaths.push({
          lowerPath: bucket.lowerPath,
          paths: bucket.paths,
          layerIds: bucket.layerIds
        });
        var firstConflictRec = bucket.records[1];
        addIssue(
          "PNG_PATH_COLLISION_CASE_INSENSITIVE",
          "ERROR",
          firstConflictRec.node,
          firstConflictRec.nodePath,
          "磁盘导出 PNG 路径发生碰撞（不区分大小写）: " + bucket.paths.join(" <-> "),
          false,
          null
        );
      }
    }

    // 4. Mesh 源存在性、类型与环检测（契约 10）
    for (rIdx = 0; rIdx < exportRecords.length; rIdx++) {
      var mRec = exportRecords[rIdx];
      if (!mRec.hasMesh || mRec.meshSource === null) {
        continue;
      }
      var slotMap = slotAttachmentLookup[mRec.slotName] || {};
      var targetRec = P.hasOwn(slotMap, mRec.meshSource) ? slotMap[mRec.meshSource] : null;
      if (!targetRec) {
        addIssue(
          "MESH_SOURCE_NOT_FOUND",
          "ERROR",
          mRec.node,
          mRec.nodePath,
          "同槽位 [" + mRec.slotName + "] 下找不到 [mesh:" + mRec.meshSource + "] 指向的源网格图层",
          false,
          null
        );
        continue;
      }
      if (!targetRec.hasMesh) {
        addIssue(
          "MESH_SOURCE_NOT_MESH",
          "ERROR",
          mRec.node,
          mRec.nodePath,
          "[mesh:" + mRec.meshSource + "] 指向的源图层 '" + targetRec.node.name + "' 自身未启用 [mesh] 标签",
          false,
          null
        );
        continue;
      }

      // 环检测
      var visited = [mRec];
      var cursor = targetRec;
      var hasCycle = false;
      while (cursor) {
        if (P.indexOf(visited, cursor) !== -1) {
          hasCycle = true;
          break;
        }
        visited.push(cursor);
        if (!cursor.hasMesh || cursor.meshSource === null) {
          break;
        }
        var cSlotMap = slotAttachmentLookup[cursor.slotName] || {};
        cursor = P.hasOwn(cSlotMap, cursor.meshSource) ? cSlotMap[cursor.meshSource] : null;
      }
      if (hasCycle) {
        addIssue(
          "MESH_CYCLE_DETECTED",
          "ERROR",
          mRec.node,
          mRec.nodePath,
          "检测到 [mesh] 跨图层链接循环引用: " + mRec.attachmentName + " -> " + mRec.meshSource,
          false,
          null
        );
      }
    }

    return {
      passed: summary.errors === 0,
      summary: summary,
      issues: issues,
      exportStats: {
        attachmentCount: exportRecords.length,
        caseInsensitivePaths: caseInsensitivePaths
      }
    };
  }

  PSSplitter.Core.PreflightValidator = {
    validateDocument: validateDocument
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = PSSplitter.Core.PreflightValidator;
  }
})();
