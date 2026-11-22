/**
 * @fileoverview Photoshop 安全事务、保护快照组与文档快照捕获模块（PSSplitter.Host.Safety）
 * 负责文档守卫、像素单位保护、单步 suspendHistory 事务、SRC_BACKUP/__REF__ [ignore] 保护区管理与会话状态记忆。
 */

(function () {
  var rootScope = (typeof $ !== "undefined" && $.global)
    ? $.global
    : (typeof global !== "undefined" ? global : (function () { return this; }()));
  rootScope.PSSplitter = rootScope.PSSplitter || {};
  rootScope.PSSplitter.Host = rootScope.PSSplitter.Host || {};
  var PSSplitter = rootScope.PSSplitter;

  var BACKUP_GROUP_NAME = "SRC_BACKUP [ignore]";
  var REF_GROUP_NAME = "__REF__ [ignore]";

  function getPolyfill() {
    if (PSSplitter && PSSplitter.Core && PSSplitter.Core.Polyfill) {
      return PSSplitter.Core.Polyfill;
    }
    if (typeof require === "function") {
      return require("../core/polyfill_es3.js");
    }
    throw new Error("PSSplitter.Core.Polyfill 未加载");
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

  /**
   * 获取或初始化当前会话状态（同一 PS 会话内跨脚本共享）
   * @returns {Object} 会话状态对象
   */
  function getSessionState() {
    if (!rootScope.__PSSplitterSessionState) {
      rootScope.__PSSplitterSessionState = {
        lastTargetGroupPath: "",
        lastBaseName: "part",
        splitCounter: 1,
        returnToSource: true,
        lastJointExpandPx: 10,
        lastJointMode: "caf",
        lastXRayOpacity: 35,
        xraySavedOpacity: {}
      };
    }
    return rootScope.__PSSplitterSessionState;
  }

  /**
   * 校验并返回当前活动文档
   * @returns {Object} Photoshop activeDocument
   */
  function ensureActiveDocument() {
    if (typeof app === "undefined" || !app.documents || app.documents.length === 0) {
      throw new Error("当前没有打开的 Photoshop 文档，请先打开角色原画 PSD 文件。");
    }
    return app.activeDocument;
  }

  /**
   * 判断节点是否为图层组（LayerSet）
   * @param {Object} layer Photoshop Layer
   * @returns {boolean} 是否为图层组
   */
  function isLayerSet(layer) {
    if (!layer) {
      return false;
    }
    if (layer.typename === "LayerSet") {
      return true;
    }
    if (typeof LayerSet !== "undefined" && layer instanceof LayerSet) {
      return true;
    }
    return false;
  }

  /**
   * 生成 HHMMSS 时间戳字符串（ES3 兼容）
   * @returns {string} 例如 "183045"
   */
  function formatTimeStamp() {
    var d = new Date();
    function pad2(n) {
      return n < 10 ? "0" + String(n) : String(n);
    }
    return pad2(d.getHours()) + pad2(d.getMinutes()) + pad2(d.getSeconds());
  }

  /**
   * 检查给定图层是否位于指定名称的祖先组内（忽略大小写）
   * @param {Object} layer 目标图层或组
   * @param {string} targetGroupName 目标祖先组名
   * @returns {boolean} 是否位于该组内
   */
  function isInsideGroupByName(layer, targetGroupName) {
    var P = getPolyfill();
    if (!layer || !targetGroupName) {
      return false;
    }
    var targetLower = P.trim(String(targetGroupName)).toLowerCase();
    var cursor = layer;
    var guard = 0;
    while (cursor && guard < 128) {
      guard++;
      var curName = cursor.name ? P.trim(String(cursor.name)).toLowerCase() : "";
      if (isLayerSet(cursor) && curName === targetLower) {
        return true;
      }
      if (!cursor.parent || cursor.parent.typename === "Document") {
        break;
      }
      cursor = cursor.parent;
    }
    return false;
  }

  /**
   * 检查图层是否处于任意层级锁定状态（自身或父组锁定）
   * @param {Object} layer 目标图层
   * @returns {boolean} 是否被锁定
   */
  function isEffectivelyLocked(layer) {
    var cursor = layer;
    var guard = 0;
    while (cursor && guard < 128) {
      guard++;
      if (cursor.allLocked === true || cursor.pixelsLocked === true) {
        return true;
      }
      if (!cursor.parent || cursor.parent.typename === "Document") {
        break;
      }
      cursor = cursor.parent;
    }
    return false;
  }

  /**
   * 在文档顶层查找指定名称的图层组（大小写不敏感）
   * @param {Object} doc Photoshop Document
   * @param {string} groupName 组名
   * @returns {Object|null} 找到的 LayerSet 或 null
   */
  function findTopLevelGroup(doc, groupName) {
    var P = getPolyfill();
    if (!doc || !doc.layerSets) {
      return null;
    }
    var targetLower = P.trim(String(groupName)).toLowerCase();
    var i;
    for (i = 0; i < doc.layerSets.length; i++) {
      var g = doc.layerSets[i];
      if (g && P.trim(String(g.name)).toLowerCase() === targetLower) {
        return g;
      }
    }
    return null;
  }

  /**
   * 按斜杠路径（如 "head [bone]/eyes [slot]"）查找已有图层组
   * @param {Object} doc Photoshop Document
   * @param {string} pathStr 组路径
   * @returns {Object|null} LayerSet 或 null
   */
  function findGroupByPath(doc, pathStr) {
    var P = getPolyfill();
    if (!doc || !pathStr) {
      return null;
    }
    var trimmed = P.trim(String(pathStr));
    if (trimmed === "") {
      return null;
    }
    var segs = trimmed.split("/");
    var container = doc;
    var i;
    for (i = 0; i < segs.length; i++) {
      var seg = P.trim(segs[i]);
      if (seg === "") {
        continue;
      }
      var segLower = seg.toLowerCase();
      var found = null;
      var j;
      for (j = 0; j < container.layerSets.length; j++) {
        var childGroup = container.layerSets[j];
        if (childGroup && P.trim(String(childGroup.name)).toLowerCase() === segLower) {
          found = childGroup;
          break;
        }
      }
      if (!found) {
        return null;
      }
      container = found;
    }
    return container === doc ? null : container;
  }

  /**
   * 递归按路径查找或自动创建目标图层组
   * @param {Object} doc Photoshop Document
   * @param {string} pathStr 组路径（如 "arm_front [bone:arm_L]/hand_L"）
   * @returns {Object|null} 目标 LayerSet
   */
  function ensureGroupByPath(doc, pathStr) {
    var P = getPolyfill();
    if (!doc || !pathStr) {
      return null;
    }
    var trimmed = P.trim(String(pathStr));
    if (trimmed === "") {
      return null;
    }
    var segs = trimmed.split("/");
    var container = doc;
    var i;
    for (i = 0; i < segs.length; i++) {
      var seg = P.trim(segs[i]);
      if (seg === "") {
        continue;
      }
      var segLower = seg.toLowerCase();
      var found = null;
      var j;
      for (j = 0; j < container.layerSets.length; j++) {
        var childGroup = container.layerSets[j];
        if (childGroup && P.trim(String(childGroup.name)).toLowerCase() === segLower) {
          found = childGroup;
          break;
        }
      }
      if (!found) {
        found = container.layerSets.add();
        found.name = seg;
      }
      container = found;
    }
    return container === doc ? null : container;
  }

  /**
   * 枚举文档中所有非保护区图层组路径（供主面板目标归组下拉列表使用）
   * @param {Object} doc Photoshop Document
   * @param {boolean} [includeProtected] 是否包含 SRC_BACKUP / __REF__
   * @returns {Array<string>} 组路径列表
   */
  function listAllGroupPaths(doc, includeProtected) {
    var P = getPolyfill();
    var out = [];
    if (!doc || !doc.layers) {
      return out;
    }
    var bakLower = BACKUP_GROUP_NAME.toLowerCase();
    var refLower = REF_GROUP_NAME.toLowerCase();

    function walk(layers, prefix) {
      var i;
      for (i = 0; i < layers.length; i++) {
        var lyr = layers[i];
        if (!isLayerSet(lyr)) {
          continue;
        }
        var lower = P.trim(String(lyr.name)).toLowerCase();
        if (!includeProtected && (lower === bakLower || lower === refLower)) {
          continue;
        }
        var curPath = prefix ? (prefix + "/" + lyr.name) : lyr.name;
        out.push(curPath);
        if (lyr.layers && lyr.layers.length > 0) {
          walk(lyr.layers, curPath);
        }
      }
    }

    walk(doc.layers, "");
    return out;
  }

  /**
   * 规范化 Photoshop BlendMode 枚举为标准大写字符串
   * @param {*} mode BlendMode 对象或字符串
   * @returns {string} 例如 "NORMAL", "LINEARDODGE", "PASSTHROUGH"
   */
  function normalizeBlendMode(mode) {
    if (!mode) {
      return "NORMAL";
    }
    var raw = String(mode);
    var dotIdx = raw.lastIndexOf(".");
    if (dotIdx !== -1) {
      raw = raw.slice(dotIdx + 1);
    }
    return raw.toUpperCase();
  }

  /**
   * 捕获当前 Photoshop 文档的轻量虚拟快照树与 ID 映射索引
   * @param {Object} doc Photoshop Document
   * @returns {{virtualDoc:Object, idMap:Object, parentMap:Object, pathMap:Object}} 快照包
   */
  function captureVirtualDoc(doc) {
    var AM = getAM();
    var idMap = {};
    var parentMap = {};
    var pathMap = {};
    var totalCount = 0;

    function walkLayers(layerCollection, parentId, pathPrefix) {
      var arr = [];
      var i;
      for (i = 0; i < layerCollection.length; i++) {
        var lyr = layerCollection[i];
        totalCount++;
        var lyrId = typeof lyr.id === "number" ? lyr.id : totalCount;
        var isGrp = isLayerSet(lyr);
        var curPath = pathPrefix ? (pathPrefix + "/" + lyr.name) : lyr.name;
        idMap[String(lyrId)] = lyr;
        parentMap[String(lyrId)] = parentId;
        pathMap[String(lyrId)] = curPath;

        var node = {
          id: lyrId,
          name: String(lyr.name),
          type: isGrp ? "LayerSet" : "ArtLayer",
          isGroup: isGrp,
          parentId: parentId,
          visible: lyr.visible !== false,
          allLocked: lyr.allLocked === true,
          grouped: !isGrp && lyr.grouped === true,
          blendMode: normalizeBlendMode(lyr.blendMode),
          opacity: typeof lyr.opacity === "number" ? lyr.opacity : 100,
          bounds: isGrp ? [0, 0, 0, 0] : AM.getLayerBoundsPx(lyr),
          isEmpty: isGrp ? false : AM.isLayerEmpty(lyr)
        };
        if (isGrp) {
          node.children = walkLayers(lyr.layers, lyrId, curPath);
        }
        arr.push(node);
      }
      return arr;
    }

    var layersTree = walkLayers(doc.layers, null, "");
    var virtualDoc = {
      name: String(doc.name || "Untitled.psd"),
      width: AM.toPx(doc.width),
      height: AM.toPx(doc.height),
      totalLayerCount: totalCount,
      layers: layersTree
    };

    return {
      virtualDoc: virtualDoc,
      idMap: idMap,
      parentMap: parentMap,
      pathMap: pathMap
    };
  }

  // suspendHistory 同步事务内部槽位
  var _txState = {
    fn: null,
    result: null,
    error: null
  };

  /**
   * 供 doc.suspendHistory 字符串回调执行的内部入口
   */
  function _runPendingTransaction() {
    try {
      if (typeof _txState.fn === "function") {
        _txState.result = _txState.fn();
      }
    } catch (e) {
      _txState.error = e;
    }
  }

  /**
   * 以像素标尺保护 + 单步 suspendHistory 事务执行 Photoshop 修改操作（支持一次 Ctrl+Z 撤回）
   * @param {Object} doc Photoshop Document
   * @param {string} historyTitle 显示在 Photoshop 历史记录面板的操作名称
   * @param {Function} fn 事务体函数
   * @returns {*} 事务体返回值
   */
  function runTransaction(doc, historyTitle, fn) {
    var prevUnits = null;
    var prevDialogs = null;
    var hasApp = typeof app !== "undefined";

    if (hasApp && app.preferences) {
      prevUnits = app.preferences.rulerUnits;
      if (typeof Units !== "undefined" && Units.PIXELS) {
        app.preferences.rulerUnits = Units.PIXELS;
      }
    }
    if (hasApp && typeof DialogModes !== "undefined") {
      prevDialogs = app.displayDialogs;
      app.displayDialogs = DialogModes.NO;
    }

    _txState.fn = fn;
    _txState.result = null;
    _txState.error = null;

    try {
      if (doc && typeof doc.suspendHistory === "function") {
        doc.suspendHistory(
          String(historyTitle || "SpineSplitter 操作"),
          "PSSplitter.Host.Safety._runPendingTransaction()"
        );
      } else {
        _runPendingTransaction();
      }
      if (_txState.error !== null) {
        throw _txState.error;
      }
      return _txState.result;
    } finally {
      _txState.fn = null;
      _txState.error = null;
      if (hasApp && app.preferences && prevUnits !== null) {
        app.preferences.rulerUnits = prevUnits;
      }
      if (hasApp && prevDialogs !== null) {
        app.displayDialogs = prevDialogs;
      }
    }
  }

  /**
   * 确保文档顶部存在参考隔离区 __REF__ [ignore]
   * @param {Object} doc Photoshop Document
   * @returns {{group:Object, created:boolean}} 组引用与是否新建
   */
  function ensureRefGroup(doc) {
    var AM = getAM();
    var existing = findTopLevelGroup(doc, REF_GROUP_NAME);
    if (existing) {
      return { group: existing, created: false };
    }
    var refGroup = doc.layerSets.add();
    refGroup.name = REF_GROUP_NAME;
    try {
      if (doc.layers.length > 1 && typeof ElementPlacement !== "undefined") {
        refGroup.move(doc.layers[0], ElementPlacement.PLACEBEFORE);
      }
    } catch (eMove) {
      // 已在顶层则忽略
    }
    try {
      doc.activeLayer = refGroup;
      AM.setLayerColorLabel("Bl  ");
    } catch (eClr) {
      // 忽略颜色标签失败
    }
    return { group: refGroup, created: true };
  }

  /**
   * 确保文档底部存在原稿只读保护组 SRC_BACKUP [ignore]，并可安全追加带时间戳的备份副本（绝不覆盖旧备份）
   * @param {Object} doc Photoshop Document
   * @param {Object} [options] { createSnapshot?:boolean, snapshotSourceLayer?:Object }
   * @returns {{group:Object, createdGroup:boolean, snapshotName:string|null}} 操作摘要
   */
  function ensureBackupGroup(doc, options) {
    var AM = getAM();
    var opts = options || {};
    var createSnapshot = opts.createSnapshot !== false;
    var bakGroup = findTopLevelGroup(doc, BACKUP_GROUP_NAME);
    var createdGroup = false;
    var wasLocked = false;

    if (!bakGroup) {
      bakGroup = doc.layerSets.add();
      bakGroup.name = BACKUP_GROUP_NAME;
      createdGroup = true;
      try {
        var bottomLayer = doc.layers[doc.layers.length - 1];
        if (bottomLayer && bottomLayer !== bakGroup && typeof ElementPlacement !== "undefined") {
          if (bottomLayer.isBackgroundLayer) {
            bakGroup.move(bottomLayer, ElementPlacement.PLACEBEFORE);
          } else {
            bakGroup.move(bottomLayer, ElementPlacement.PLACEAFTER);
          }
        }
      } catch (eMove) {
        // 忽略移动限制
      }
      try {
        doc.activeLayer = bakGroup;
        AM.setLayerColorLabel("Rd  ");
      } catch (eClr) {
        // 忽略颜色标签异常
      }
    } else if (bakGroup.allLocked) {
      wasLocked = true;
      bakGroup.allLocked = false;
    }

    var snapshotName = null;
    if (createSnapshot) {
      var source = opts.snapshotSourceLayer || doc.activeLayer;
      // 如果当前选中的正好是保护组自身，则从第一个非保护可见层中寻找源层
      if (!source || isInsideGroupByName(source, BACKUP_GROUP_NAME) || isInsideGroupByName(source, REF_GROUP_NAME)) {
        source = null;
        var k;
        for (k = 0; k < doc.layers.length; k++) {
          var cand = doc.layers[k];
          if (cand !== bakGroup && !isInsideGroupByName(cand, REF_GROUP_NAME) && cand.visible) {
            source = cand;
            break;
          }
        }
      }

      if (source) {
        var prevSourceLocked = source.allLocked;
        if (prevSourceLocked) {
          source.allLocked = false;
        }
        try {
          var dup;
          if (typeof ElementPlacement !== "undefined") {
            dup = source.duplicate(bakGroup, ElementPlacement.INSIDE);
          } else {
            dup = source.duplicate();
          }
          snapshotName = "backup_" + formatTimeStamp() + "_" + source.name;
          dup.name = snapshotName;
          dup.visible = true;
          dup.allLocked = true;
        } finally {
          if (prevSourceLocked) {
            source.allLocked = true;
          }
        }
      }
    }

    bakGroup.visible = false;
    bakGroup.allLocked = true;

    return {
      group: bakGroup,
      createdGroup: createdGroup,
      wasLocked: wasLocked,
      snapshotName: snapshotName
    };
  }

  /**
   * 一键初始化拆图安全工作区（创建/检查 SRC_BACKUP [ignore] 原稿快照与 __REF__ [ignore] 隔离区）
   * @param {Object} [options] { createSnapshot?:boolean }
   * @returns {{ok:boolean, backupCreated:boolean, refCreated:boolean, snapshotName:string|null, message:string}} 初始化结果
   */
  function initWorkspace(options) {
    var doc = ensureActiveDocument();
    var opts = options || {};
    var prevActive = doc.activeLayer;
    return runTransaction(doc, "SpineSplitter: 初始化拆图安全工作区", function () {
      var bakRes = ensureBackupGroup(doc, {
        createSnapshot: opts.createSnapshot !== false,
        snapshotSourceLayer: prevActive
      });
      var refRes = ensureRefGroup(doc);
      // 尽量恢复原先正在编辑的工作图层
      try {
        if (prevActive && !isInsideGroupByName(prevActive, BACKUP_GROUP_NAME)) {
          doc.activeLayer = prevActive;
        }
      } catch (eSel) {
        // 忽略恢复选中异常
      }
      var msg = "工作区已就绪：";
      msg += bakRes.snapshotName
        ? ("已追加只读原稿备份「" + bakRes.snapshotName + "」至 " + BACKUP_GROUP_NAME)
        : ("已确认保护组 " + BACKUP_GROUP_NAME);
      msg += "；参考隔离区 " + REF_GROUP_NAME + (refRes.created ? " 已新建。" : " 已存在。");
      return {
        ok: true,
        backupCreated: bakRes.createdGroup,
        refCreated: refRes.created,
        snapshotName: bakRes.snapshotName,
        message: msg
      };
    });
  }

  PSSplitter.Host.Safety = {
    BACKUP_GROUP_NAME: BACKUP_GROUP_NAME,
    REF_GROUP_NAME: REF_GROUP_NAME,
    getSessionState: getSessionState,
    ensureActiveDocument: ensureActiveDocument,
    isLayerSet: isLayerSet,
    isInsideGroupByName: isInsideGroupByName,
    isEffectivelyLocked: isEffectivelyLocked,
    findTopLevelGroup: findTopLevelGroup,
    findGroupByPath: findGroupByPath,
    ensureGroupByPath: ensureGroupByPath,
    listAllGroupPaths: listAllGroupPaths,
    normalizeBlendMode: normalizeBlendMode,
    captureVirtualDoc: captureVirtualDoc,
    runTransaction: runTransaction,
    _runPendingTransaction: _runPendingTransaction,
    ensureRefGroup: ensureRefGroup,
    ensureBackupGroup: ensureBackupGroup,
    initWorkspace: initWorkspace
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = PSSplitter.Host.Safety;
  }
})();
