/**
 * @fileoverview Photoshop 图层视图与画布检视模块（PSSplitter.Host.ViewOps）
 * 聚焦多选批量显隐、多选独显/还原、全部工作层可见、检视底色（黑/灰/绿/关）、
 * 原稿前后对比切换、当前层高亮定位与一键折叠全部图层组。
 */

(function () {
  var rootScope = (typeof $ !== "undefined" && $.global)
    ? $.global
    : (typeof global !== "undefined" ? global : (function () { return this; }()));
  rootScope.PSSplitter = rootScope.PSSplitter || {};
  rootScope.PSSplitter.Host = rootScope.PSSplitter.Host || {};
  var PSSplitter = rootScope.PSSplitter;

  var INSPECT_BG_LAYER_NAME = "【视图检视底色_辅助】";
  var RADAR_LAYER_NAME = "【漏拆高亮雷达_检查完即删】";
  var ARC_GUIDE_LAYER_NAME = "【关节旋转参考环_辅助】";

  function getAM() {
    if (PSSplitter && PSSplitter.Host && PSSplitter.Host.AM) {
      return PSSplitter.Host.AM;
    }
    if (typeof require === "function") {
      return require("./ps_am.js");
    }
    throw new Error("PSSplitter.Host.AM 未加载");
  }

  function getSafety() {
    if (PSSplitter && PSSplitter.Host && PSSplitter.Host.Safety) {
      return PSSplitter.Host.Safety;
    }
    if (typeof require === "function") {
      return require("./ps_safety.js");
    }
    throw new Error("PSSplitter.Host.Safety 未加载");
  }

  function isProtectedOrAuxLayer(layer, Safety) {
    if (!layer) {
      return true;
    }
    if (Safety.isInsideGroupByName(layer, Safety.BACKUP_GROUP_NAME) ||
        Safety.isInsideGroupByName(layer, Safety.REF_GROUP_NAME)) {
      return true;
    }
    var n = String(layer.name || "");
    if (n === INSPECT_BG_LAYER_NAME || n === RADAR_LAYER_NAME || n === ARC_GUIDE_LAYER_NAME) {
      return true;
    }
    return false;
  }

  function collectAllNodes(container, Safety, outList) {
    if (!container || !container.layers) {
      return;
    }
    var i;
    for (i = 0; i < container.layers.length; i++) {
      var lyr = container.layers[i];
      if (Safety.isInsideGroupByName(lyr, Safety.BACKUP_GROUP_NAME) ||
          Safety.isInsideGroupByName(lyr, Safety.REF_GROUP_NAME)) {
        continue;
      }
      outList.push(lyr);
      if (Safety.isLayerSet(lyr)) {
        collectAllNodes(lyr, Safety, outList);
      }
    }
  }

  function showAncestors(doc, layer, Safety) {
    var cur = layer ? layer.parent : null;
    while (cur && cur !== doc) {
      if (Safety.isLayerSet(cur) &&
          String(cur.name) !== Safety.BACKUP_GROUP_NAME &&
          String(cur.name) !== Safety.REF_GROUP_NAME) {
        try {
          if (cur.visible === false) {
            cur.visible = true;
          }
        } catch (eVis) {}
      }
      cur = cur.parent;
    }
  }

  function setGroupDescendantsVisible(group, visible, Safety) {
    if (!group || !group.layers) {
      return;
    }
    var i;
    for (i = 0; i < group.layers.length; i++) {
      var child = group.layers[i];
      if (isProtectedOrAuxLayer(child, Safety)) {
        continue;
      }
      try {
        child.visible = !!visible;
      } catch (eChild) {}
      if (Safety.isLayerSet(child)) {
        setGroupDescendantsVisible(child, visible, Safety);
      }
    }
  }

  function getDocViewStore(doc) {
    var Safety = getSafety();
    var state = Safety.getSessionState();
    state.viewSnapshots = state.viewSnapshots || {};
    var key = String(doc.name || "__doc__");
    if (!state.viewSnapshots[key]) {
      state.viewSnapshots[key] = {
        isolate: null,
        compare: null
      };
    }
    return state.viewSnapshots[key];
  }

  /**
   * 1. 批量设置选中图层的可见性（设为可见时自动打开隐藏父组）
   * @param {boolean} visible 目标可见性
   */
  function setSelectedVisibility(visible) {
    var AM = getAM();
    var Safety = getSafety();
    var doc = Safety.ensureActiveDocument();
    var targetVis = !!visible;

    var snap = Safety.captureVirtualDoc(doc);
    var selIds = AM.getSelectedLayerIds(doc);
    if (selIds.length === 0 && doc.activeLayer) {
      selIds = [doc.activeLayer.id];
    }
    if (selIds.length === 0) {
      return { ok: false, message: "请先在图层面板选中至少一个图层或图层组。" };
    }

    var txTitle = targetVis ? "PS_Splitter: 选中图层一键可见" : "PS_Splitter: 选中图层一键隐藏";
    return Safety.runTransaction(doc, txTitle, function () {
      var changed = 0;
      var i;
      for (i = 0; i < selIds.length; i++) {
        var lyr = snap.idMap[String(selIds[i])];
        if (!lyr) {
          continue;
        }
        if (Safety.isInsideGroupByName(lyr, Safety.BACKUP_GROUP_NAME) ||
            Safety.isInsideGroupByName(lyr, Safety.REF_GROUP_NAME)) {
          continue;
        }
        try {
          lyr.visible = targetVis;
          if (targetVis) {
            showAncestors(doc, lyr, Safety);
          }
          changed++;
        } catch (eVis) {}
      }

      if (selIds.length > 1) {
        AM.selectLayersByIds(selIds);
      }

      if (changed === 0) {
        return { ok: false, message: "所选图层位于受保护原稿备份组内，未更改显隐。" };
      }

      return {
        ok: true,
        count: changed,
        message: targetVis
          ? ("已将选中的 " + String(changed) + " 个图层设为可见（并自动开启关联父组）。")
          : ("已隐藏选中的 " + String(changed) + " 个图层。")
      };
    });
  }

  /**
   * 2. 多选独显 / 一键还原视图（保护原稿备份组不被修改）
   */
  function toggleIsolateSelected() {
    var AM = getAM();
    var Safety = getSafety();
    var doc = Safety.ensureActiveDocument();
    var store = getDocViewStore(doc);

    return Safety.runTransaction(doc, "PS_Splitter: 切换多选独显视图", function () {
      var allNodes = [];
      collectAllNodes(doc, Safety, allNodes);
      var i;

      // 若已处于独显态，按快照一键还原
      if (store.isolate) {
        var saved = store.isolate;
        for (i = 0; i < allNodes.length; i++) {
          var node = allNodes[i];
          var idKey = String(node.id);
          if (typeof saved[idKey] === "boolean") {
            try {
              node.visible = saved[idKey];
            } catch (eRest) {}
          }
        }
        store.isolate = null;
        return {
          ok: true,
          active: false,
          message: "已还原独显前的全部图层显隐状态。"
        };
      }

      var snap = Safety.captureVirtualDoc(doc);
      var selIds = AM.getSelectedLayerIds(doc);
      if (selIds.length === 0 && doc.activeLayer) {
        selIds = [doc.activeLayer.id];
      }
      if (selIds.length === 0) {
        return { ok: false, active: false, message: "请先选中需要独显的 1 个或多个图层。" };
      }

      var prevMap = {};
      var keepVisibleMap = {};
      for (i = 0; i < allNodes.length; i++) {
        var n = allNodes[i];
        prevMap[String(n.id)] = n.visible !== false;
        if (String(n.name) === INSPECT_BG_LAYER_NAME && n.visible !== false) {
          keepVisibleMap[String(n.id)] = true;
        }
      }

      // 标记需要保持可见的目标节点、其祖先组及组内子节点
      for (i = 0; i < selIds.length; i++) {
        var target = snap.idMap[String(selIds[i])];
        if (!target || Safety.isInsideGroupByName(target, Safety.BACKUP_GROUP_NAME) ||
            Safety.isInsideGroupByName(target, Safety.REF_GROUP_NAME)) {
          continue;
        }
        keepVisibleMap[String(target.id)] = true;
        var p = target.parent;
        while (p && p !== doc) {
          if (Safety.isLayerSet(p)) {
            keepVisibleMap[String(p.id)] = true;
          }
          p = p.parent;
        }
        if (Safety.isLayerSet(target)) {
          var subNodes = [];
          collectAllNodes(target, Safety, subNodes);
          var s;
          for (s = 0; s < subNodes.length; s++) {
            keepVisibleMap[String(subNodes[s].id)] = true;
          }
        }
      }

      for (i = 0; i < allNodes.length; i++) {
        var item = allNodes[i];
        var shouldShow = keepVisibleMap[String(item.id)] === true;
        try {
          if ((item.visible !== false) !== shouldShow) {
            item.visible = shouldShow;
          }
        } catch (eIso) {}
      }

      if (selIds.length > 1) {
        AM.selectLayersByIds(selIds);
      }

      store.isolate = prevMap;
      return {
        ok: true,
        active: true,
        count: selIds.length,
        message: "已独显选中的 " + String(selIds.length) + " 个图层（再次点击即可还原原视图）。"
      };
    });
  }

  /**
   * 3. 全部工作层一键可见（严格跳过 SRC_BACKUP 与辅助高亮层）
   */
  function showAllWorkLayers() {
    var Safety = getSafety();
    var doc = Safety.ensureActiveDocument();
    var store = getDocViewStore(doc);

    return Safety.runTransaction(doc, "PS_Splitter: 全部工作层可见", function () {
      var allNodes = [];
      collectAllNodes(doc, Safety, allNodes);
      var count = 0;
      var i;
      for (i = 0; i < allNodes.length; i++) {
        var node = allNodes[i];
        if (isProtectedOrAuxLayer(node, Safety)) {
          continue;
        }
        try {
          if (node.visible === false) {
            node.visible = true;
            count++;
          }
        } catch (eVis) {}
      }

      // 若之前处于原稿对比，同步把备份组重新隐藏锁定
      if (store.compare) {
        var bak = Safety.findTopLevelGroup(doc, Safety.BACKUP_GROUP_NAME);
        if (bak) {
          try {
            bak.visible = false;
            bak.allLocked = true;
          } catch (eBak) {}
        }
        store.compare = null;
      }
      store.isolate = null;

      return {
        ok: true,
        count: count,
        isolateCleared: true,
        compareCleared: true,
        message: count > 0
          ? ("已开启全部 " + String(count) + " 个隐藏工作图层（已自动跳过原稿备份组）。")
          : "当前所有工作图层均为可见状态。"
      };
    });
  }

  /**
   * 4. 检视底色一键切换（"black" | "gray" | "green" | "off"）
   */
  function setInspectBackdrop(colorMode) {
    var AM = getAM();
    var Safety = getSafety();
    var doc = Safety.ensureActiveDocument();
    var mode = String(colorMode || "off").toLowerCase();

    var palette = {
      "black": { r: 17, g: 17, b: 19, label: "纯黑（查白边）" },
      "gray": { r: 128, g: 128, b: 128, label: "中灰（查明暗）" },
      "green": { r: 0, g: 240, b: 96, label: "荧光绿（查透明虚洞）" }
    };

    return Safety.runTransaction(doc, "PS_Splitter: 切换画布检视底色", function () {
      var prevActive = doc.activeLayer;
      var i;
      for (i = doc.layers.length - 1; i >= 0; i--) {
        if (String(doc.layers[i].name) === INSPECT_BG_LAYER_NAME) {
          try {
            doc.layers[i].allLocked = false;
            doc.layers[i].remove();
          } catch (eRm) {}
        }
      }

      if (mode === "off" || !palette[mode]) {
        if (prevActive && String(prevActive.name) !== INSPECT_BG_LAYER_NAME) {
          try { doc.activeLayer = prevActive; } catch (eRestLyr) {}
        }
        return {
          ok: true,
          mode: "off",
          message: "已关闭画布检视底色辅助层。"
        };
      }

      var cfg = palette[mode];
      var bgLayer = doc.artLayers.add();
      bgLayer.name = INSPECT_BG_LAYER_NAME;

      AM.deselect(doc);
      if (doc.selection && typeof doc.selection.selectAll === "function") {
        doc.selection.selectAll();
        try {
          var c2t = AM.c2t;
          var desc = new ActionDescriptor();
          desc.putEnumerated(c2t("Usng"), c2t("FlCn"), c2t("Clr "));
          var clrDesc = new ActionDescriptor();
          clrDesc.putDouble(c2t("Rd  "), cfg.r);
          clrDesc.putDouble(c2t("Grn "), cfg.g);
          clrDesc.putDouble(c2t("Bl  "), cfg.b);
          desc.putObject(c2t("Clr "), c2t("RGBC"), clrDesc);
          desc.putUnitDouble(c2t("Opct"), c2t("#Prc"), 100.0);
          desc.putEnumerated(c2t("Md  "), c2t("BlnM"), c2t("Nrml"));
          executeAction(c2t("Fl  "), desc, DialogModes.NO);
        } catch (eFill) {}
        AM.deselect(doc);
      }

      // 放置在 SRC_BACKUP 正上方，若无备份组则放在文档最底端
      var bakGroup = Safety.findTopLevelGroup(doc, Safety.BACKUP_GROUP_NAME);
      if (typeof ElementPlacement !== "undefined") {
        if (bakGroup) {
          bgLayer.move(bakGroup, ElementPlacement.PLACEBEFORE);
        } else if (doc.layers.length > 1) {
          var bottomNode = doc.layers[doc.layers.length - 1];
          if (bottomNode && bottomNode !== bgLayer && !bottomNode.isBackgroundLayer) {
            bgLayer.move(bottomNode, ElementPlacement.PLACEAFTER);
          }
        }
      }

      try {
        doc.activeLayer = bgLayer;
        AM.setLayerColorLabel("Gry ");
        bgLayer.allLocked = true;
      } catch (eLock) {}

      if (prevActive && String(prevActive.name) !== INSPECT_BG_LAYER_NAME) {
        try { doc.activeLayer = prevActive; } catch (eBackAct) {}
      }

      return {
        ok: true,
        mode: mode,
        message: "已切换为【" + cfg.label + "】检视底色，透明边与虚洞一目了然。"
      };
    });
  }

  /**
   * 5. 原稿前后对比一键切换（切至 SRC_BACKUP / 切回当前拆补状态）
   */
  function toggleBackupCompare() {
    var Safety = getSafety();
    var doc = Safety.ensureActiveDocument();
    var bakGroup = Safety.findTopLevelGroup(doc, Safety.BACKUP_GROUP_NAME);

    if (!bakGroup || !bakGroup.layers || bakGroup.layers.length === 0) {
      return {
        ok: false,
        active: false,
        message: "尚未建立原稿备份：请先点击顶部「备份原稿」，即可随时一键前后对比。"
      };
    }

    var store = getDocViewStore(doc);
    return Safety.runTransaction(doc, "PS_Splitter: 原稿前后对比切换", function () {
      var allNodes = [];
      collectAllNodes(doc, Safety, allNodes);
      var i;

      // 当前正处于原稿对比态 -> 切回工作状态
      if (store.compare) {
        var saved = store.compare;
        for (i = 0; i < allNodes.length; i++) {
          var node = allNodes[i];
          var idKey = String(node.id);
          if (typeof saved[idKey] === "boolean") {
            try { node.visible = saved[idKey]; } catch (eRest) {}
          }
        }
        try {
          bakGroup.visible = false;
          bakGroup.allLocked = true;
        } catch (eBakHide) {}
        store.compare = null;
        return {
          ok: true,
          active: false,
          message: "已切回当前拆补视图。"
        };
      }

      // 切到原稿态：快照所有工作层并隐藏，只亮出原稿备份组
      var prevMap = {};
      for (i = 0; i < allNodes.length; i++) {
        var item = allNodes[i];
        prevMap[String(item.id)] = item.visible !== false;
        try {
          if (item.visible !== false) {
            item.visible = false;
          }
        } catch (eHide) {}
      }

      try {
        bakGroup.allLocked = false;
        bakGroup.visible = true;
        for (i = 0; i < bakGroup.layers.length; i++) {
          bakGroup.layers[i].visible = true;
        }
        bakGroup.allLocked = true;
      } catch (eShowBak) {}

      store.compare = prevMap;
      return {
        ok: true,
        active: true,
        message: "正在对比【原稿基准快照】（再次点击切回当前拆补图层）。"
      };
    });
  }

  /**
   * 6. 高亮定位当前图层（载入像素轮廓或边框选区，并汇报像素尺寸与位置）
   */
  function locateActiveLayer() {
    var AM = getAM();
    var Safety = getSafety();
    var doc = Safety.ensureActiveDocument();
    var activeLayer = doc.activeLayer;

    if (!activeLayer) {
      return { ok: false, message: "当前没有选中的图层或组。" };
    }

    var bounds = AM.getLayerBoundsPx(activeLayer);
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
      return { ok: false, message: "图层「" + String(activeLayer.name) + "」暂无有效可见像素，无法定位。" };
    }

    return Safety.runTransaction(doc, "PS_Splitter: 高亮定位当前图层", function () {
      try {
        if (activeLayer.visible === false) {
          activeLayer.visible = true;
        }
        showAncestors(doc, activeLayer, Safety);
      } catch (eVis) {}

      var loaded = false;
      if (!Safety.isLayerSet(activeLayer)) {
        try {
          AM.loadLayerTransparencyAsSelection();
          loaded = AM.hasSelection(doc);
        } catch (eLoad) {
          loaded = false;
        }
      }

      if (!loaded && doc.selection && typeof doc.selection.select === "function") {
        var region = [
          [bounds.left, bounds.top],
          [bounds.right, bounds.top],
          [bounds.right, bounds.bottom],
          [bounds.left, bounds.bottom]
        ];
        try {
          doc.selection.select(region);
        } catch (eRect) {}
      }

      return {
        ok: true,
        message: "已框选高亮「" + String(activeLayer.name) + "」（尺寸 " +
          String(Math.round(bounds.width)) + "×" + String(Math.round(bounds.height)) +
          " px，坐标 X:" + String(Math.round(bounds.left)) + " Y:" + String(Math.round(bounds.top)) + "）。"
      };
    });
  }

  /**
   * 7. 一键折叠全部图层组
   */
  function collapseAllGroups() {
    var AM = getAM();
    var Safety = getSafety();
    Safety.ensureActiveDocument();

    try {
      executeAction(AM.s2t("collapseAllGroupsEvent"), new ActionDescriptor(), DialogModes.NO);
      return {
        ok: true,
        message: "已一键折叠图层面板中的所有图层组。"
      };
    } catch (e) {
      return {
        ok: false,
        message: "折叠图层组未能执行（可能当前文档无图层组或被模态状态阻止）。"
      };
    }
  }

  PSSplitter.Host.ViewOps = {
    INSPECT_BG_LAYER_NAME: INSPECT_BG_LAYER_NAME,
    setSelectedVisibility: setSelectedVisibility,
    toggleIsolateSelected: toggleIsolateSelected,
    showAllWorkLayers: showAllWorkLayers,
    setInspectBackdrop: setInspectBackdrop,
    toggleBackupCompare: toggleBackupCompare,
    locateActiveLayer: locateActiveLayer,
    collapseAllGroups: collapseAllGroups
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = PSSplitter.Host.ViewOps;
  }
})();
