/**
 * @fileoverview Photoshop 剪贴蒙版链条扫描与边界解析器（PSSplitter.Core.ClipChainResolver）
 * 遵循 PS 图层面板从上到下排序（index 0 为最顶层），向下方定位基底并向上连续收集 grouped===true 子层。
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

  function makeFailResult(errCode) {
    return {
      ok: false,
      baseIndex: -1,
      baseNode: null,
      clipIndices: [],
      clipNodes: [],
      topIndex: -1,
      bottomIndex: -1,
      hiddenIndices: [],
      error: errCode
    };
  }

  /**
   * 解析选中节点所在的完整剪贴蒙版链条（包含基底与所有附着于其上的剪贴子层）
   * @param {Array<Object>} siblingNodes 同一父层级下从上到下排序的兄弟节点列表
   * @param {number} selectedIndex 当前选中节点在 siblingNodes 中的索引
   * @returns {{ok:boolean, baseIndex:number, baseNode:Object|null, clipIndices:Array<number>, clipNodes:Array<Object>, topIndex:number, bottomIndex:number, hiddenIndices:Array<number>, error:string|null}}
   */
  function findClipChain(siblingNodes, selectedIndex) {
    var P = getPolyfill();

    if (!P.isArray(siblingNodes) || siblingNodes.length === 0) {
      return makeFailResult("EMPTY_SIBLINGS");
    }

    if (typeof selectedIndex !== "number" ||
      isNaN(selectedIndex) ||
      !isFinite(selectedIndex) ||
      Math.floor(selectedIndex) !== selectedIndex ||
      selectedIndex < 0 ||
      selectedIndex >= siblingNodes.length) {
      return makeFailResult("INDEX_OUT_OF_RANGE");
    }

    if (!siblingNodes[selectedIndex]) {
      return makeFailResult("INVALID_NODE");
    }

    // 1. 向下定位基底图层（grouped !== true）
    var cursor = selectedIndex;
    while (cursor < siblingNodes.length && siblingNodes[cursor] && siblingNodes[cursor].grouped === true) {
      cursor++;
    }

    if (cursor >= siblingNodes.length) {
      return makeFailResult("NO_BASE_LAYER");
    }
    if (!siblingNodes[cursor]) {
      return makeFailResult("INVALID_NODE");
    }

    var baseIndex = cursor;
    var baseNode = siblingNodes[baseIndex];

    // 2. 从基底上方连续向上收集 grouped === true 的剪贴层
    var revIndices = [];
    var i;
    for (i = baseIndex - 1; i >= 0; i--) {
      var candidate = siblingNodes[i];
      if (candidate && candidate.grouped === true) {
        revIndices.push(i);
      } else {
        break;
      }
    }

    // 反转为 index 升序（从上到下面板顺序）
    var clipIndices = [];
    var clipNodes = [];
    for (i = revIndices.length - 1; i >= 0; i--) {
      var idx = revIndices[i];
      clipIndices.push(idx);
      clipNodes.push(siblingNodes[idx]);
    }

    var topIndex = clipIndices.length > 0 ? clipIndices[0] : baseIndex;
    var bottomIndex = baseIndex;
    var hiddenIndices = [];
    for (i = topIndex; i <= bottomIndex; i++) {
      if (siblingNodes[i] && siblingNodes[i].visible === false) {
        hiddenIndices.push(i);
      }
    }

    return {
      ok: true,
      baseIndex: baseIndex,
      baseNode: baseNode,
      clipIndices: clipIndices,
      clipNodes: clipNodes,
      topIndex: topIndex,
      bottomIndex: bottomIndex,
      hiddenIndices: hiddenIndices,
      error: null
    };
  }

  PSSplitter.Core.ClipChainResolver = {
    findClipChain: findClipChain
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = PSSplitter.Core.ClipChainResolver;
  }
})();
