/**
 * @fileoverview 导出前安全净身动作计划生成器（PSSplitter.Core.SanitizePlanner）
 * 严格按拓扑顺序编排 15 步无冲突预处理操作，强制执行备份快照安全门控，
 * 并绝对隔离 [ignore]（含 SRC_BACKUP [ignore] 与 __REF__ [ignore]）保护区域。
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

  function getClipChainResolver() {
    if (PSSplitter && PSSplitter.Core && PSSplitter.Core.ClipChainResolver) {
      return PSSplitter.Core.ClipChainResolver;
    }
    if (typeof require === "function") {
      return require("./clip_chain_resolver.js");
    }
    throw new Error("PSSplitter.Core.ClipChainResolver is required");
  }

  function getAlignmentMath() {
    if (PSSplitter && PSSplitter.Core && PSSplitter.Core.AlignmentMath) {
      return PSSplitter.Core.AlignmentMath;
    }
    if (typeof require === "function") {
      return require("./alignment_math.js");
    }
    throw new Error("PSSplitter.Core.AlignmentMath is required");
  }

  function getPreflightValidator() {
    if (PSSplitter && PSSplitter.Core && PSSplitter.Core.PreflightValidator) {
      return PSSplitter.Core.PreflightValidator;
    }
    if (typeof require === "function") {
      return require("./preflight_validator.js");
    }
    throw new Error("PSSplitter.Core.PreflightValidator is required");
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

  function hasTagKey(tags, key) {
    var i;
    for (i = 0; i < tags.length; i++) {
      if (tags[i].key === key) {
        return true;
      }
    }
    return false;
  }

  function pushUnique(arr, val) {
    var P = getPolyfill();
    if (val !== null && val !== undefined && P.indexOf(arr, val) === -1) {
      arr.push(val);
    }
  }

  /**
   * 检测文档顶层是否已存在 SRC_BACKUP [ignore] 快照备份组
   * @param {Object} virtualDoc VirtualDoc 文档快照
   * @returns {boolean} 是否已存在备份组
   */
  function hasBackupSnapshotGroup(virtualDoc) {
    var P = getPolyfill();
    var T = getSpineTags();
    if (!virtualDoc || !P.isArray(virtualDoc.layers)) {
      return false;
    }
    var i;
    for (i = 0; i < virtualDoc.layers.length; i++) {
      var n = virtualDoc.layers[i];
      if (!n || n.type !== "LayerSet") {
        continue;
      }
      var parsed = T.parseLayerName(n.name, true);
      if (parsed.cleanName === "SRC_BACKUP" && hasTagKey(parsed.tags, "ignore")) {
        return true;
      }
    }
    return false;
  }

  /**
   * 生成导出前安全净身步骤计划
   * @param {Object} virtualDoc VirtualDoc 文档快照
   * @param {Object} [preflightReport] PreflightValidator.validateDocument 输出报告（缺省时自动执行体检）
   * @param {Object} [policy] 清理策略配置
   * @returns {{requiresBackupSnapshot:boolean, steps:Array<{action:string, layerIds:Array<number>, params:Object, description:string}>}}
   */
  function buildSanitizePlan(virtualDoc, preflightReport, policy) {
    var P = getPolyfill();
    var T = getSpineTags();
    var ClipResolver = getClipChainResolver();
    var AlignMath = getAlignmentMath();
    var Validator = getPreflightValidator();

    var doc = virtualDoc || {};
    var pol = policy || {};

    var createBackupSnapshot = pol.createBackupSnapshot !== false;
    var convertToRgb8Bit = pol.convertToRgb8Bit !== false;
    var unlockLayers = pol.unlockLayers !== false;
    var fixAutoFixableTags = pol.fixAutoFixableTags !== false;
    var hiddenLayerPolicy = pol.hiddenLayerPolicy || "tag_ignore";
    var deleteEmptyLayers = pol.deleteEmptyLayers !== false;
    var rasterizeComplexLayers = pol.rasterizeComplexLayers !== false;
    var mergeClipChains = pol.mergeClipChains !== false;
    var flattenAdjustments = pol.flattenAdjustments !== false;
    var bakeLayerEffects = pol.bakeLayerEffects !== false;
    var unsupportedBlendPolicy = pol.unsupportedBlendPolicy || "keep";
    var deleteMicroFragments = !!pol.deleteMicroFragments;
    var clipOutOfBounds = pol.clipOutOfBounds !== false;
    var trimCanvas = !!pol.trimCanvas;
    var canvasPadding = (typeof pol.canvasPadding === "number" && pol.canvasPadding >= 0) ? pol.canvasPadding : 4;

    var report = preflightReport || Validator.validateDocument(doc, pol);
    var issues = (report && P.isArray(report.issues)) ? report.issues : [];

    var hasBackup = hasBackupSnapshotGroup(doc);

    // 收集全树非 [ignore] 节点索引、剪贴链与候选图层
    var nonIgnoreNodesById = {};
    var clipChainList = [];
    var clipParticipatingIds = [];
    var clipChildIds = [];
    var allExportBounds = [];
    var microFragmentIds = [];
    var lockedNodeIds = [];
    var hiddenNodeIds = [];
    var rasterizeNodeIds = [];
    var adjustmentNodeIds = [];
    var fxNodeIds = [];

    function scanSiblings(nodes, inMergeGroup) {
      if (!P.isArray(nodes)) {
        return;
      }

      // 优先扫描当前层级中的剪贴链条（仅在非 [merge] 作用域）
      var visitedClipIndices = [];
      var i;
      if (!inMergeGroup) {
        for (i = 0; i < nodes.length; i++) {
          var nodeC = nodes[i];
          if (!nodeC || nodeC.grouped !== true || P.indexOf(visitedClipIndices, i) !== -1) {
            continue;
          }
          var parsedC = T.parseLayerName(nodeC.name, nodeC.type === "LayerSet");
          if (hasTagKey(parsedC.tags, "ignore")) {
            continue;
          }
          var chainRes = ClipResolver.findClipChain(nodes, i);
          if (chainRes.ok && chainRes.clipIndices.length > 0 && chainRes.baseNode) {
            var baseParsed = T.parseLayerName(chainRes.baseNode.name, chainRes.baseNode.type === "LayerSet");
            if (!hasTagKey(baseParsed.tags, "ignore")) {
              var cIds = [];
              var k;
              for (k = 0; k < chainRes.clipNodes.length; k++) {
                var cn = chainRes.clipNodes[k];
                var cParsed = T.parseLayerName(cn.name, cn.type === "LayerSet");
                if (!hasTagKey(cParsed.tags, "ignore")) {
                  cIds.push(cn.id);
                  pushUnique(clipParticipatingIds, cn.id);
                  pushUnique(clipChildIds, cn.id);
                }
                pushUnique(visitedClipIndices, chainRes.clipIndices[k]);
              }
              if (cIds.length > 0) {
                pushUnique(clipParticipatingIds, chainRes.baseNode.id);
                clipChainList.push({
                  baseId: chainRes.baseNode.id,
                  clipIds: cIds
                });
              }
            }
          }
        }
      }

      for (i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (!n) {
          continue;
        }
        var isGroup = n.type === "LayerSet";
        var parsed = T.parseLayerName(n.name, isGroup);

        // 绝对保护 [ignore] 节点与子树
        if (hasTagKey(parsed.tags, "ignore")) {
          continue;
        }

        nonIgnoreNodesById[String(n.id)] = n;

        if (n.isBackground && pol.ignoreBackground !== false) {
          continue;
        }

        if (n.allLocked === true) {
          pushUnique(lockedNodeIds, n.id);
        }

        if (n.visible === false && !pol.ignoreHiddenLayers) {
          pushUnique(hiddenNodeIds, n.id);
        }

        var isMergeRoot = isGroup && hasTagKey(parsed.tags, "merge");
        if (isGroup) {
          if (P.isArray(n.children) && n.children.length > 0) {
            scanSiblings(n.children, inMergeGroup || isMergeRoot);
          }
          if (!isMergeRoot) {
            continue;
          }
        }

        if (inMergeGroup) {
          continue;
        }

        var upperKind = n.kind ? String(n.kind).toUpperCase() : "NORMAL";
        if (!isGroup && P.indexOf(ADJUSTMENT_KINDS, upperKind) !== -1) {
          pushUnique(adjustmentNodeIds, n.id);
        } else if (!isGroup && (P.indexOf(UNRASTERIZED_KINDS, upperKind) !== -1 || n.hasVectorMask === true)) {
          pushUnique(rasterizeNodeIds, n.id);
        }

        if (!isGroup && n.hasLayerEffects === true) {
          pushUnique(fxNodeIds, n.id);
        }

        if (!isGroup && P.isArray(n.bounds) && n.bounds.length >= 4) {
          var w = n.bounds[2] - n.bounds[0];
          var h = n.bounds[3] - n.bounds[1];
          if (w > 0 && h > 0) {
            allExportBounds.push(n.bounds);
            if (w <= 4 && h <= 4 && !hasTagKey(parsed.tags, "overlay")) {
              pushUnique(microFragmentIds, n.id);
            }
          }
        }
      }
    }

    scanSiblings(doc.layers || [], false);

    // 汇总来自 preflightReport 的目标图层 ID
    var fixTagIds = [];
    var fixTagActions = [];
    var emptyIds = [];
    var unsupportedBlendIds = [];
    var outOfBoundsIds = [];
    var bgUnlockIds = [];

    var idx;
    for (idx = 0; idx < issues.length; idx++) {
      var iss = issues[idx];
      if (!iss) {
        continue;
      }
      if (iss.layerId !== null && iss.layerId !== undefined && !P.hasOwn(nonIgnoreNodesById, String(iss.layerId))) {
        continue;
      }
      if (iss.fixAction === "REPLACE_NOTRIM_TAG" ||
        iss.fixAction === "REMOVE_LEADING_SLASH" ||
        iss.fixAction === "REMOVE_MERGE_TAG" ||
        iss.fixAction === "SANITIZE_LAYER_NAME") {
        pushUnique(fixTagIds, iss.layerId);
        fixTagActions.push({
          layerId: iss.layerId,
          code: iss.code,
          fixAction: iss.fixAction
        });
      } else if (iss.fixAction === "DELETE_EMPTY_LAYERS") {
        // 不直接删除正在参与非空剪贴链的节点
        if (P.indexOf(clipParticipatingIds, iss.layerId) === -1) {
          pushUnique(emptyIds, iss.layerId);
        }
      } else if (iss.fixAction === "CONVERT_BLEND_MODE") {
        pushUnique(unsupportedBlendIds, iss.layerId);
      } else if (iss.fixAction === "CLIP_OUT_OF_BOUNDS") {
        pushUnique(outOfBoundsIds, iss.layerId);
      } else if (iss.fixAction === "UNLOCK_OR_IGNORE_BG") {
        pushUnique(bgUnlockIds, iss.layerId);
      } else if (iss.fixAction === "UNLOCK_LAYERS") {
        pushUnique(lockedNodeIds, iss.layerId);
      }
    }

    for (idx = 0; idx < bgUnlockIds.length; idx++) {
      pushUnique(lockedNodeIds, bgUnlockIds[idx]);
    }

    // 预判被删除的节点（避免对已删除层再执行后续操作）
    var scheduledDeleteIds = [];
    var hiddenAction = null;
    if (hiddenNodeIds.length > 0) {
      if (hiddenLayerPolicy === "delete") {
        hiddenAction = "DELETE_HIDDEN_LAYERS";
        for (idx = 0; idx < hiddenNodeIds.length; idx++) {
          pushUnique(scheduledDeleteIds, hiddenNodeIds[idx]);
        }
      } else if (hiddenLayerPolicy === "tag_ignore") {
        hiddenAction = "TAG_IGNORE_HIDDEN_LAYERS";
      }
    }

    var filteredEmptyIds = P.filter(emptyIds, function (id) {
      return P.indexOf(scheduledDeleteIds, id) === -1;
    });
    if (deleteEmptyLayers) {
      for (idx = 0; idx < filteredEmptyIds.length; idx++) {
        pushUnique(scheduledDeleteIds, filteredEmptyIds[idx]);
      }
    }

    var steps = [];

    // 步骤 2: 转 RGB
    if (convertToRgb8Bit && doc.mode && doc.mode !== "RGB") {
      steps.push({
        action: "CONVERT_TO_RGB",
        layerIds: [],
        params: { targetMode: "RGB" },
        description: "将文档颜色模式转换为 RGB"
      });
    }

    // 步骤 3: 转 8-bit
    if (convertToRgb8Bit && doc.bitsPerChannel !== undefined && doc.bitsPerChannel !== 8) {
      steps.push({
        action: "CONVERT_TO_8BIT",
        layerIds: [],
        params: { targetBitsPerChannel: 8 },
        description: "将文档位深度转换为 8-bit"
      });
    }

    // 步骤 4: 解锁非 [ignore] 锁定层
    if (unlockLayers && lockedNodeIds.length > 0) {
      steps.push({
        action: "UNLOCK_LAYERS",
        layerIds: lockedNodeIds,
        params: {},
        description: "解锁需要参与预处理的锁定图层或组"
      });
    }

    // 步骤 5: 自动修复可修复标签与命名问题
    if (fixAutoFixableTags && fixTagIds.length > 0) {
      steps.push({
        action: "FIX_TAG_SYNTAX",
        layerIds: fixTagIds,
        params: { fixes: fixTagActions },
        description: "修复 [notrim]、前导 '/'、冗余 [merge] 或非法命名字符"
      });
    }

    // 步骤 6: 处理非 [ignore] 隐藏图层
    if (hiddenAction !== null && hiddenNodeIds.length > 0) {
      steps.push({
        action: hiddenAction,
        layerIds: hiddenNodeIds,
        params: { policy: hiddenLayerPolicy },
        description: hiddenAction === "DELETE_HIDDEN_LAYERS"
          ? "删除非 [ignore] 隐藏废层"
          : "为非 [ignore] 隐藏图层注入 [ignore] 标签隔离导出"
      });
    }

    // 步骤 7: 清理空层与空组
    if (deleteEmptyLayers && filteredEmptyIds.length > 0) {
      steps.push({
        action: "DELETE_EMPTY_LAYERS",
        layerIds: filteredEmptyIds,
        params: {},
        description: "清理无有效像素的空图层与空组（含 [bone] 顶层空层）"
      });
    }

    // 步骤 8: 栅格化智能对象、文本、填充与矢量蒙版
    var liveRasterizeIds = P.filter(rasterizeNodeIds, function (id) {
      return P.indexOf(scheduledDeleteIds, id) === -1;
    });
    if (rasterizeComplexLayers && liveRasterizeIds.length > 0) {
      steps.push({
        action: "RASTERIZE_LAYERS",
        layerIds: liveRasterizeIds,
        params: { perLayerMode: true },
        description: "逐层安全栅格化智能对象、文本、填充与矢量蒙版"
      });
    }

    // 步骤 9: 合并悬空剪贴蒙版链条
    var liveClipChains = [];
    var liveClipIds = [];
    for (idx = 0; idx < clipChainList.length; idx++) {
      var ch = clipChainList[idx];
      if (P.indexOf(scheduledDeleteIds, ch.baseId) !== -1) {
        continue;
      }
      var keptClips = P.filter(ch.clipIds, function (cid) {
        return P.indexOf(scheduledDeleteIds, cid) === -1;
      });
      if (keptClips.length > 0) {
        liveClipChains.push({ baseId: ch.baseId, clipIds: keptClips });
        pushUnique(liveClipIds, ch.baseId);
        var ci;
        for (ci = 0; ci < keptClips.length; ci++) {
          pushUnique(liveClipIds, keptClips[ci]);
        }
      }
    }
    if (mergeClipChains && liveClipChains.length > 0) {
      steps.push({
        action: "MERGE_CLIP_CHAINS",
        layerIds: liveClipIds,
        params: { chains: liveClipChains },
        description: "将悬空剪贴蒙版链条合并至对应基底图层"
      });
    }

    // 步骤 10: 烘焙剩余悬空调整图层（排除已随剪贴链合并的层）
    var liveAdjIds = P.filter(adjustmentNodeIds, function (id) {
      if (P.indexOf(scheduledDeleteIds, id) !== -1) {
        return false;
      }
      if (mergeClipChains && P.indexOf(clipChildIds, id) !== -1) {
        return false;
      }
      return true;
    });
    if (flattenAdjustments && liveAdjIds.length > 0) {
      steps.push({
        action: "BAKE_ADJUSTMENT_LAYERS",
        layerIds: liveAdjIds,
        params: {},
        description: "向下烘焙组外悬空调整图层"
      });
    }

    // 步骤 11: 烘焙图层样式 (FX)
    var liveFxIds = P.filter(fxNodeIds, function (id) {
      return P.indexOf(scheduledDeleteIds, id) === -1;
    });
    if (bakeLayerEffects && liveFxIds.length > 0) {
      steps.push({
        action: "BAKE_LAYER_EFFECTS",
        layerIds: liveFxIds,
        params: { method: "newLayerBelow_merge" },
        description: "使用 newLayerBelow + merge 安全烘焙图层样式 (FX)"
      });
    }

    // 步骤 12: 混合模式转换（可选）
    var liveBlendIds = P.filter(unsupportedBlendIds, function (id) {
      return P.indexOf(scheduledDeleteIds, id) === -1;
    });
    if (unsupportedBlendPolicy === "convert_normal" && liveBlendIds.length > 0) {
      steps.push({
        action: "CONVERT_BLEND_MODES",
        layerIds: liveBlendIds,
        params: { targetBlendMode: "NORMAL" },
        description: "将不支持的混合模式转为 NORMAL"
      });
    }

    // 步骤 13: 清理 <=4x4 微小碎屑（仅显式开启时）
    var liveMicroIds = P.filter(microFragmentIds, function (id) {
      return P.indexOf(scheduledDeleteIds, id) === -1;
    });
    if (deleteMicroFragments && liveMicroIds.length > 0) {
      steps.push({
        action: "DELETE_MICRO_FRAGMENTS",
        layerIds: liveMicroIds,
        params: { maxSizePx: 4 },
        description: "清理已确认的 <=4x4px 微小碎屑图层"
      });
      for (idx = 0; idx < liveMicroIds.length; idx++) {
        pushUnique(scheduledDeleteIds, liveMicroIds[idx]);
      }
    }

    // 步骤 14: 越界像素按画布裁切
    var liveOobIds = P.filter(outOfBoundsIds, function (id) {
      return P.indexOf(scheduledDeleteIds, id) === -1;
    });
    if (clipOutOfBounds && liveOobIds.length > 0) {
      steps.push({
        action: "CLIP_OUT_OF_BOUNDS",
        layerIds: liveOobIds,
        params: {
          docWidth: doc.width,
          docHeight: doc.height
        },
        description: "裁切超出文档画布范围的冗余边缘像素"
      });
    }

    // 步骤 15: 画布安全收缩（在所有像素处理落定之后执行）
    if (trimCanvas && typeof doc.width === "number" && doc.width > 0 && typeof doc.height === "number" && doc.height > 0) {
      var canvasRes = AlignMath.calcSafeCanvasBounds(doc.width, doc.height, allExportBounds, canvasPadding);
      if (canvasRes.changed) {
        steps.push({
          action: "TRIM_CANVAS",
          layerIds: [],
          params: {
            targetBounds: canvasRes.bounds,
            padding: canvasPadding
          },
          description: "收缩画布四周冗余透明留白并保留安全边距"
        });
      }
    }

    // 步骤 1: 强制快照安全门控（有实质修复步骤且无备份时前置插入 CREATE_BACKUP_SNAPSHOT）
    var hasSubstantiveChanges = steps.length > 0;
    var requiresBackupSnapshot = hasSubstantiveChanges;

    if (hasSubstantiveChanges && !hasBackup && createBackupSnapshot) {
      steps.unshift({
        action: "CREATE_BACKUP_SNAPSHOT",
        layerIds: [],
        params: { groupName: "SRC_BACKUP [ignore]" },
        description: "在执行任何净身修改前创建只读原稿保护备份组 SRC_BACKUP [ignore]"
      });
    }

    return {
      requiresBackupSnapshot: requiresBackupSnapshot,
      steps: steps
    };
  }

  PSSplitter.Core.SanitizePlanner = {
    buildSanitizePlan: buildSanitizePlan
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = PSSplitter.Core.SanitizePlanner;
  }
})();
