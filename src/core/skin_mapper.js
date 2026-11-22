/**
 * @fileoverview 多皮肤与换装目录同构克隆规划器（PSSplitter.Core.SkinMapper）
 * 严格对齐 PhotoshopToSpine.jsx v7.42 的 [skin] 路径前缀、default 保留名拦截与 linkedmesh 跨皮肤引用规则。
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

  var ILLEGAL_SKIN_CHARS_RE = /[\\:"*?<>|\[\]\x00-\x1F]/;
  var DOTS_ONLY_RE = /^\.+$/;
  var DRAG_ONLY_RE = /^__drag$/i;
  var WINDOWS_RESERVED_RE = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;

  /**
   * 校验目标皮肤名称是否合法（拦截 default 保留名、首尾斜杠、非法字符与 Windows 保留名）
   * @param {string} skinName 目标皮肤名（支持多级路径如 "armor/gold"）
   * @returns {{valid:boolean, errors:Array<string>}} 校验结果
   */
  function validateSkinName(skinName) {
    var P = getPolyfill();
    var errors = [];

    if (typeof skinName !== "string") {
      return { valid: false, errors: ["皮肤名称必须为字符串"] };
    }

    var trimmed = P.trim(skinName);
    if (trimmed === "") {
      return { valid: false, errors: ["皮肤名称不能为空"] };
    }

    if (trimmed.toLowerCase() === "default") {
      errors.push("皮肤名称禁止使用 Spine 保留字 default");
    }

    if (P.startsWith(trimmed, "/") || P.endsWith(trimmed, "/")) {
      errors.push("皮肤名称不得以 '/' 开头或结尾");
    }

    if (/\/{2,}/.test(trimmed)) {
      errors.push("皮肤名称不得包含连续斜杠 '//'");
    }

    if (ILLEGAL_SKIN_CHARS_RE.test(trimmed)) {
      errors.push("皮肤名称包含非法字符 (\\ : \" * ? < > | [ ] 或控制字符)");
    }

    var segments = trimmed.split("/");
    var i;
    for (i = 0; i < segments.length; i++) {
      var seg = P.trim(segments[i]);
      if (seg === "") {
        if (!P.startsWith(trimmed, "/") && !P.endsWith(trimmed, "/") && !/\/{2,}/.test(trimmed)) {
          errors.push("皮肤路径包含空分段");
        }
        continue;
      }
      if (seg.toLowerCase() === "default") {
        errors.push("皮肤路径分段禁止使用保留字 default");
      }
      if (DOTS_ONLY_RE.test(seg)) {
        errors.push("皮肤路径分段禁止为纯点号: " + seg);
      }
      if (DRAG_ONLY_RE.test(seg)) {
        errors.push("皮肤路径分段禁止为 __drag");
      }
      if (WINDOWS_RESERVED_RE.test(seg)) {
        errors.push("皮肤路径分段命中 Windows 保留名: " + seg);
      }
    }

    if (trimmed.length > 255 || P.utf8ByteLength(trimmed) > 255) {
      errors.push("皮肤名称超过 255 字节/字符限制");
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * 从解析后的标签列表中查找指定 key 的第一个标签项
   * @param {Array} tags 标签数组
   * @param {string} key 目标键
   * @returns {Object|null} 标签项
   */
  function findTag(tags, key) {
    var i;
    for (i = 0; i < tags.length; i++) {
      if (tags[i].key === key) {
        return tags[i];
      }
    }
    return null;
  }

  /**
   * 去除尾部 .png 与非法字符，辅助推算附件相对名
   * @param {string} cleanName 剥离标签后的节点名
   * @returns {string} 规范化名称片段
   */
  function normalizeAttachmentBase(cleanName) {
    var P = getPolyfill();
    var s = P.trim(cleanName || "");
    s = s.replace(/\.png$/i, "");
    s = s.replace(/[\\:"*?<>|]/g, "");
    return s;
  }

  /**
   * 构建多皮肤/换装目录同构克隆执行计划
   * @param {Object} sourceSkinNode 源皮肤 LayerSet 节点 (VirtualNode)
   * @param {string} targetSkinName 目标皮肤名（如 "dark_knight" 或 "armor/gold"）
   * @param {Object} [options] 配置项
   * @returns {{ok:boolean, errors:Array<string>, warnings:Array<string>, rootName:string|null, operations:Array}}
   */
  function buildSkinClonePlan(sourceSkinNode, targetSkinName, options) {
    var P = getPolyfill();
    var T = getSpineTags();
    var opts = options || {};
    var errors = [];
    var warnings = [];

    if (!sourceSkinNode || sourceSkinNode.type !== "LayerSet") {
      return {
        ok: false,
        errors: ["源皮肤节点必须为有效的 LayerSet 图层组"],
        warnings: [],
        rootName: null,
        operations: []
      };
    }

    var nameCheck = validateSkinName(targetSkinName);
    if (!nameCheck.valid) {
      return {
        ok: false,
        errors: nameCheck.errors,
        warnings: [],
        rootName: null,
        operations: []
      };
    }

    var includeIgnored = !!opts.includeIgnored;
    var pathStrategy = opts.pathStrategy === "keep" ? "keep" : "strip";
    var meshStrategy = opts.meshStrategy || "unlink";
    var tagPosition = opts.tagPosition === "prefix" ? "prefix" : "suffix";

    var parsedRoot = T.parseLayerName(sourceSkinNode.name, true);
    var srcSkinTag = findTag(parsedRoot.tags, "skin");
    var srcSkinName;
    if (srcSkinTag && srcSkinTag.value) {
      srcSkinName = srcSkinTag.value.replace(/^\/+/, "");
    } else if (typeof opts.sourceSkinName === "string" && P.trim(opts.sourceSkinName) !== "") {
      srcSkinName = P.trim(opts.sourceSkinName).replace(/^\/+/, "");
    } else {
      srcSkinName = parsedRoot.cleanName;
    }

    var cleanTargetSkin = P.trim(targetSkinName);
    var targetParts = cleanTargetSkin.split("/");
    var leafName = targetParts[targetParts.length - 1];
    var isNestedSkin = targetParts.length > 1;

    var skinTagVal = null;
    if (isNestedSkin) {
      skinTagVal = opts.parentHasFolder ? ("/" + cleanTargetSkin) : cleanTargetSkin;
    } else if (opts.parentHasFolder) {
      skinTagVal = "/" + cleanTargetSkin;
    }

    var rootTags = [];
    var i;
    for (i = 0; i < parsedRoot.tags.length; i++) {
      var rt = parsedRoot.tags[i];
      if (rt.key === "skin" || rt.key === "folder") {
        continue;
      }
      if (rt.key === "path" && pathStrategy === "strip") {
        warnings.push("已剥离源皮肤根组上的 [path:] 标签: " + sourceSkinNode.name);
        continue;
      }
      rootTags.push({ key: rt.key, value: rt.value });
    }
    rootTags.push({ key: "skin", value: skinTagVal });

    var rootName = T.formatLayerName(leafName, rootTags, tagPosition);
    var operations = [
      {
        type: "cloneSkinRoot",
        sourceLayerId: sourceSkinNode.id,
        sourceName: sourceSkinNode.name,
        targetName: rootName
      }
    ];

    /**
     * 递归遍历源皮肤子节点，生成同构克隆指令
     * @param {Array} children 子节点列表
     * @param {string} parentTargetPath 目标组路径
     * @param {string} folderPrefix 源皮肤内部 folder 子路径前缀
     */
    function walkChildren(children, parentTargetPath, folderPrefix) {
      if (!P.isArray(children)) {
        return;
      }
      var idx;
      for (idx = 0; idx < children.length; idx++) {
        var node = children[idx];
        if (!node) {
          continue;
        }
        var isGroup = node.type === "LayerSet";
        var parsed = T.parseLayerName(node.name, isGroup);

        if (!includeIgnored && findTag(parsed.tags, "ignore") !== null) {
          warnings.push("已跳过 [ignore] 辅助节点: " + node.name);
          continue;
        }

        var cleanBase = parsed.cleanName;
        if (P.startsWith(cleanBase, "/")) {
          warnings.push("非 default 皮肤子节点禁止以 '/' 开头，已自动剥离前导斜杠: " + node.name);
          cleanBase = cleanBase.replace(/^\/+/, "");
        }

        // 计算源皮肤下相对 folder 路径（用于 linkedmesh 跨皮肤源引用）
        var nextFolderPrefix = folderPrefix;
        var folderTag = findTag(parsed.tags, "folder");
        var folderSeg = null;
        if (folderTag) {
          folderSeg = folderTag.value !== null ? folderTag.value : normalizeAttachmentBase(cleanBase);
          if (P.startsWith(folderSeg, "/")) {
            nextFolderPrefix = folderSeg.slice(1);
          } else if (folderSeg !== "") {
            nextFolderPrefix = nextFolderPrefix ? (nextFolderPrefix + "/" + folderSeg) : folderSeg;
          }
          if (nextFolderPrefix !== "" && !P.endsWith(nextFolderPrefix, "/")) {
            nextFolderPrefix += "/";
          }
        }

        var newTags = [];
        var tIdx;
        for (tIdx = 0; tIdx < parsed.tags.length; tIdx++) {
          var t = parsed.tags[tIdx];
          if (t.key === "skin") {
            continue;
          }
          if (t.key === "path") {
            if (pathStrategy === "strip") {
              warnings.push("已剥离 [path:] 防止与源皮肤覆写同一 PNG: " + node.name);
              continue;
            }
            warnings.push("保留了 [path:]，请确认不会与源皮肤磁盘文件冲突: " + node.name);
            newTags.push({ key: "path", value: t.value });
            continue;
          }
          if (t.key === "mesh") {
            if (meshStrategy === "linkToSource") {
              if (t.value === null) {
                var attBase = normalizeAttachmentBase(cleanBase);
                var srcAttachment = srcSkinName + "/" + folderPrefix + attBase;
                newTags.push({ key: "mesh", value: srcAttachment });
              } else if (t.value.indexOf("/") === -1) {
                newTags.push({ key: "mesh", value: srcSkinName + "/" + t.value });
              } else {
                newTags.push({ key: "mesh", value: t.value });
              }
            } else if (meshStrategy === "keep") {
              if (t.value !== null && t.value.indexOf("/") === -1) {
                warnings.push("保留无皮肤前缀的 [mesh:" + t.value + "] 可能导致跨皮肤查找不到源网格");
              }
              newTags.push({ key: "mesh", value: t.value });
            } else {
              // unlink：将链接网格转为独立网格
              if (t.value !== null) {
                warnings.push("已将 [mesh:" + t.value + "] 解绑为独立 [mesh]: " + node.name);
              }
              newTags.push({ key: "mesh", value: null });
            }
            continue;
          }
          newTags.push({ key: t.key, value: t.value });
        }

        var targetNodeName = T.formatLayerName(cleanBase, newTags, tagPosition);
        if (isGroup) {
          operations.push({
            type: "createGroup",
            sourceLayerId: node.id,
            sourceName: node.name,
            targetName: targetNodeName,
            parentTargetPath: parentTargetPath
          });
          walkChildren(node.children, parentTargetPath + "/" + targetNodeName, nextFolderPrefix);
        } else {
          operations.push({
            type: "duplicateLayer",
            sourceLayerId: node.id,
            sourceName: node.name,
            targetName: targetNodeName,
            parentTargetPath: parentTargetPath
          });
        }
      }
    }

    walkChildren(sourceSkinNode.children, rootName, "");

    return {
      ok: true,
      errors: errors,
      warnings: warnings,
      rootName: rootName,
      operations: operations
    };
  }

  PSSplitter.Core.SkinMapper = {
    validateSkinName: validateSkinName,
    buildSkinClonePlan: buildSkinClonePlan
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = PSSplitter.Core.SkinMapper;
  }
})();
