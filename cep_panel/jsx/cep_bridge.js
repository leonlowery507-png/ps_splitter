/**
 * @fileoverview SpineSplitter CEP 窗口面板与 ExtendScript 宿主桥接层（纯 PS 拆图与补图工作台版）
 */

(function () {
  var rootScope = (typeof $ !== "undefined" && $.global)
    ? $.global
    : (typeof global !== "undefined" ? global : (function () { return this; }()));
  rootScope.PSSplitter = rootScope.PSSplitter || {};
  var PSSplitter = rootScope.PSSplitter;

  /**
   * 统计文档图层、已拆部件、是否已有原稿基准快照
   */
  function getDocOverview(doc, virtualDoc) {
    var Safety = PSSplitter.Host.Safety;
    var bakGroup = Safety.findTopLevelGroup(doc, Safety.BACKUP_GROUP_NAME);
    var hasBackup = !!(bakGroup && bakGroup.layers && bakGroup.layers.length > 0);
    var workArtLayers = 0;
    var groupCount = 0;

    function walk(nodes, inProtected) {
      if (!nodes) return;
      var i;
      for (i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        var isProt = inProtected ||
          String(n.name).toLowerCase() === Safety.BACKUP_GROUP_NAME.toLowerCase() ||
          String(n.name).toLowerCase() === Safety.REF_GROUP_NAME.toLowerCase();
        if (n.type === "LayerSet") {
          if (!isProt) groupCount++;
          if (n.children && n.children.length > 0) {
            walk(n.children, isProt);
          }
        } else if (!isProt && !n.isEmpty) {
          workArtLayers++;
        }
      }
    }

    if (virtualDoc && virtualDoc.layers) {
      walk(virtualDoc.layers, false);
    }
    return {
      hasBackup: hasBackup,
      workArtLayers: workArtLayers,
      groupCount: groupCount
    };
  }

  /**
   * 清理空像素图层与空图层组
   */
  function cleanEmptyLayersAndGroups(doc) {
    var Safety = PSSplitter.Host.Safety;
    var AM = PSSplitter.Host.AM;

    return Safety.runTransaction(doc, "SpineSplitter: 清理空图层与空组", function () {
      var removedLayers = 0;
      var removedGroups = 0;

      function cleanContainer(container) {
        var i;
        for (i = container.layers.length - 1; i >= 0; i--) {
          var lyr = container.layers[i];
          if (Safety.isInsideGroupByName(lyr, Safety.BACKUP_GROUP_NAME) ||
              Safety.isInsideGroupByName(lyr, Safety.REF_GROUP_NAME)) {
            continue;
          }
          if (Safety.isLayerSet(lyr)) {
            cleanContainer(lyr);
            if (lyr.layers.length === 0 && !lyr.allLocked) {
              try {
                lyr.remove();
                removedGroups++;
              } catch (eRmG) {}
            }
          } else if (!lyr.isBackgroundLayer && !lyr.allLocked && AM.isLayerEmpty(lyr)) {
            try {
              lyr.remove();
              removedLayers++;
            } catch (eRmL) {}
          }
        }
      }

      cleanContainer(doc);
      var total = removedLayers + removedGroups;
      return {
        ok: true,
        removedLayers: removedLayers,
        removedGroups: removedGroups,
        message: total > 0
          ? ("已清理 " + String(removedLayers) + " 个全透明空图层与 " + String(removedGroups) + " 个空组。")
          : "当前文档很干净，未发现空像素图层或空组。"
      };
    });
  }

  /**
   * 供 CEP 面板前端通过 evalScript 调用的统一分发入口
   */
  function dispatch(action, a1, a2, a3, a4, a5) {
    var P = PSSplitter.Core.Polyfill;
    var AM = PSSplitter.Host.AM;
    var Safety = PSSplitter.Host.Safety;
    var SplitOps = PSSplitter.Host.SplitJointOps;

    try {
      if (action === "getContext") {
        if (typeof app === "undefined" || !app.documents || app.documents.length === 0) {
          return P.jsonStringify({
            ok: true,
            hasDoc: false,
            docName: "未打开 PSD 文档",
            activeLayerName: "-",
            hasSelection: false,
            overview: { hasBackup: false, workArtLayers: 0, groupCount: 0 }
          });
        }
        var doc = app.activeDocument;
        var snap = Safety.captureVirtualDoc(doc);
        var overview = getDocOverview(doc, snap.virtualDoc);
        return P.jsonStringify({
          ok: true,
          hasDoc: true,
          docName: String(doc.name),
          activeLayerName: doc.activeLayer ? String(doc.activeLayer.name) : "-",
          hasSelection: AM.hasSelection(doc),
          overview: overview
        });
      }

      // 1. 原稿基准快照锁定与局部选区后悔药恢复
      if (action === "initWorkspace") {
        return P.jsonStringify(Safety.initWorkspace({ createSnapshot: true }));
      }

      if (action === "restoreFromBackup") {
        return P.jsonStringify(SplitOps.restoreSelectionFromBackup({
          targetGroupPath: "",
          baseName: a1 || "原稿找回"
        }));
      }

      // 2. 漏拆像素雷达检测 & 清除高亮雷达层
      if (action === "runUnsplitRadar") {
        var filterPx = parseInt(a1 || "1", 10);
        return P.jsonStringify(SplitOps.runUnsplitRadar({
          filterEdgePx: isNaN(filterPx) ? 1 : filterPx
        }));
      }

      if (action === "clearUnsplitRadar") {
        return P.jsonStringify(SplitOps.clearUnsplitRadar());
      }

      // 3. 拆+补一体动作：拆出部件并原位挖空留待补咬合选区
      if (action === "splitAndPreparePatch") {
        var ovPx = parseInt(a1 || "2", 10);
        return P.jsonStringify(SplitOps.splitAndPreparePatch({
          overlapPx: isNaN(ovPx) ? 2 : ovPx
        }));
      }

      // 4. 跨多层 / 剪贴蒙版链同选区联合拆出
      if (action === "splitMultiLayers") {
        return P.jsonStringify(SplitOps.splitMultiSelectedLayers(a1 || "merge"));
      }

      if (action === "splitClipChain") {
        return P.jsonStringify(SplitOps.splitClipChain(a1 || "preserve", {}));
      }

      // 5. 真正肉眼见效的轮廓内缩削毛边 & 周边固色 & 空层清理
      if (action === "shaveLayerEdge") {
        var sPx = parseInt(a1 || "1", 10);
        var fPx = parseFloat(a2 || "0.5");
        return P.jsonStringify(SplitOps.shaveLayerEdge({
          shavePx: isNaN(sPx) ? 1 : sPx,
          featherPx: isNaN(fPx) ? 0.5 : fPx
        }));
      }

      if (action === "alphaBleedEdge") {
        var bPx = parseInt(a1 || "2", 10);
        return P.jsonStringify(SplitOps.cleanEdgeMatte({
          mode: "alphaBleed",
          widthPx: isNaN(bPx) ? 2 : bPx,
          forceGlowLayer: true
        }));
      }

      if (action === "cleanEmptyLayers") {
        var docC = Safety.ensureActiveDocument();
        return P.jsonStringify(cleanEmptyLayersAndGroups(docC));
      }

      // 6. 遮挡挖空区无缝封口补底 & 一键新建手绘补画层
      if (action === "patchOcclusionHole") {
        var pOv = parseInt(a1 || "2", 10);
        var pMethod = a2 || "caf_solid";
        return P.jsonStringify(SplitOps.patchOcclusionHole({
          overlapPx: isNaN(pOv) ? 2 : pOv,
          method: pMethod
        }));
      }

      if (action === "createPatchLayer") {
        return P.jsonStringify(SplitOps.createClippedPatchLayer(a1 || "under"));
      }

      // 7. 5 方向定向关节断口像素延展 & 关节旋转参考圆环
      if (action === "extendJointDirectional") {
        var extPx = parseInt(a1 || "12", 10);
        var dir = a2 || "all";
        var alg = a3 || "bleed";
        return P.jsonStringify(SplitOps.extendJoint({
          expandPx: isNaN(extPx) ? 12 : extPx,
          direction: dir,
          mode: alg
        }));
      }

      if (action === "toggleJointArcGuide") {
        var rad = parseInt(a1 || "0", 10);
        return P.jsonStringify(SplitOps.toggleJointArcGuide({
          radiusPx: isNaN(rad) ? 0 : rad
        }));
      }

      return P.jsonStringify({
        ok: false,
        message: "未知的面板指令: " + String(action)
      });
    } catch (e) {
      return P.jsonStringify({
        ok: false,
        message: "执行异常: " + (e && e.message ? e.message : String(e))
      });
    }
  }

  rootScope.PSSplitter_CEP_Call = dispatch;
})();
