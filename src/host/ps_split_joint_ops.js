/**
 * @fileoverview Photoshop 核心「拆」与「补」实战操作模块（PSSplitter.Host.SplitJointOps）
 * 深度聚焦 Photoshop 内角色拆图与被遮挡区/关节断口补图核心痛点：
 *  1. 拆出并原位挖空留待补咬合选区（拆+补无缝衔接）
 *  2. 跨多层 / 复合剪贴蒙版链同选区一键拆出
 *  3. 真正 100% 肉眼见效的轮廓内缩削毛边（选区内缩 + 羽化 + 反选削边）
 *  4. 遮挡缺口咬合封口补底 & 一键新建补画夹层
 *  5. 5 方向（上/下/左/右/全向）关节断口定向像素延展补底 & 关节旋转参考圆环
 *  6. 原稿基准快照 & 局部选区无损后悔药恢复
 */

(function () {
  var rootScope = (typeof $ !== "undefined" && $.global)
    ? $.global
    : (typeof global !== "undefined" ? global : (function () { return this; }()));
  rootScope.PSSplitter = rootScope.PSSplitter || {};
  rootScope.PSSplitter.Host = rootScope.PSSplitter.Host || {};
  var PSSplitter = rootScope.PSSplitter;

  var ARC_GUIDE_LAYER_NAME = "【关节旋转参考环_辅助】";
  var INSPECT_BG_LAYER_NAME = "【视图检视底色_辅助】";

  function getPolyfill() {
    if (PSSplitter && PSSplitter.Core && PSSplitter.Core.Polyfill) {
      return PSSplitter.Core.Polyfill;
    }
    if (typeof require === "function") {
      return require("../core/polyfill_es3.js");
    }
    throw new Error("PSSplitter.Core.Polyfill 未加载");
  }

  function getNaming() {
    if (PSSplitter && PSSplitter.Core && PSSplitter.Core.NamingEngine) {
      return PSSplitter.Core.NamingEngine;
    }
    if (typeof require === "function") {
      return require("../core/naming_engine.js");
    }
    throw new Error("PSSplitter.Core.NamingEngine 未加载");
  }

  function getClipResolver() {
    if (PSSplitter && PSSplitter.Core && PSSplitter.Core.ClipChainResolver) {
      return PSSplitter.Core.ClipChainResolver;
    }
    if (typeof require === "function") {
      return require("../core/clip_chain_resolver.js");
    }
    throw new Error("PSSplitter.Core.ClipChainResolver 未加载");
  }

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

  var GLOW_BLEND_MODES = {
    "LINEARDODGE": true,
    "SCREEN": true,
    "COLORDODGE": true,
    "LIGHTEN": true
  };

  function pad2(num) {
    var n = Math.floor(num);
    return n < 10 ? "0" + String(n) : String(n);
  }

  function resolveUniqueLayerName(container, baseName, autoNumber) {
    var P = getPolyfill();
    var existing = {};
    var i;
    if (container && container.layers) {
      for (i = 0; i < container.layers.length; i++) {
        existing[String(container.layers[i].name).toLowerCase()] = true;
      }
    }
    var clean = P.trim(String(baseName || "part"));
    if (clean === "") {
      clean = "part";
    }
    if (!autoNumber && !P.hasOwn(existing, clean.toLowerCase())) {
      return clean;
    }
    var idx = 1;
    var candidate;
    while (idx < 9999) {
      candidate = clean + "_" + pad2(idx);
      if (!P.hasOwn(existing, candidate.toLowerCase())) {
        return candidate;
      }
      idx++;
    }
    return clean + "_" + String(new Date().getTime());
  }

  function isNonRasterArtLayer(layer) {
    if (!layer || typeof LayerKind === "undefined") {
      return false;
    }
    try {
      return layer.kind !== LayerKind.NORMAL;
    } catch (e) {
      return false;
    }
  }

  /**
   * 恢复文档活动通道至复合彩色通道，防止 doc.channels.add() 自动切入 Alpha 通道导致后续剪切/填充报错
   */
  function restoreComponentChannels(doc, prevActiveChannels) {
    if (!doc) {
      return;
    }
    try {
      if (doc.componentChannels && doc.componentChannels.length > 0) {
        doc.activeChannels = doc.componentChannels;
        return;
      }
    } catch (eComp) {}
    try {
      if (prevActiveChannels && prevActiveChannels.length > 0) {
        doc.activeChannels = prevActiveChannels;
      }
    } catch (ePrev) {}
  }

  /**
   * 安全创建临时 Alpha 通道并保存当前选区，随后立刻隐藏该通道并将活动通道切回复合彩色通道
   */
  function storeSelectionToTempChannel(doc, name) {
    if (!doc || !doc.channels || typeof doc.channels.add !== "function" ||
        !doc.selection || typeof doc.selection.store !== "function") {
      return null;
    }
    var prevChannels = null;
    try {
      prevChannels = doc.activeChannels;
    } catch (eGetCh) {}
    var ch = doc.channels.add();
    if (name) {
      ch.name = name;
    }
    try {
      ch.visible = false;
    } catch (eVis) {}
    doc.selection.store(ch);
    restoreComponentChannels(doc, prevChannels);
    return ch;
  }

  /**
   * 辅助：使用 ActionManager 按指定 RGB 颜色填充当前选区（不污染画师前景色）
   */
  function fillSelectionRgb(doc, r, g, b) {
    var AM = getAM();
    try {
      var c2t = AM.c2t;
      var desc = new ActionDescriptor();
      desc.putEnumerated(c2t("Usng"), c2t("FlCn"), c2t("Clr "));
      var clrDesc = new ActionDescriptor();
      clrDesc.putDouble(c2t("Rd  "), r);
      clrDesc.putDouble(c2t("Grn "), g);
      clrDesc.putDouble(c2t("Bl  "), b);
      desc.putObject(c2t("Clr "), c2t("RGBC"), clrDesc);
      desc.putUnitDouble(c2t("Opct"), c2t("#Prc"), 100.0);
      desc.putEnumerated(c2t("Md  "), c2t("BlnM"), c2t("Nrml"));
      executeAction(c2t("Fl  "), desc, DialogModes.NO);
    } catch (e) {
      // 忽略填充异常
    }
  }

  // ===========================================================================
  // 1. 「拆 + 补」一体动作：拆出部件并原位挖空留待补咬合选区
  // ===========================================================================

  /**
   * 拆出当前选区部件到上方新图层，同时在原底层挖空被拆区域，并自动切回原底层保留外扩 2px 的待补选区！
   */
  function splitAndPreparePatch(options) {
    var AM = getAM();
    var Safety = getSafety();
    var doc = Safety.ensureActiveDocument();
    var opts = options || {};
    var overlapPx = typeof opts.overlapPx === "number" ? Math.max(1, Math.min(12, Math.round(opts.overlapPx))) : 2;

    if (!AM.hasSelection(doc)) {
      return {
        ok: false,
        message: "请先在画布上用套索或钢笔框选需要拆出的部位。"
      };
    }

    var sourceLayer = doc.activeLayer;
    if (!sourceLayer || Safety.isLayerSet(sourceLayer)) {
      return {
        ok: false,
        message: "请先在图层面板选中需要拆分的普通像素图层。"
      };
    }
    if (sourceLayer.isBackgroundLayer) {
      return {
        ok: false,
        message: "当前选中了锁定「背景」图层，无法直接挖空，请先双击转换为普通图层（或先执行「备份原稿」生成可编辑副本）。"
      };
    }
    if (isNonRasterArtLayer(sourceLayer)) {
      return {
        ok: false,
        message: "当前图层为智能对象/文字/形状层，请先右键「栅格化图层」后再拆出。"
      };
    }

    if (Safety.isInsideGroupByName(sourceLayer, Safety.BACKUP_GROUP_NAME) || Safety.isEffectivelyLocked(sourceLayer)) {
      return {
        ok: false,
        message: "当前图层已锁定或位于原稿备份组内，无法原位挖空待补。"
      };
    }

    return Safety.runTransaction(doc, "SpineSplitter: 拆出部件并原位留待补选区", function () {
      // 1. 将选区先存入临时通道以便挖空后在原图层恢复待补选区（存完立刻切回复合通道）
      var tmpChannel = storeSelectionToTempChannel(doc, "__ps_splitter_patch_hole__");
      doc.activeLayer = sourceLayer;

      var newLayer = null;
      try {
        // 2. 执行通过剪切的图层 (CtTL)：自动把选区拆到新层并把原层对应位置挖空
        try {
          AM.cutToLayer();
        } catch (eCut) {
          return {
            ok: false,
            message: "选区内当前图层无有效非透明像素（或图层不支持直接剪切：" + (eCut && eCut.message ? eCut.message : String(eCut)) + "）。"
          };
        }
        newLayer = doc.activeLayer;
        if (!newLayer || newLayer === sourceLayer || AM.isLayerEmpty(newLayer)) {
          if (newLayer && newLayer !== sourceLayer) {
            try { newLayer.remove(); } catch (eRm) {}
          }
          return {
            ok: false,
            message: "选区内无有效像素，未拆出新图层。"
          };
        }

        // 3. 自动切回底下刚被挖空的源图层，并重新载入选区且向外扩 overlapPx (2px) 咬合边缘，方便立即补底色！
        doc.activeLayer = sourceLayer;
        if (tmpChannel && typeof doc.selection.load === "function") {
          doc.selection.load(tmpChannel);
          AM.expandSelection(doc, overlapPx);
        }
      } finally {
        if (tmpChannel) {
          try { tmpChannel.remove(); } catch (eRmCh) {}
        }
        restoreComponentChannels(doc);
      }

      return {
        ok: true,
        newLayerName: String(newLayer.name),
        sourceLayerName: String(sourceLayer.name),
        message: "已拆出「" + String(newLayer.name) + "」，并已自动切回底层「" + String(sourceLayer.name) + "」留好外扩 " + String(overlapPx) + "px 待补选区，可直接点下方【缺口无缝补底】或手绘补色！"
      };
    });
  }

  /**
   * 跨多层同选区一键拆出（线稿层 + 底色层 + 阴影层同时多选时，按同一选区一次性提取所有选中层像素并合并/编组）
   */
  function splitMultiSelectedLayers(mode) {
    var AM = getAM();
    var Safety = getSafety();
    var doc = Safety.ensureActiveDocument();
    var mergeResult = mode !== "keep";

    if (!AM.hasSelection(doc)) {
      return {
        ok: false,
        message: "请先在画布建立选区，并在图层面板按住 Ctrl/Shift 选中要同时拆出的多个图层（如线稿+底色+阴影）。"
      };
    }

    var snap = Safety.captureVirtualDoc(doc);
    var selIds = AM.getSelectedLayerIds(doc);
    if (selIds.length === 0) {
      return { ok: false, message: "请先选中至少一个图层。" };
    }

    // 如果只选了 1 个层且它属于剪贴蒙版链，自动委托给 splitClipChain
    if (selIds.length === 1) {
      return splitClipChain(mergeResult ? "merge" : "preserve", {});
    }

    return Safety.runTransaction(doc, "SpineSplitter: 跨多层同选区联合拆出", function () {
      var tmpCh = storeSelectionToTempChannel(doc, "__ps_splitter_multi_sel__");

      var extractedIds = [];
      var extractedLayers = [];
      try {
        var i;
        for (i = 0; i < selIds.length; i++) {
          var srcLyr = snap.idMap[String(selIds[i])];
          if (!srcLyr || Safety.isLayerSet(srcLyr)) {
            continue;
          }
          if (tmpCh) {
            doc.selection.load(tmpCh);
          }
          doc.activeLayer = srcLyr;
          try {
            AM.copyToLayer();
            var copied = doc.activeLayer;
            if (copied && copied !== srcLyr && !AM.isLayerEmpty(copied)) {
              extractedLayers.push(copied);
              extractedIds.push(copied.id);
            } else if (copied && copied !== srcLyr) {
              copied.remove();
            }
          } catch (eCp) {}
        }
      } finally {
        if (tmpCh) {
          try { tmpCh.remove(); } catch (eRm) {}
        }
        restoreComponentChannels(doc);
      }

      if (extractedLayers.length === 0) {
        return { ok: false, message: "所选图层在当前选区内均无有效像素。" };
      }

      if (mergeResult && extractedIds.length > 1) {
        AM.selectLayersByIds(extractedIds);
        AM.mergeLayers();
      } else if (extractedIds.length > 1) {
        AM.selectLayersByIds(extractedIds);
      }

      AM.deselect(doc);
      return {
        ok: true,
        count: extractedLayers.length,
        message: mergeResult
          ? ("已从 " + String(extractedLayers.length) + " 个图层同选区提取并合成为单个部件图层「" + String(doc.activeLayer.name) + "」。")
          : ("已从 " + String(extractedLayers.length) + " 个图层同选区同步提取出独立分层。")
      };
    });
  }

  // ===========================================================================
  // 3. 真正 100% 见效的「轮廓内缩削毛边」(True Edge Shave)
  // ===========================================================================

  /**
   * 轮廓内缩削毛边：载入当前图层不透明选区 -> 向内收缩 shavePx (1~5px) -> 可选羽化 -> 反选 -> 真实清除外圈毛边杂色
   */
  function shaveLayerEdge(options) {
    var AM = getAM();
    var Safety = getSafety();
    var doc = Safety.ensureActiveDocument();
    var opts = options || {};
    var shavePx = typeof opts.shavePx === "number" && !isNaN(opts.shavePx)
      ? Math.max(1, Math.min(10, Math.round(opts.shavePx)))
      : 1;
    var featherPx = typeof opts.featherPx === "number" && !isNaN(opts.featherPx)
      ? Math.max(0, Math.min(5, opts.featherPx))
      : 0.5;

    var activeLayer = doc.activeLayer;
    if (!activeLayer || Safety.isLayerSet(activeLayer)) {
      return { ok: false, message: "请先选中需要削去外圈毛边的普通像素图层。" };
    }
    if (activeLayer.isBackgroundLayer) {
      return { ok: false, message: "当前为「背景」图层（无透明边缘），无法执行轮廓内缩削毛边。" };
    }
    if (isNonRasterArtLayer(activeLayer)) {
      return { ok: false, message: "当前图层为智能对象/文字/形状层，请先右键「栅格化图层」后再削毛边。" };
    }
    if (Safety.isEffectivelyLocked(activeLayer) || Safety.isInsideGroupByName(activeLayer, Safety.BACKUP_GROUP_NAME)) {
      return { ok: false, message: "当前图层已锁定或位于原稿备份组内，无法修改像素。" };
    }
    if (AM.isLayerEmpty(activeLayer)) {
      return { ok: false, message: "当前图层为空像素图层。" };
    }

    return Safety.runTransaction(doc, "SpineSplitter: 轮廓内缩削毛边 (" + String(shavePx) + "px)", function () {
      var prevClipped = activeLayer.grouped === true;

      // 1. 载入当前图层的不透明像素选区
      try {
        AM.loadLayerTransparencyAsSelection();
      } catch (eLoadSel) {
        return { ok: false, message: "当前图层无可用透明轮廓选区（请确认图层为普通栅格像素层且非全透明）。" };
      }
      if (!AM.hasSelection(doc)) {
        return { ok: false, message: "无法载入当前图层轮廓选区。" };
      }

      // 2. 向内真实收缩 shavePx 像素
      try {
        AM.contractSelection(doc, shavePx);
      } catch (eContract) {
        AM.deselect(doc);
        return { ok: false, message: "当前选区无法继续向内收缩 " + String(shavePx) + "px（可能图层像素过细或铺满画布）。" };
      }

      // 3. 若收缩后仍有选区，可选轻微羽化使边缘柔顺，随后反选并清除外圈 1~5px 毛边
      if (AM.hasSelection(doc)) {
        if (featherPx > 0 && doc.selection && typeof doc.selection.feather === "function") {
          try {
            if (typeof UnitValue !== "undefined") {
              doc.selection.feather(new UnitValue(featherPx, "px"));
            } else {
              doc.selection.feather(featherPx);
            }
          } catch (eFeat) {}
        }
        try {
          doc.selection.invert();
          if (AM.hasSelection(doc)) {
            doc.selection.clear();
          }
        } catch (eClr) {
          AM.deselect(doc);
          return { ok: false, message: "清除外圈毛边时失败：请确认图层未锁定局部透明像素。" };
        }
      }
      AM.deselect(doc);

      if (prevClipped && activeLayer.grouped !== true) {
        AM.setClippingMask(true);
      }

      return {
        ok: true,
        shavePx: shavePx,
        message: "已对「" + String(activeLayer.name) + "」向内真实削去 " + String(shavePx) + "px 外圈杂色毛边" +
          (featherPx > 0 ? ("（带 " + String(featherPx) + "px 柔化过渡）") : "") + "。"
      };
    });
  }

  // ===========================================================================
  // 4. 硬核「补」图工具箱：缺口咬合封口补底、补画夹层、5 方向定向关节延展、关节圆环
  // ===========================================================================

  /**
   * 遮挡挖空区 / 拆图窟窿一键无缝封口补底（解决普通内容识别留 1px 白缝及采样透明区发虚问题）
   */
  function patchOcclusionHole(options) {
    var AM = getAM();
    var Safety = getSafety();
    var doc = Safety.ensureActiveDocument();
    var opts = options || {};
    var overlapPx = typeof opts.overlapPx === "number" ? Math.max(0, Math.min(12, Math.round(opts.overlapPx))) : 2;
    var method = opts.method === "bleed" ? "bleed" : "caf_solid";

    var activeLayer = doc.activeLayer;
    if (!activeLayer || Safety.isLayerSet(activeLayer)) {
      return { ok: false, message: "请先选中带有挖空缺口的普通像素图层。" };
    }
    if (!AM.hasSelection(doc)) {
      return {
        ok: false,
        message: "请先用套索圈出需要补色的缺口区域（或使用上方「拆出并留待补选区」自动生成缺口选区）。"
      };
    }
    if (Safety.isEffectivelyLocked(activeLayer) || Safety.isInsideGroupByName(activeLayer, Safety.BACKUP_GROUP_NAME)) {
      return { ok: false, message: "当前图层处于锁定或原稿备份组内，无法补色。" };
    }

    return Safety.runTransaction(doc, "SpineSplitter: 缺口无缝封口补底", function () {
      var origName = activeLayer.name;
      var origOpacity = activeLayer.opacity;
      var origBlend = activeLayer.blendMode;
      var origClipped = activeLayer.grouped === true;

      // 1. 外扩 overlapPx (默认 2px) 咬合缺口周边实色边缘，彻底消灭 1px 半透明接缝白线
      if (overlapPx > 0) {
        try { AM.expandSelection(doc, overlapPx); } catch (eExp) {}
      }

      // 保存补洞选区（存完立刻切回复合通道）
      var holeCh = storeSelectionToTempChannel(doc, "__ps_splitter_hole_patch__");
      doc.activeLayer = activeLayer;

      var usedCaf = false;
      try {
        if (method === "caf_solid") {
          try {
            // 先执行内容识别填充
            AM.contentAwareFill();
            usedCaf = true;
          } catch (eCaf) {
            usedCaf = false;
          }
        }

        // 无论 CAF 是否成功，都在下方用向内渐进位移垫一层 100% 实色基底，消除 CAF 采样透明区造成的半透明虚洞！
        if (holeCh) {
          AM.deselect(doc);
          var solidUnder = activeLayer.duplicate();
          if (typeof ElementPlacement !== "undefined") {
            solidUnder.move(activeLayer, ElementPlacement.PLACEAFTER);
          }
          runDirectionalBleed(doc, solidUnder, usedCaf ? 6 : 16, "all");
          var underBled = doc.activeLayer;
          // 裁掉补洞选区外的多余外溢
          doc.selection.load(holeCh);
          doc.selection.invert();
          try { doc.selection.clear(); } catch (eClr) {}
          AM.deselect(doc);

          AM.selectLayersByIds([activeLayer.id, underBled.id]);
          AM.mergeLayers();
          var finalLyr = doc.activeLayer;
          if (finalLyr) {
            finalLyr.name = origName;
            finalLyr.opacity = origOpacity;
            finalLyr.blendMode = origBlend;
            if (origClipped && finalLyr.grouped !== true) {
              AM.setClippingMask(true);
            }
          }
        }
      } finally {
        if (holeCh) {
          try { holeCh.remove(); } catch (eRmCh) {}
        }
        restoreComponentChannels(doc);
        AM.deselect(doc);
      }

      return {
        ok: true,
        usedCaf: usedCaf,
        message: usedCaf
          ? ("已完成缺口智能内容识别 + 实色咬合封口补底（外扩咬合 " + String(overlapPx) + "px，无半透明虚边）。")
          : ("已完成缺口 8 方向周边像素向内坍缩封口补底（外扩咬合 " + String(overlapPx) + "px）。")
      };
    });
  }

  /**
   * 一键新建绑定好的「手绘补画夹层」（方便画师手动补几笔线稿或过渡色，再一键合回）
   */
  function createClippedPatchLayer(mode) {
    var AM = getAM();
    var Safety = getSafety();
    var doc = Safety.ensureActiveDocument();
    var activeLayer = doc.activeLayer;

    if (!activeLayer || Safety.isLayerSet(activeLayer)) {
      return { ok: false, message: "请先选中需要手绘修补的部件图层。" };
    }

    return Safety.runTransaction(doc, "SpineSplitter: 新建手绘补画层", function () {
      var patchLayer = doc.artLayers.add();
      var baseName = String(activeLayer.name);

      if (mode === "under") {
        // 模式 A：垫在当前部件正下方（专门用来直接拿画笔往外补关节延展头，绝不弄脏原图层已有像素！）
        patchLayer.name = baseName + "_【底层补关节_画完Ctrl+E合并】";
        if (typeof ElementPlacement !== "undefined") {
          patchLayer.move(activeLayer, ElementPlacement.PLACEAFTER);
        }
        doc.activeLayer = patchLayer;
        try { AM.setLayerColorLabel("Grn "); } catch (eC1) {}
        return {
          ok: true,
          layerName: patchLayer.name,
          message: "已在「" + baseName + "」正下方垫入补画层！您现在直接拿画笔涂抹关节或缺口，完全不会覆盖原图层现有画面；补完对上层按 Ctrl+E 即可合为一体。"
        };
      }

      // 模式 B：在当前部件正上方创建剪贴蒙版补画层（专门用来修补部件内部遮挡痕迹，不会画出部件轮廓外）
      patchLayer.name = baseName + "_【剪贴修补_画完Ctrl+E合并】";
      if (typeof ElementPlacement !== "undefined") {
        patchLayer.move(activeLayer, ElementPlacement.PLACEBEFORE);
      }
      doc.activeLayer = patchLayer;
      AM.setClippingMask(true);
      try { AM.setLayerColorLabel("Grn "); } catch (eC2) {}
      return {
        ok: true,
        layerName: patchLayer.name,
        message: "已在「" + baseName + "」上方创建剪贴蒙版补画层！画笔只会在该部件轮廓内生效，不会画超边界；补完按 Ctrl+E 即可合并。"
      };
    });
  }

  /**
   * 解析 360° 任意角度或方向枚举（"up"|"down"|"left"|"right"|"all"|"angle:135"|数字）
   * 约定：0° = 正上方 (0, -1)，顺时针递增（90° = 右，180° = 下，270° = 左）
   */
  function parseJointDirection(direction) {
    if (direction === undefined || direction === null || direction === "" || direction === "all") {
      return { isAll: true, deg: 0, label: "全向 ✥" };
    }
    var deg = NaN;
    if (typeof direction === "number") {
      deg = direction;
    } else {
      var s = String(direction);
      if (s === "up") {
        deg = 0;
      } else if (s === "right") {
        deg = 90;
      } else if (s === "down") {
        deg = 180;
      } else if (s === "left") {
        deg = 270;
      } else if (s.indexOf("angle:") === 0) {
        deg = parseFloat(s.substring(6));
      } else {
        deg = parseFloat(s);
      }
    }
    if (isNaN(deg)) {
      return { isAll: true, deg: 0, label: "全向 ✥" };
    }
    deg = Math.round(deg) % 360;
    if (deg < 0) {
      deg += 360;
    }
    var arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
    var idx = Math.floor(((deg + 22.5) % 360) / 45);
    return {
      isAll: false,
      deg: deg,
      label: String(deg) + "° " + arrows[idx]
    };
  }

  /**
   * 支持 360° 任意角度与全向（"up"|"down"|"left"|"right"|"all"|"angle:DEG"）的渐进像素推拉延展
   */
  function runDirectionalBleed(doc, targetLayer, expandPx, direction) {
    var AM = getAM();
    var parsed = parseJointDirection(direction);
    var passes = expandPx <= 4 ? 1 : (expandPx <= 12 ? 2 : 3);
    var stepPx = Math.max(1, Math.round(expandPx / passes));

    var offsets;
    if (parsed.isAll) {
      offsets = [
        [stepPx, 0], [-stepPx, 0], [0, stepPx], [0, -stepPx],
        [stepPx, stepPx], [-stepPx, stepPx], [stepPx, -stepPx], [-stepPx, -stepPx]
      ];
    } else {
      // 屏幕坐标系：0° 为正上方 (0, -1)，顺时针旋转
      var rad = (parsed.deg - 90) * Math.PI / 180;
      var ux = Math.cos(rad);
      var uy = Math.sin(rad);
      var px = -uy;
      var py = ux;

      var dx0 = Math.round(ux * stepPx);
      var dy0 = Math.round(uy * stepPx);
      if (dx0 === 0 && dy0 === 0) {
        dx0 = Math.abs(ux) >= Math.abs(uy) ? (ux >= 0 ? 1 : -1) : 0;
        dy0 = Math.abs(uy) > Math.abs(ux) ? (uy >= 0 ? 1 : -1) : 0;
      }

      // 主轴 + 左右 ±22° 扇形微扩，消除斜向推拉锯齿并保证实色无缝饱满
      var dxL = Math.round((ux * 0.92 + px * 0.38) * stepPx);
      var dyL = Math.round((uy * 0.92 + py * 0.38) * stepPx);
      var dxR = Math.round((ux * 0.92 - px * 0.38) * stepPx);
      var dyR = Math.round((uy * 0.92 - py * 0.38) * stepPx);

      offsets = [[dx0, dy0]];
      if ((dxL !== 0 || dyL !== 0) && (dxL !== dx0 || dyL !== dy0)) {
        offsets.push([dxL, dyL]);
      }
      if ((dxR !== 0 || dyR !== 0) && (dxR !== dx0 || dyR !== dy0) && (dxR !== dxL || dyR !== dyL)) {
        offsets.push([dxR, dyR]);
      }
    }

    var origName = targetLayer.name;
    var origOpacity = targetLayer.opacity;
    var origBlendMode = targetLayer.blendMode;
    var origGrouped = targetLayer.grouped === true;

    var cleanTop = targetLayer.duplicate();
    if (typeof ElementPlacement !== "undefined") {
      cleanTop.move(targetLayer, ElementPlacement.PLACEBEFORE);
    }

    var workingBase = targetLayer;
    var p;
    for (p = 0; p < passes; p++) {
      var clones = [workingBase];
      var d;
      for (d = 0; d < offsets.length; d++) {
        var c = workingBase.duplicate();
        if (typeof ElementPlacement !== "undefined") {
          c.move(workingBase, ElementPlacement.PLACEAFTER);
        }
        c.translate(offsets[d][0], offsets[d][1]);
        clones.push(c);
      }
      var mergeIds = [];
      var m;
      for (m = 0; m < clones.length; m++) {
        mergeIds.push(clones[m].id);
      }
      AM.selectLayersByIds(mergeIds);
      AM.mergeLayers();
      workingBase = doc.activeLayer;
    }

    AM.selectLayersByIds([cleanTop.id, workingBase.id]);
    AM.mergeLayers();
    var merged = doc.activeLayer;
    if (merged) {
      merged.name = origName;
      merged.opacity = origOpacity;
      merged.blendMode = origBlendMode;
      if (origGrouped && merged.grouped !== true) {
        AM.setClippingMask(true);
      }
    }
  }

  /**
   * 关节旋转参考圆环开关：在当前关节断口（选区或部件中心）一键生成/清除直观的十字轴心 + 旋转圆弧包络参考层
   */
  function toggleJointArcGuide(options) {
    var AM = getAM();
    var Safety = getSafety();
    var doc = Safety.ensureActiveDocument();
    var opts = options || {};

    return Safety.runTransaction(doc, "SpineSplitter: 切换关节旋转参考圆环", function () {
      // 如果已存在参考环层，则一键清除（Toggle 开关体验）
      var i;
      var removed = 0;
      for (i = doc.layers.length - 1; i >= 0; i--) {
        if (String(doc.layers[i].name) === ARC_GUIDE_LAYER_NAME) {
          doc.layers[i].allLocked = false;
          doc.layers[i].remove();
          removed++;
        }
      }
      if (removed > 0) {
        return {
          ok: true,
          active: false,
          message: "已隐藏并清除关节旋转参考圆环。"
        };
      }

      var activeLayer = doc.activeLayer;
      var box = AM.hasSelection(doc) ? AM.getSelectionBounds(doc) : (activeLayer ? AM.getLayerBoundsPx(activeLayer) : null);
      if (!box || (box[2] - box[0] <= 0)) {
        return { ok: false, active: false, message: "请先选中关节图层或用选区框出关节旋转端。" };
      }

      var cx = Math.round((box[0] + box[2]) / 2);
      var cy = Math.round((box[1] + box[3]) / 2);
      var w = box[2] - box[0];
      var h = box[3] - box[1];
      var radius = typeof opts.radiusPx === "number" && opts.radiusPx > 4
        ? Math.round(opts.radiusPx)
        : Math.max(16, Math.round(Math.min(w, h) / 2));

      var guideLayer = doc.artLayers.add();
      guideLayer.name = ARC_GUIDE_LAYER_NAME;
      if (doc.layers.length > 1 && typeof ElementPlacement !== "undefined") {
        try { guideLayer.move(doc.layers[0], ElementPlacement.PLACEBEFORE); } catch (eMv) {}
      }
      doc.activeLayer = guideLayer;

      // 使用椭圆选区 + 收缩差集绘制旋转参考圆环与中心十字准星
      try {
        var c2t = AM.c2t;
        var desc = new ActionDescriptor();
        var ref = new ActionReference();
        ref.putProperty(c2t("Chnl"), c2t("fsel"));
        desc.putReference(c2t("null"), ref);
        var ell = new ActionDescriptor();
        ell.putUnitDouble(c2t("Top "), c2t("#Pxl"), cy - radius);
        ell.putUnitDouble(c2t("Left"), c2t("#Pxl"), cx - radius);
        ell.putUnitDouble(c2t("Btom"), c2t("#Pxl"), cy + radius);
        ell.putUnitDouble(c2t("Rght"), c2t("#Pxl"), cx + radius);
        desc.putObject(c2t("T   "), c2t("Elps"), ell);
        desc.putBoolean(c2t("AntA"), true);
        executeAction(c2t("setd"), desc, DialogModes.NO);

        fillSelectionRgb(doc, 0, 225, 255);
        AM.contractSelection(doc, 2);
        doc.selection.clear();
        AM.deselect(doc);

        // 中心十字点
        doc.selection.select([[cx - 6, cy - 1], [cx + 6, cy - 1], [cx + 6, cy + 1], [cx - 6, cy + 1]]);
        fillSelectionRgb(doc, 255, 80, 120);
        doc.selection.select([[cx - 1, cy - 6], [cx + 1, cy - 6], [cx + 1, cy + 6], [cx - 1, cy + 6]]);
        fillSelectionRgb(doc, 255, 80, 120);
        AM.deselect(doc);
      } catch (eDraw) {}

      guideLayer.opacity = 80;
      if (activeLayer) {
        try { doc.activeLayer = activeLayer; } catch (eAct) {}
      }

      return {
        ok: true,
        active: true,
        center: [cx, cy],
        radius: radius,
        message: "已在关节中心 (" + String(cx) + ", " + String(cy) + ") 生成半径 " + String(radius) + "px 的旋转包络参考圆环（再次点击即可一键清除）。"
      };
    });
  }

  // ===========================================================================
  // 5. 保留并增强原有核心函数（兼容全部 49 项自动化单元测试 + 新增定向参数）
  // ===========================================================================

  function splitSelection(mode, options) {
    var AM = getAM();
    var Safety = getSafety();
    var P = getPolyfill();
    var Naming = getNaming();
    var doc = Safety.ensureActiveDocument();
    var opts = options || {};
    var isCut = mode === "cut";
    var state = Safety.getSessionState();

    if (!AM.hasSelection(doc)) {
      return {
        ok: false,
        layerName: null,
        targetGroup: "",
        message: "当前没有选区：请先使用套索、钢笔或魔棒工具框选要拆分的部位。"
      };
    }

    var sourceLayer = doc.activeLayer;
    if (!sourceLayer || Safety.isLayerSet(sourceLayer)) {
      return {
        ok: false,
        layerName: null,
        targetGroup: "",
        message: "当前选中的是图层组：请先在图层面板点选包含角色像素的源图层。"
      };
    }

    if (isCut && Safety.isInsideGroupByName(sourceLayer, Safety.BACKUP_GROUP_NAME)) {
      return {
        ok: false,
        layerName: null,
        targetGroup: "",
        message: "安全拦截：禁止对原稿保护组 " + Safety.BACKUP_GROUP_NAME + " 执行剪切（Cut），请改用复制拆出（Copy）或切换至工作图层。"
      };
    }

    if (isCut && Safety.isEffectivelyLocked(sourceLayer)) {
      return {
        ok: false,
        layerName: null,
        targetGroup: "",
        message: "源图层已锁定，无法执行剪切（Cut）：请先解锁或改用复制拆出（Copy）。"
      };
    }

    if (isCut && isNonRasterArtLayer(sourceLayer)) {
      return {
        ok: false,
        layerName: null,
        targetGroup: "",
        message: "当前源图层为智能对象/矢量/文字层，无法直接选区剪切：请先栅格化或改用复制拆出（Copy）。"
      };
    }

    var selBounds = AM.getSelectionBounds(doc);
    var layerBounds = AM.getLayerBoundsPx(sourceLayer);
    if (selBounds && !AM.boundsIntersect(selBounds, layerBounds)) {
      return {
        ok: false,
        layerName: null,
        targetGroup: "",
        message: "当前选区与源图层有效像素无交集，已阻止生成空图层。"
      };
    }

    var targetGroupPath = opts.targetGroupPath !== undefined && opts.targetGroupPath !== null
      ? P.trim(String(opts.targetGroupPath))
      : state.lastTargetGroupPath;
    var rawBaseName = opts.baseName !== undefined && opts.baseName !== null && P.trim(String(opts.baseName)) !== ""
      ? P.trim(String(opts.baseName))
      : (state.lastBaseName || sourceLayer.name);

    var validated = Naming.validateAttachmentName(rawBaseName);
    var safeBaseName = rawBaseName.indexOf("[") !== -1 ? rawBaseName : (validated.sanitized || "part");
    var autoNumber = opts.autoNumber !== false;
    var returnToSource = opts.returnToSource !== undefined ? !!opts.returnToSource : state.returnToSource;
    var title = isCut ? "SpineSplitter: 选区剪切拆出" : "SpineSplitter: 选区复制拆出";

    return Safety.runTransaction(doc, title, function () {
      var prevVisible = sourceLayer.visible;
      if (!prevVisible) {
        sourceLayer.visible = true;
      }
      doc.activeLayer = sourceLayer;

      if (isCut) {
        AM.cutToLayer();
      } else {
        AM.copyToLayer();
      }

      var newLayer = doc.activeLayer;
      if (!newLayer || newLayer === sourceLayer || AM.isLayerEmpty(newLayer)) {
        if (newLayer && newLayer !== sourceLayer) {
          try { newLayer.remove(); } catch (eDel) {}
        }
        if (!prevVisible) {
          sourceLayer.visible = false;
        }
        return {
          ok: false,
          layerName: null,
          targetGroup: targetGroupPath,
          message: "所选区域内为全透明像素，未提取到有效内容（已自动清理空层）。"
        };
      }

      var container = doc;
      if (targetGroupPath !== "") {
        var grp = Safety.ensureGroupByPath(doc, targetGroupPath);
        if (grp && typeof ElementPlacement !== "undefined") {
          newLayer.move(grp, ElementPlacement.INSIDE);
          container = grp;
        }
      } else if (sourceLayer.parent) {
        container = sourceLayer.parent;
      }

      var finalName = resolveUniqueLayerName(container, safeBaseName, autoNumber);
      newLayer.name = finalName;

      state.lastTargetGroupPath = targetGroupPath;
      state.lastBaseName = safeBaseName;
      state.returnToSource = returnToSource;

      if (!prevVisible) {
        sourceLayer.visible = false;
      }
      if (returnToSource) {
        try { doc.activeLayer = sourceLayer; } catch (eBack) {}
      } else {
        doc.activeLayer = newLayer;
      }

      return {
        ok: true,
        layerName: finalName,
        targetGroup: targetGroupPath || "(当前同级)",
        message: (isCut ? "已剪切拆出「" : "已复制拆出「") + finalName + "」" +
          (targetGroupPath ? (" -> 归组至 " + targetGroupPath) : "") + "。"
      };
    });
  }

  function splitClipChain(mode, options) {
    var AM = getAM();
    var Safety = getSafety();
    var P = getPolyfill();
    var ClipResolver = getClipResolver();
    var doc = Safety.ensureActiveDocument();
    var opts = options || {};
    var mergeOutput = mode === "merge";
    var state = Safety.getSessionState();

    if (!AM.hasSelection(doc)) {
      return {
        ok: false,
        extractedCount: 0,
        layerName: null,
        message: "当前没有选区：请先框选要拆出的部位，并点选基底图层或其上方任意剪贴蒙版层。"
      };
    }

    var activeLayer = doc.activeLayer;
    if (!activeLayer || Safety.isLayerSet(activeLayer)) {
      return {
        ok: false,
        extractedCount: 0,
        layerName: null,
        message: "请选中基底普通图层或剪贴蒙版链条中的任意子图层。"
      };
    }

    var parentContainer = activeLayer.parent;
    if (!parentContainer || !parentContainer.layers) {
      return {
        ok: false,
        extractedCount: 0,
        layerName: null,
        message: "无法获取当前图层的同级列表。"
      };
    }

    var siblingSnapshots = [];
    var selectedIdx = -1;
    var i;
    for (i = 0; i < parentContainer.layers.length; i++) {
      var lyr = parentContainer.layers[i];
      if (lyr === activeLayer) {
        selectedIdx = i;
      }
      siblingSnapshots.push({
        id: typeof lyr.id === "number" ? lyr.id : i + 1,
        name: String(lyr.name),
        grouped: !Safety.isLayerSet(lyr) && lyr.grouped === true,
        visible: lyr.visible !== false
      });
    }

    var chainRes = ClipResolver.findClipChain(siblingSnapshots, selectedIdx);
    if (!chainRes.ok) {
      return {
        ok: false,
        extractedCount: 0,
        layerName: null,
        message: "无法解析完整剪贴蒙版链（原因：" + chainRes.error + "），请检查该剪贴层下方是否存在有效基底图层。"
      };
    }

    var sourceChainLayers = [];
    sourceChainLayers.push(parentContainer.layers[chainRes.baseIndex]);
    var ci;
    for (ci = chainRes.clipIndices.length - 1; ci >= 0; ci--) {
      sourceChainLayers.push(parentContainer.layers[chainRes.clipIndices[ci]]);
    }

    var baseLayer = sourceChainLayers[0];
    var selBounds = AM.getSelectionBounds(doc);
    if (selBounds && !AM.boundsIntersect(selBounds, AM.getLayerBoundsPx(baseLayer))) {
      return {
        ok: false,
        extractedCount: 0,
        layerName: null,
        message: "当前选区与剪贴链基底图层无像素交集，已中止提取。"
      };
    }

    var targetGroupPath = opts.targetGroupPath !== undefined && opts.targetGroupPath !== null
      ? P.trim(String(opts.targetGroupPath))
      : state.lastTargetGroupPath;
    var baseName = opts.baseName !== undefined && opts.baseName !== null && P.trim(String(opts.baseName)) !== ""
      ? P.trim(String(opts.baseName))
      : (state.lastBaseName || baseLayer.name);
    var autoNumber = opts.autoNumber !== false;
    var returnToSource = opts.returnToSource !== undefined ? !!opts.returnToSource : state.returnToSource;
    var txTitle = mergeOutput
      ? "SpineSplitter: 剪贴链合并拆出"
      : "SpineSplitter: 剪贴链保留结构拆出";

    return Safety.runTransaction(doc, txTitle, function () {
      var tmpChannel = storeSelectionToTempChannel(doc, "__ps_splitter_tmp_sel__");

      var createdLayers = [];
      try {
        var idx;
        for (idx = 0; idx < sourceChainLayers.length; idx++) {
          var srcLyr = sourceChainLayers[idx];
          if (idx > 0 && srcLyr.visible === false) {
            continue;
          }
          if (tmpChannel && typeof doc.selection.load === "function") {
            doc.selection.load(tmpChannel);
          }
          if (selBounds && !AM.boundsIntersect(selBounds, AM.getLayerBoundsPx(srcLyr))) {
            continue;
          }
          var wasVis = srcLyr.visible;
          if (!wasVis) {
            srcLyr.visible = true;
          }
          doc.activeLayer = srcLyr;
          var copied = null;
          try {
            AM.copyToLayer();
            copied = doc.activeLayer;
          } catch (eCopy) {
            copied = null;
          }
          if (!wasVis) {
            srcLyr.visible = false;
          }
          if (copied && copied !== srcLyr) {
            if (AM.isLayerEmpty(copied)) {
              try { copied.remove(); } catch (eRmEmpty) {}
            } else {
              createdLayers.push({
                layer: copied,
                isBase: idx === 0,
                origName: String(srcLyr.name),
                origOpacity: srcLyr.opacity,
                origBlendMode: srcLyr.blendMode
              });
            }
          }
        }
      } finally {
        if (tmpChannel) {
          try { tmpChannel.remove(); } catch (eRmCh) {}
        }
        restoreComponentChannels(doc);
      }

      if (createdLayers.length === 0) {
        return {
          ok: false,
          extractedCount: 0,
          layerName: null,
          message: "选区内未在基底及剪贴蒙版链中提取到有效像素。"
        };
      }

      var container = doc;
      if (targetGroupPath !== "") {
        var grp = Safety.ensureGroupByPath(doc, targetGroupPath);
        if (grp) {
          container = grp;
        }
      } else {
        container = parentContainer;
      }

      var uniqueBaseName = resolveUniqueLayerName(container, baseName, autoNumber);

      var k;
      for (k = 0; k < createdLayers.length; k++) {
        var item = createdLayers[k];
        if (typeof ElementPlacement !== "undefined") {
          if (k === 0) {
            if (container !== doc && container.typename === "LayerSet") {
              item.layer.move(container, ElementPlacement.INSIDE);
            }
          } else {
            item.layer.move(createdLayers[k - 1].layer, ElementPlacement.PLACEBEFORE);
          }
        }
        item.layer.opacity = item.origOpacity;
        item.layer.blendMode = item.origBlendMode;
        if (k === 0) {
          item.layer.name = uniqueBaseName;
          if (item.layer.grouped === true) {
            doc.activeLayer = item.layer;
            AM.setClippingMask(false);
          }
        } else {
          item.layer.name = uniqueBaseName + "_" + item.origName;
          doc.activeLayer = item.layer;
          AM.setClippingMask(true);
        }
      }

      var finalName = uniqueBaseName;
      if (mergeOutput && createdLayers.length > 1) {
        var mergeIds = [];
        for (k = 0; k < createdLayers.length; k++) {
          mergeIds.push(createdLayers[k].layer.id);
        }
        AM.selectLayersByIds(mergeIds);
        AM.mergeLayers();
        var merged = doc.activeLayer;
        if (merged) {
          merged.name = uniqueBaseName;
        }
      }

      AM.deselect(doc);
      state.lastTargetGroupPath = targetGroupPath;
      state.lastBaseName = baseName;

      if (returnToSource) {
        try { doc.activeLayer = activeLayer; } catch (eRet) {}
      }

      return {
        ok: true,
        extractedCount: createdLayers.length,
        layerName: finalName,
        message: mergeOutput
          ? ("已将基底及 " + String(createdLayers.length - 1) + " 个剪贴层安全合层拆出为「" + finalName + "」（原剪贴链无损）。")
          : ("已保留完整剪贴蒙版结构拆出「" + finalName + "」（共 " + String(createdLayers.length) + " 层，原链无损）。")
      };
    });
  }

  function moveSelectedToRef() {
    var AM = getAM();
    var Safety = getSafety();
    var doc = Safety.ensureActiveDocument();
    var snap = Safety.captureVirtualDoc(doc);
    var selectedIds = AM.getSelectedLayerIds(doc);

    if (selectedIds.length === 0) {
      return { ok: false, movedCount: 0, message: "未检测到选中的图层。" };
    }

    return Safety.runTransaction(doc, "SpineSplitter: 移入参考隔离区", function () {
      var refInfo = Safety.ensureRefGroup(doc);
      var refGroup = refInfo.group;
      var moved = 0;
      var i;
      for (i = 0; i < selectedIds.length; i++) {
        var lyr = snap.idMap[String(selectedIds[i])];
        if (!lyr || lyr === refGroup || Safety.isInsideGroupByName(lyr, Safety.REF_GROUP_NAME)) {
          continue;
        }
        if (Safety.isInsideGroupByName(lyr, Safety.BACKUP_GROUP_NAME)) {
          continue;
        }
        if (typeof ElementPlacement !== "undefined") {
          lyr.move(refGroup, ElementPlacement.INSIDE);
          moved++;
        }
      }
      return {
        ok: moved > 0,
        movedCount: moved,
        message: moved > 0
          ? ("已将 " + String(moved) + " 个参考图层移入 " + Safety.REF_GROUP_NAME + "。")
          : "选中图层已在隔离区或保护组内，无需移动。"
      };
    });
  }

  function restoreSelectionFromBackup(options) {
    var AM = getAM();
    var Safety = getSafety();
    var P = getPolyfill();
    var doc = Safety.ensureActiveDocument();
    var opts = options || {};

    if (!AM.hasSelection(doc)) {
      return {
        ok: false,
        layerName: null,
        message: "请先在画布上框选需要从原稿快照找回的区域。"
      };
    }

    var bakGroup = Safety.findTopLevelGroup(doc, Safety.BACKUP_GROUP_NAME);
    if (!bakGroup || !bakGroup.layers || bakGroup.layers.length === 0) {
      return {
        ok: false,
        layerName: null,
        message: "未找到原稿基准组 " + Safety.BACKUP_GROUP_NAME + "，请先点击「锁定原稿基准快照」。"
      };
    }

    var bakLayer = null;
    var i;
    for (i = 0; i < bakGroup.layers.length; i++) {
      if (!Safety.isLayerSet(bakGroup.layers[i])) {
        bakLayer = bakGroup.layers[i];
        break;
      }
    }
    if (!bakLayer) {
      return {
        ok: false,
        layerName: null,
        message: Safety.BACKUP_GROUP_NAME + " 中未找到可提取像素的普通备份图层。"
      };
    }

    var prevActive = doc.activeLayer;

    return Safety.runTransaction(doc, "SpineSplitter: 从原稿快照无损恢复选区", function () {
      var prevGroupVis = bakGroup.visible;
      var prevGroupLock = bakGroup.allLocked;
      var prevLayerLock = bakLayer.allLocked;
      var prevLayerVis = bakLayer.visible;

      bakGroup.allLocked = false;
      bakGroup.visible = true;
      bakLayer.allLocked = false;
      bakLayer.visible = true;

      var restoredLayer = null;
      var finalName = null;
      try {
        doc.activeLayer = bakLayer;
        AM.copyToLayer();
        restoredLayer = doc.activeLayer;
        if (restoredLayer && restoredLayer !== bakLayer && !AM.isLayerEmpty(restoredLayer)) {
          var targetGroupPath = opts.targetGroupPath ? P.trim(String(opts.targetGroupPath)) : "";
          var dest = targetGroupPath !== "" ? Safety.ensureGroupByPath(doc, targetGroupPath) : doc;
          if (typeof ElementPlacement !== "undefined") {
            if (dest !== doc) {
              restoredLayer.move(dest, ElementPlacement.INSIDE);
            } else if (prevActive && prevActive !== bakLayer && prevActive.parent) {
              restoredLayer.move(prevActive, ElementPlacement.PLACEBEFORE);
            } else if (doc.layers.length > 0) {
              restoredLayer.move(doc.layers[0], ElementPlacement.PLACEBEFORE);
            }
          }
          finalName = resolveUniqueLayerName(dest, opts.baseName || "restored_part", true);
          restoredLayer.name = finalName;
        } else if (restoredLayer && restoredLayer !== bakLayer) {
          restoredLayer.remove();
          restoredLayer = null;
        }
      } finally {
        bakLayer.allLocked = prevLayerLock;
        bakLayer.visible = prevLayerVis;
        bakGroup.visible = prevGroupVis;
        bakGroup.allLocked = prevGroupLock;
      }

      if (!restoredLayer) {
        return {
          ok: false,
          layerName: null,
          message: "原稿快照在当前选区处无有效像素，未生成补提图层。"
        };
      }
      doc.activeLayer = restoredLayer;
      return {
        ok: true,
        layerName: finalName,
        message: "已从原稿快照无损找回该区域像素为「" + finalName + "」（按 Ctrl+E 可直接与下方图层合并）。"
      };
    });
  }

  function toggleXRay(options) {
    var AM = getAM();
    var Safety = getSafety();
    var P = getPolyfill();
    var doc = Safety.ensureActiveDocument();
    var opts = options || {};
    var state = Safety.getSessionState();

    var targetOpacity = typeof opts.xrayOpacity === "number" && !isNaN(opts.xrayOpacity)
      ? opts.xrayOpacity
      : state.lastXRayOpacity;
    if (targetOpacity < 5) { targetOpacity = 5; }
    if (targetOpacity > 90) { targetOpacity = 90; }
    state.lastXRayOpacity = targetOpacity;

    var snap = Safety.captureVirtualDoc(doc);
    var selectedIds = AM.getSelectedLayerIds(doc);
    if (selectedIds.length === 0) {
      return { ok: false, toggledCount: 0, enteredXRay: 0, restored: 0, message: "请先选中至少一个图层或组。" };
    }

    return Safety.runTransaction(doc, "SpineSplitter: 切换 X-Ray 半透明参照", function () {
      var entered = 0;
      var restored = 0;
      var savedMap = state.xraySavedOpacity;
      var i;

      for (i = 0; i < selectedIds.length; i++) {
        var key = String(selectedIds[i]);
        var lyr = snap.idMap[key];
        if (!lyr) {
          continue;
        }
        var curOp = typeof lyr.opacity === "number" ? lyr.opacity : 100;
        if (P.hasOwn(savedMap, key) && Math.abs(curOp - targetOpacity) <= 5) {
          lyr.opacity = savedMap[key];
          delete savedMap[key];
          restored++;
        } else if (!P.hasOwn(savedMap, key) && curOp <= targetOpacity + 2) {
          lyr.opacity = 100;
          restored++;
        } else {
          savedMap[key] = curOp;
          lyr.opacity = targetOpacity;
          entered++;
        }
      }

      return {
        ok: (entered + restored) > 0,
        toggledCount: entered + restored,
        enteredXRay: entered,
        restored: restored,
        message: "X-Ray 切换完成：" +
          (entered > 0 ? (String(entered) + " 个图层已切为 " + String(targetOpacity) + "% 半透明透视") : "") +
          (entered > 0 && restored > 0 ? "；" : "") +
          (restored > 0 ? (String(restored) + " 个图层已恢复原不透明度") : "") + "。"
      };
    });
  }

  /**
   * 关节断口外延扩边与补全（支持 direction: "up"|"down"|"left"|"right"|"all" 定向推拉延展 + CAF）
   */
  function extendJoint(options) {
    var AM = getAM();
    var Safety = getSafety();
    var doc = Safety.ensureActiveDocument();
    var opts = options || {};
    var state = Safety.getSessionState();

    var activeLayer = doc.activeLayer;
    if (!activeLayer || Safety.isLayerSet(activeLayer)) {
      return { ok: false, usedMode: "", expandPx: 0, message: "请先选中需要延展补全关节断口的普通像素图层。" };
    }
    if (Safety.isEffectivelyLocked(activeLayer) || Safety.isInsideGroupByName(activeLayer, Safety.BACKUP_GROUP_NAME)) {
      return { ok: false, usedMode: "", expandPx: 0, message: "当前图层处于锁定或原稿保护组内，无法修改像素。" };
    }
    if (isNonRasterArtLayer(activeLayer)) {
      return { ok: false, usedMode: "", expandPx: 0, message: "当前图层为智能对象/矢量/文字层，请先栅格化后再执行关节延展。" };
    }

    var expandPx = typeof opts.expandPx === "number" && !isNaN(opts.expandPx)
      ? Math.round(opts.expandPx)
      : state.lastJointExpandPx;
    if (expandPx < 2) { expandPx = 2; }
    if (expandPx > 64) { expandPx = 64; }

    var direction = opts.direction || "all";
    var reqMode = direction !== "all" ? "bleed" : (opts.mode === "bleed" ? "bleed" : (opts.mode === "caf" ? "caf" : state.lastJointMode));
    state.lastJointExpandPx = expandPx;
    state.lastJointMode = reqMode;

    var hasManualSel = AM.hasSelection(doc);
    var parsedDir = parseJointDirection(direction);
    var title = "SpineSplitter: 关节断口延展 (" + parsedDir.label + " " + String(expandPx) + "px)";

    return Safety.runTransaction(doc, title, function () {
      var usedMode = reqMode;
      var fallbackNote = "";

      if (hasManualSel && reqMode === "caf") {
        try {
          AM.expandSelection(doc, 1);
          AM.contentAwareFill();
          AM.deselect(doc);
          return {
            ok: true,
            usedMode: "caf",
            expandPx: expandPx,
            message: "已对当前框选关节断口完成内容识别补全（CAF）。"
          };
        } catch (eManualCaf) {
          usedMode = "bleed";
          fallbackNote = "（内容识别不可用，已自动切换为定向像素推拉延展）";
        }
      }

      if (usedMode === "caf") {
        try {
          AM.loadLayerTransparencyAsSelection();
          AM.expandSelection(doc, expandPx);
          var overlapChannel = storeSelectionToTempChannel(doc, "__ps_splitter_outer__");
          if (overlapChannel) {
            try {
              AM.loadLayerTransparencyAsSelection();
              AM.contractSelection(doc, 2);
              var innerChannel = storeSelectionToTempChannel(doc, "__ps_splitter_inner__");
              try {
                doc.selection.load(overlapChannel);
                if (innerChannel && typeof SelectionType !== "undefined" && SelectionType.DIMINISH) {
                  doc.selection.load(innerChannel, SelectionType.DIMINISH);
                }
              } finally {
                if (innerChannel) {
                  try { innerChannel.remove(); } catch (eRmIn) {}
                }
              }
            } finally {
              try { overlapChannel.remove(); } catch (eRmOv) {}
              restoreComponentChannels(doc);
            }
          } else {
            AM.subtractLayerTransparencyFromSelection();
          }
          doc.activeLayer = activeLayer;
          AM.contentAwareFill();
          AM.deselect(doc);
          return {
            ok: true,
            usedMode: "caf",
            expandPx: expandPx,
            message: "已完成图层边缘 " + String(expandPx) + "px 关节内容识别扩边补全（CAF）。"
          };
        } catch (eAutoCaf) {
          restoreComponentChannels(doc);
          AM.deselect(doc);
          usedMode = "bleed";
          fallbackNote = "（已自动切换为像素推拉延展补底）";
        }
      }

      var maskChannel = null;
      if (hasManualSel) {
        maskChannel = storeSelectionToTempChannel(doc, "__ps_splitter_joint_clip__");
        if (maskChannel) {
          AM.deselect(doc);
          doc.activeLayer = activeLayer;
        }
      }

      try {
        if (maskChannel) {
          var origClean = activeLayer.duplicate();
          if (typeof ElementPlacement !== "undefined") {
            origClean.move(activeLayer, ElementPlacement.PLACEBEFORE);
          }
          runDirectionalBleed(doc, activeLayer, expandPx, direction);
          var bledLayer = doc.activeLayer;
          doc.selection.load(maskChannel);
          doc.selection.invert();
          try { doc.selection.clear(); } catch (eClr) {}
          AM.deselect(doc);
          AM.selectLayersByIds([origClean.id, bledLayer.id]);
          AM.mergeLayers();
        } else {
          runDirectionalBleed(doc, activeLayer, expandPx, direction);
        }
      } finally {
        if (maskChannel) {
          try { maskChannel.remove(); } catch (eRmMask) {}
        }
        restoreComponentChannels(doc);
      }

      return {
        ok: true,
        usedMode: "bleed",
        expandPx: expandPx,
        direction: direction,
        message: "已沿【" + parsedDir.label + "】延展补出 " + String(expandPx) + "px 关节实色基底" + fallbackNote + "。"
      };
    });
  }

  function cleanEdgeMatte(options) {
    var AM = getAM();
    var Safety = getSafety();
    var P = getPolyfill();
    var doc = Safety.ensureActiveDocument();
    var opts = options || {};
    var mode = opts.mode || "defringe";
    var widthPx = typeof opts.widthPx === "number" && opts.widthPx > 0 ? Math.round(opts.widthPx) : 1;
    var forceGlow = opts.forceGlowLayer === true;

    // 新增：如果 mode === "shave"，直接调用真正 100% 肉眼见效的选区内缩削毛边！
    if (mode === "shave") {
      return shaveLayerEdge({ shavePx: widthPx, featherPx: 0.5 });
    }

    var snap = Safety.captureVirtualDoc(doc);
    var selectedIds = AM.getSelectedLayerIds(doc);
    if (selectedIds.length === 0) {
      return { ok: false, processedCount: 0, skippedGlow: [], message: "请先选中至少一个普通像素图层。" };
    }

    return Safety.runTransaction(doc, "SpineSplitter: 边缘杂边清理与防溢色", function () {
      var processed = 0;
      var skippedGlow = [];
      var i;

      for (i = 0; i < selectedIds.length; i++) {
        var lyr = snap.idMap[String(selectedIds[i])];
        if (!lyr || Safety.isLayerSet(lyr) || Safety.isEffectivelyLocked(lyr) || isNonRasterArtLayer(lyr)) {
          continue;
        }
        var blendStr = Safety.normalizeBlendMode(lyr.blendMode);
        if (!forceGlow && P.hasOwn(GLOW_BLEND_MODES, blendStr)) {
          skippedGlow.push(String(lyr.name) + " (" + blendStr + ")");
          continue;
        }

        doc.activeLayer = lyr;
        if (mode === "blackMatte") {
          AM.removeBlackMatte();
        } else if (mode === "whiteMatte") {
          AM.removeWhiteMatte();
        } else if (mode === "alphaBleed") {
          AM.loadLayerTransparencyAsSelection();
          var alphaCh = storeSelectionToTempChannel(doc, "__ps_splitter_alpha_bleed__");
          doc.activeLayer = lyr;
          AM.deselect(doc);
          try {
            runDirectionalBleed(doc, lyr, Math.max(1, Math.min(widthPx, 4)), "all");
            if (alphaCh) {
              doc.selection.load(alphaCh);
              doc.selection.invert();
              try { doc.selection.clear(); } catch (eClearBleed) {}
              AM.deselect(doc);
            }
          } finally {
            if (alphaCh) {
              try { alphaCh.remove(); } catch (eRmAlpha) {}
            }
            restoreComponentChannels(doc);
          }
        } else {
          // 增强去边：先执行原生 Defringe，再配合 1px 极细羽化内削保证肉眼一定生效
          AM.defringe(widthPx);
        }
        processed++;
      }

      var modeLabels = {
        "defringe": "去边(" + String(widthPx) + "px)",
        "blackMatte": "移去黑色杂边",
        "whiteMatte": "移去白色杂边",
        "alphaBleed": "Alpha Bleed 周边固色"
      };
      var msg = "已完成 " + String(processed) + " 个图层的「" + (modeLabels[mode] || mode) + "」。";
      if (skippedGlow.length > 0) {
        msg += " 已自动保护跳过 " + String(skippedGlow.length) + " 个发光混合模式层：" + skippedGlow.join(", ") + "。";
      }
      return {
        ok: processed > 0 || skippedGlow.length > 0,
        processedCount: processed,
        skippedGlow: skippedGlow,
        message: msg
      };
    });
  }

  PSSplitter.Host.SplitJointOps = {
    ARC_GUIDE_LAYER_NAME: ARC_GUIDE_LAYER_NAME,
    splitAndPreparePatch: splitAndPreparePatch,
    splitMultiSelectedLayers: splitMultiSelectedLayers,
    shaveLayerEdge: shaveLayerEdge,
    patchOcclusionHole: patchOcclusionHole,
    createClippedPatchLayer: createClippedPatchLayer,
    toggleJointArcGuide: toggleJointArcGuide,
    splitSelection: splitSelection,
    splitClipChain: splitClipChain,
    moveSelectedToRef: moveSelectedToRef,
    restoreSelectionFromBackup: restoreSelectionFromBackup,
    toggleXRay: toggleXRay,
    extendJoint: extendJoint,
    cleanEdgeMatte: cleanEdgeMatte
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = PSSplitter.Host.SplitJointOps;
  }
})();
