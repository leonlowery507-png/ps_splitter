/**
 * @fileoverview Photoshop 语言无关 ActionManager 原语封装（PSSplitter.Host.AM）
 * 严格使用 charIDToTypeID / stringIDToTypeID，确保在中/英/日等所有语言版 Photoshop CS6 ~ CC 2025+ 下稳定运行。
 */

(function () {
  var rootScope = (typeof $ !== "undefined" && $.global)
    ? $.global
    : (typeof global !== "undefined" ? global : (function () { return this; }()));
  rootScope.PSSplitter = rootScope.PSSplitter || {};
  rootScope.PSSplitter.Host = rootScope.PSSplitter.Host || {};
  var PSSplitter = rootScope.PSSplitter;

  /**
   * 4 字符 CharID 转 TypeID
   * @param {string} c4 4 字符标识
   * @returns {number} TypeID
   */
  function c2t(c4) {
    return charIDToTypeID(c4);
  }

  /**
   * StringID 转 TypeID
   * @param {string} str 字符串标识
   * @returns {number} TypeID
   */
  function s2t(str) {
    return stringIDToTypeID(str);
  }

  /**
   * 安全转换 UnitValue 或数值为像素数
   * @param {*} val UnitValue 或数字
   * @returns {number} 像素数值
   */
  function toPx(val) {
    if (val === null || val === undefined) {
      return 0;
    }
    if (typeof val === "number") {
      return val;
    }
    if (typeof val.as === "function") {
      try {
        return val.as("px");
      } catch (e) {
        // 降级读取 value
      }
    }
    if (typeof val.value === "number") {
      return val.value;
    }
    var n = parseFloat(String(val));
    return isNaN(n) ? 0 : n;
  }

  /**
   * 安全读取图层边界数组 [left, top, right, bottom]（单位：像素）
   * @param {Object} layer Photoshop Layer 对象
   * @returns {Array<number>} 像素边界
   */
  function getLayerBoundsPx(layer) {
    if (!layer || !layer.bounds) {
      return [0, 0, 0, 0];
    }
    var b = layer.bounds;
    if (b.length < 4) {
      return [0, 0, 0, 0];
    }
    return [toPx(b[0]), toPx(b[1]), toPx(b[2]), toPx(b[3])];
  }

  /**
   * 判断普通图层是否无有效像素（包围盒宽高 <= 0）
   * @param {Object} layer Photoshop ArtLayer
   * @returns {boolean} 是否为空图层
   */
  function isLayerEmpty(layer) {
    var b = getLayerBoundsPx(layer);
    return (b[2] - b[0] <= 0) || (b[3] - b[1] <= 0);
  }

  /**
   * 检测当前文档是否存在有效选区（绝不抛出无选区 Error 1302）
   * @param {Object} [doc] Photoshop Document
   * @returns {boolean} 是否存在选区
   */
  function hasSelection(doc) {
    if (typeof ActionReference !== "undefined" && typeof executeActionGet === "function") {
      try {
        var ref = new ActionReference();
        ref.putProperty(c2t("Prpr"), s2t("selection"));
        ref.putEnumerated(c2t("Dcmn"), c2t("Ordn"), c2t("Trgt"));
        var desc = executeActionGet(ref);
        return desc.hasKey(s2t("selection"));
      } catch (e) {
        // 回退至 DOM 检测
      }
    }
    var targetDoc = doc || (typeof app !== "undefined" ? app.activeDocument : null);
    if (!targetDoc || !targetDoc.selection) {
      return false;
    }
    try {
      var sb = targetDoc.selection.bounds;
      if (!sb || sb.length < 4) {
        return false;
      }
      return (toPx(sb[2]) - toPx(sb[0]) > 0) && (toPx(sb[3]) - toPx(sb[1]) > 0);
    } catch (e2) {
      return false;
    }
  }

  /**
   * 安全获取当前文档选区边界 [left, top, right, bottom]，无选区返回 null
   * @param {Object} doc Photoshop Document
   * @returns {Array<number>|null} 选区像素边界
   */
  function getSelectionBounds(doc) {
    if (!hasSelection(doc)) {
      return null;
    }
    try {
      var sb = doc.selection.bounds;
      return [toPx(sb[0]), toPx(sb[1]), toPx(sb[2]), toPx(sb[3])];
    } catch (e) {
      return null;
    }
  }

  /**
   * 判断两个像素包围盒是否存在非空交集
   * @param {Array<number>} a [l, t, r, b]
   * @param {Array<number>} b [l, t, r, b]
   * @returns {boolean} 是否相交
   */
  function boundsIntersect(a, b) {
    if (!a || !b) {
      return false;
    }
    var l = a[0] > b[0] ? a[0] : b[0];
    var t = a[1] > b[1] ? a[1] : b[1];
    var r = a[2] < b[2] ? a[2] : b[2];
    var bt = a[3] < b[3] ? a[3] : b[3];
    return (r - l > 0) && (bt - t > 0);
  }

  /**
   * 取消当前选区
   * @param {Object} doc Photoshop Document
   */
  function deselect(doc) {
    try {
      if (doc && doc.selection && typeof doc.selection.deselect === "function") {
        doc.selection.deselect();
      }
    } catch (e) {
      // 忽略无选区取消异常
    }
  }

  /**
   * 执行「通过拷贝的图层」（等价 Ctrl+J，语言无关）
   */
  function copyToLayer() {
    executeAction(c2t("CpTL"), undefined, DialogModes.NO);
  }

  /**
   * 执行「通过剪切的图层」（等价 Ctrl+Shift+J，语言无关）
   */
  function cutToLayer() {
    executeAction(c2t("CtTL"), undefined, DialogModes.NO);
  }

  /**
   * 合并当前选定的图层（或向下合并，等价 Ctrl+E）
   */
  function mergeLayers() {
    executeAction(c2t("Mrg2"), undefined, DialogModes.NO);
  }

  /**
   * 设置或释放当前选中图层的剪贴蒙版状态
   * @param {boolean} enable true=创建剪贴蒙版；false=释放剪贴蒙版
   */
  function setClippingMask(enable) {
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Trgt"));
    desc.putReference(c2t("null"), ref);
    executeAction(enable ? c2t("GrpL") : c2t("Ungr"), desc, DialogModes.NO);
  }

  /**
   * 按 layerId 精确选中图层（不改变可见性）
   * @param {number} layerId Photoshop 内部图层 ID
   * @param {boolean} [addToSelection] 是否追加到当前多选
   */
  function selectLayerById(layerId, addToSelection) {
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putIdentifier(c2t("Lyr "), layerId);
    desc.putReference(c2t("null"), ref);
    if (addToSelection) {
      desc.putEnumerated(
        s2t("selectionModifier"),
        s2t("selectionModifierType"),
        s2t("addToSelection")
      );
    }
    desc.putBoolean(c2t("MkVs"), false);
    executeAction(c2t("slct"), desc, DialogModes.NO);
  }

  /**
   * 批量选中多个指定 layerId
   * @param {Array<number>} layerIds 图层 ID 列表
   */
  function selectLayersByIds(layerIds) {
    if (!layerIds || layerIds.length === 0) {
      return;
    }
    var i;
    for (i = 0; i < layerIds.length; i++) {
      selectLayerById(layerIds[i], i > 0);
    }
  }

  /**
   * 获取当前文档中用户多选的所有图层 ID（兼容 CS6 ~ CC 2025+）
   * @param {Object} doc Photoshop Document
   * @returns {Array<number>} 选中的图层 ID 列表
   */
  function getSelectedLayerIds(doc) {
    var ids = [];
    if (typeof ActionReference !== "undefined" && typeof executeActionGet === "function") {
      try {
        var docRef = new ActionReference();
        docRef.putProperty(c2t("Prpr"), s2t("targetLayersIDs"));
        docRef.putEnumerated(c2t("Dcmn"), c2t("Ordn"), c2t("Trgt"));
        var docDesc = executeActionGet(docRef);
        if (docDesc.hasKey(s2t("targetLayersIDs"))) {
          var idList = docDesc.getList(s2t("targetLayersIDs"));
          var i;
          for (i = 0; i < idList.count; i++) {
            ids.push(idList.getReference(i).getIdentifier());
          }
          if (ids.length > 0) {
            return ids;
          }
        }
      } catch (e1) {
        // 回退至 targetLayers 索引读取（CS6 / CC 2014）
      }

      try {
        var legacyRef = new ActionReference();
        legacyRef.putProperty(c2t("Prpr"), s2t("targetLayers"));
        legacyRef.putEnumerated(c2t("Dcmn"), c2t("Ordn"), c2t("Trgt"));
        var legacyDesc = executeActionGet(legacyRef);
        if (legacyDesc.hasKey(s2t("targetLayers"))) {
          var idxList = legacyDesc.getList(s2t("targetLayers"));
          var hasBg = false;
          try {
            var bg = doc.backgroundLayer;
            hasBg = !!bg;
          } catch (eBg) {
            hasBg = false;
          }
          var offset = hasBg ? 0 : 1;
          var j;
          for (j = 0; j < idxList.count; j++) {
            var itemIdx = idxList.getReference(j).getIndex() + offset;
            var lRef = new ActionReference();
            lRef.putProperty(c2t("Prpr"), s2t("layerID"));
            lRef.putIndex(c2t("Lyr "), itemIdx);
            var lDesc = executeActionGet(lRef);
            if (lDesc.hasKey(s2t("layerID"))) {
              ids.push(lDesc.getInteger(s2t("layerID")));
            }
          }
          if (ids.length > 0) {
            return ids;
          }
        }
      } catch (e2) {
        // 回退至 activeLayer
      }
    }

    if (doc && doc.activeLayer && typeof doc.activeLayer.id === "number") {
      ids.push(doc.activeLayer.id);
    }
    return ids;
  }

  /**
   * 载入当前选中图层的不透明通道为选区（等价 Ctrl+点击图层缩略图）
   */
  function loadLayerTransparencyAsSelection() {
    var desc = new ActionDescriptor();
    var refSel = new ActionReference();
    refSel.putProperty(c2t("Chnl"), c2t("fsel"));
    desc.putReference(c2t("null"), refSel);
    var refTrsp = new ActionReference();
    refTrsp.putEnumerated(c2t("Chnl"), c2t("Chnl"), c2t("Trsp"));
    desc.putReference(c2t("T   "), refTrsp);
    executeAction(c2t("setd"), desc, DialogModes.NO);
  }

  /**
   * 从当前选区中减去指定图层的透明选区（用于只填充关节外扩环带）
   */
  function subtractLayerTransparencyFromSelection() {
    var desc = new ActionDescriptor();
    var refTrsp = new ActionReference();
    refTrsp.putEnumerated(c2t("Chnl"), c2t("Chnl"), c2t("Trsp"));
    desc.putReference(c2t("null"), refTrsp);
    var refSel = new ActionReference();
    refSel.putProperty(c2t("Chnl"), c2t("fsel"));
    desc.putReference(c2t("From"), refSel);
    executeAction(c2t("Sbtr"), desc, DialogModes.NO);
  }

  /**
   * 将当前选区向外扩展指定像素
   * @param {Object} doc Photoshop Document
   * @param {number} px 扩展像素值
   */
  function expandSelection(doc, px) {
    if (px <= 0) {
      return;
    }
    if (typeof UnitValue !== "undefined") {
      doc.selection.expand(new UnitValue(px, "px"));
    } else {
      doc.selection.expand(px);
    }
  }

  /**
   * 将当前选区向内收缩指定像素
   * @param {Object} doc Photoshop Document
   * @param {number} px 收缩像素值
   */
  function contractSelection(doc, px) {
    if (px <= 0) {
      return;
    }
    if (typeof UnitValue !== "undefined") {
      doc.selection.contract(new UnitValue(px, "px"));
    } else {
      doc.selection.contract(px);
    }
  }

  /**
   * 执行内容识别填充（Content-Aware Fill）
   */
  function contentAwareFill() {
    var desc = new ActionDescriptor();
    desc.putEnumerated(c2t("Usng"), c2t("FlCn"), s2t("contentAware"));
    desc.putUnitDouble(c2t("Opct"), c2t("#Prc"), 100.0);
    desc.putEnumerated(c2t("Md  "), c2t("BlnM"), c2t("Nrml"));
    executeAction(c2t("Fl  "), desc, DialogModes.NO);
  }

  /**
   * 移去黑色杂边（Remove Black Matte）
   */
  function removeBlackMatte() {
    executeAction(c2t("RmvB"), undefined, DialogModes.NO);
  }

  /**
   * 移去白色杂边（Remove White Matte）
   */
  function removeWhiteMatte() {
    executeAction(c2t("RmvW"), undefined, DialogModes.NO);
  }

  /**
   * 去边（Defringe）
   * @param {number} widthPx 去边宽度（1 ~ 200 px）
   */
  function defringe(widthPx) {
    var w = widthPx > 0 ? Math.round(widthPx) : 1;
    var desc = new ActionDescriptor();
    desc.putInteger(c2t("Wdth"), w);
    executeAction(c2t("Dfrg"), desc, DialogModes.NO);
  }

  /**
   * 为当前选中图层或组设置图层面板标签颜色（如 "Rd  "=红、"Bl  "=蓝、"Grn "=绿、"None"=无）
   * @param {string} colorChar4 4 字符颜色代码
   */
  function setLayerColorLabel(colorChar4) {
    try {
      var desc = new ActionDescriptor();
      var ref = new ActionReference();
      ref.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Trgt"));
      desc.putReference(c2t("null"), ref);
      var setDesc = new ActionDescriptor();
      setDesc.putEnumerated(c2t("Clr "), c2t("Clr "), c2t(colorChar4));
      desc.putObject(c2t("T   "), c2t("Lyr "), setDesc);
      executeAction(c2t("setd"), desc, DialogModes.NO);
    } catch (e) {
      // 非关键视觉装饰，失败时静默忽略
    }
  }

  PSSplitter.Host.AM = {
    c2t: c2t,
    s2t: s2t,
    toPx: toPx,
    getLayerBoundsPx: getLayerBoundsPx,
    isLayerEmpty: isLayerEmpty,
    hasSelection: hasSelection,
    getSelectionBounds: getSelectionBounds,
    boundsIntersect: boundsIntersect,
    deselect: deselect,
    copyToLayer: copyToLayer,
    cutToLayer: cutToLayer,
    mergeLayers: mergeLayers,
    setClippingMask: setClippingMask,
    selectLayerById: selectLayerById,
    selectLayersByIds: selectLayersByIds,
    getSelectedLayerIds: getSelectedLayerIds,
    loadLayerTransparencyAsSelection: loadLayerTransparencyAsSelection,
    subtractLayerTransparencyFromSelection: subtractLayerTransparencyFromSelection,
    expandSelection: expandSelection,
    contractSelection: contractSelection,
    contentAwareFill: contentAwareFill,
    removeBlackMatte: removeBlackMatte,
    removeWhiteMatte: removeWhiteMatte,
    defringe: defringe,
    setLayerColorLabel: setLayerColorLabel
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = PSSplitter.Host.AM;
  }
})();
