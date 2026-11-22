/**
 * @fileoverview 对称轴镜像、偏差检测、9宫格对齐与安全画布裁切几何数学库（PSSplitter.Core.AlignmentMath）
 * 所有返回值键名严格对齐 PROJECT.md 契约，并对 -0 做 +0 规范化处理。
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

  var VALID_ANCHORS = ["TL", "TC", "TR", "CL", "CC", "CR", "BL", "BC", "BR"];

  function isFiniteNum(v) {
    return typeof v === "number" && !isNaN(v) && isFinite(v);
  }

  function normZero(v) {
    return v === 0 ? 0 : v;
  }

  function isValidBounds(b, allowZeroArea) {
    var P = getPolyfill();
    if (!P.isArray(b) || b.length < 4) {
      return false;
    }
    if (!isFiniteNum(b[0]) || !isFiniteNum(b[1]) || !isFiniteNum(b[2]) || !isFiniteNum(b[3])) {
      return false;
    }
    if (allowZeroArea) {
      return b[2] >= b[0] && b[3] >= b[1];
    }
    return b[2] > b[0] && b[3] > b[1];
  }

  /**
   * 计算矩形包围盒沿垂直对称轴 axisX 水平镜像后的目标坐标与位移量
   * @param {Array<number>} bounds [left, top, right, bottom]
   * @param {number} axisX 对称轴 X 坐标
   * @returns {{targetCenterX:number, deltaX:number, targetBounds:Array<number>}} 镜像结果
   */
  function calcMirrorDelta(bounds, axisX) {
    if (!isValidBounds(bounds, true) || !isFiniteNum(axisX)) {
      throw new Error("AlignmentMath.calcMirrorDelta: invalid bounds or axisX");
    }
    var l = bounds[0];
    var t = bounds[1];
    var r = bounds[2];
    var b = bounds[3];
    var centerX = (l + r) / 2;
    var targetCenterX = normZero(2 * axisX - centerX);
    var deltaX = normZero(targetCenterX - centerX);
    var targetBounds = [
      normZero(2 * axisX - r),
      normZero(t),
      normZero(2 * axisX - l),
      normZero(b)
    ];

    return {
      targetCenterX: targetCenterX,
      deltaX: deltaX,
      targetBounds: targetBounds
    };
  }

  /**
   * 计算左右对称部件相对于中轴线 axisX 的偏差及对右侧部件的纠偏位移
   * @param {Array<number>} boundsL 左侧部件包围盒 [l,t,r,b]
   * @param {Array<number>} boundsR 右侧部件包围盒 [l,t,r,b]
   * @param {number} axisX 对称轴 X 坐标
   * @returns {{deltaX:number, deltaY:number, fixForR:{dx:number, dy:number}}} 偏差与纠偏向量
   */
  function calcSymmetryDeviation(boundsL, boundsR, axisX) {
    if (!isValidBounds(boundsL, true) || !isValidBounds(boundsR, true) || !isFiniteNum(axisX)) {
      throw new Error("AlignmentMath.calcSymmetryDeviation: invalid bounds or axisX");
    }
    var cxL = (boundsL[0] + boundsL[2]) / 2;
    var cyL = (boundsL[1] + boundsL[3]) / 2;
    var cxR = (boundsR[0] + boundsR[2]) / 2;
    var cyR = (boundsR[1] + boundsR[3]) / 2;

    var idealCxR = 2 * axisX - cxL;
    var deltaX = normZero(cxR - idealCxR);
    var deltaY = normZero(cyR - cyL);

    return {
      deltaX: deltaX,
      deltaY: deltaY,
      fixForR: {
        dx: normZero(-deltaX),
        dy: normZero(-deltaY)
      }
    };
  }

  /**
   * 获取包围盒指定 9 宫格锚点的二维坐标
   * @param {Array<number>} bounds [l,t,r,b]
   * @param {string} anchor 9 宫格锚点标识
   * @returns {{x:number, y:number}} 锚点坐标
   */
  function getAnchorPoint(bounds, anchor) {
    var l = bounds[0];
    var t = bounds[1];
    var r = bounds[2];
    var b = bounds[3];
    var cx = (l + r) / 2;
    var cy = (t + b) / 2;

    var vKey = anchor.charAt(0);
    var hKey = anchor.charAt(1);

    var x = hKey === "L" ? l : (hKey === "R" ? r : cx);
    var y = vKey === "T" ? t : (vKey === "B" ? b : cy);

    return { x: x, y: y };
  }

  /**
   * 计算 sourceBounds 按指定 9 宫格锚点对齐到 targetBounds 所需的平移向量
   * @param {Array<number>} sourceBounds 源图层包围盒
   * @param {Array<number>} targetBounds 基准图层包围盒
   * @param {string} [anchor="CC"] 9 宫格锚点（TL/TC/TR/CL/CC/CR/BL/BC/BR）
   * @returns {{dx:number, dy:number}} 平移偏移量
   */
  function calcNineGridOffset(sourceBounds, targetBounds, anchor) {
    var P = getPolyfill();
    if (!isValidBounds(sourceBounds, true) || !isValidBounds(targetBounds, true)) {
      throw new Error("AlignmentMath.calcNineGridOffset: invalid bounds");
    }

    var normAnchor = "CC";
    if (anchor !== undefined && anchor !== null) {
      var trimmed = P.trim(String(anchor));
      if (trimmed !== "") {
        normAnchor = trimmed.toUpperCase();
      }
    }
    if (P.indexOf(VALID_ANCHORS, normAnchor) === -1) {
      throw new Error("AlignmentMath.calcNineGridOffset: invalid anchor " + String(anchor));
    }

    var srcPt = getAnchorPoint(sourceBounds, normAnchor);
    var dstPt = getAnchorPoint(targetBounds, normAnchor);

    return {
      dx: normZero(dstPt.x - srcPt.x),
      dy: normZero(dstPt.y - srcPt.y)
    };
  }

  /**
   * 计算所有有效可见图层联合包围盒加上安全边距后的裁剪画布矩形
   * @param {number} docWidth 当前画布宽度
   * @param {number} docHeight 当前画布高度
   * @param {Array<Array<number>>} layerBoundsList 图层包围盒集合
   * @param {number} [padding=0] 安全边距（像素）
   * @returns {{bounds:Array<number>, changed:boolean}} 目标画布边界与是否发生收缩
   */
  function calcSafeCanvasBounds(docWidth, docHeight, layerBoundsList, padding) {
    var P = getPolyfill();
    if (!isFiniteNum(docWidth) || docWidth <= 0 || !isFiniteNum(docHeight) || docHeight <= 0) {
      throw new Error("AlignmentMath.calcSafeCanvasBounds: invalid document dimensions");
    }

    var pad = (isFiniteNum(padding) && padding > 0) ? Math.ceil(padding) : 0;
    var minL = Infinity;
    var minT = Infinity;
    var maxR = -Infinity;
    var maxB = -Infinity;
    var validCount = 0;

    if (P.isArray(layerBoundsList)) {
      var i;
      for (i = 0; i < layerBoundsList.length; i++) {
        var b = layerBoundsList[i];
        if (!isValidBounds(b, false)) {
          continue;
        }
        validCount++;
        if (b[0] < minL) { minL = b[0]; }
        if (b[1] < minT) { minT = b[1]; }
        if (b[2] > maxR) { maxR = b[2]; }
        if (b[3] > maxB) { maxB = b[3]; }
      }
    }

    if (validCount === 0) {
      return {
        bounds: [0, 0, docWidth, docHeight],
        changed: false
      };
    }

    var l = Math.max(0, Math.floor(minL) - pad);
    var t = Math.max(0, Math.floor(minT) - pad);
    var r = Math.min(docWidth, Math.ceil(maxR) + pad);
    var bVal = Math.min(docHeight, Math.ceil(maxB) + pad);

    if (l >= r || t >= bVal) {
      return {
        bounds: [0, 0, docWidth, docHeight],
        changed: false
      };
    }

    l = normZero(l);
    t = normZero(t);
    r = normZero(r);
    bVal = normZero(bVal);

    return {
      bounds: [l, t, r, bVal],
      changed: (l !== 0 || t !== 0 || r !== docWidth || bVal !== docHeight)
    };
  }

  PSSplitter.Core.AlignmentMath = {
    calcMirrorDelta: calcMirrorDelta,
    calcSymmetryDeviation: calcSymmetryDeviation,
    calcNineGridOffset: calcNineGridOffset,
    calcSafeCanvasBounds: calcSafeCanvasBounds
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = PSSplitter.Core.AlignmentMath;
  }
})();
