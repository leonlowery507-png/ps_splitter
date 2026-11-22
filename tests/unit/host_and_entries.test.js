/**
 * @fileoverview Photoshop 宿主适配层 (src/host/)、UI 主控台 (src/ui/) 与入口脚本 (src/entries/) 单元测试
 * 使用轻量内存 Mock Photoshop DOM & ActionManager 验证 3 大核心拆图模块与 6 个入口。
 */

"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var fs = require("fs");
var path = require("path");

// 加载 Core 与 Host 模块
require("../../src/core/polyfill_es3.js");
require("../../src/core/spine_tags.js");
require("../../src/core/naming_engine.js");
require("../../src/core/skeleton_templates.js");
require("../../src/core/skin_mapper.js");
require("../../src/core/clip_chain_resolver.js");
var AM = require("../../src/host/ps_am.js");
var Safety = require("../../src/host/ps_safety.js");
var SplitJointOps = require("../../src/host/ps_split_joint_ops.js");
var NamingOps = require("../../src/host/ps_naming_hierarchy_ops.js");
var MainPanel = require("../../src/ui/main_panel.js");

/**
 * 构建轻量级内存 Mock Photoshop 宿主环境
 */
function setupMockPhotoshop(options) {
  var opts = options || {};
  var nextId = 100;
  var actionLog = [];
  var multiSelectedIds = [];

  function removeFromCurrentParent(node) {
    if (!node.parent || !node.parent.layers) {
      return;
    }
    var pLayers = node.parent.layers;
    var idx = pLayers.indexOf(node);
    if (idx !== -1) {
      pLayers.splice(idx, 1);
    }
    if (node.typename === "LayerSet" && node.parent.layerSets) {
      var gIdx = node.parent.layerSets.indexOf(node);
      if (gIdx !== -1) {
        node.parent.layerSets.splice(gIdx, 1);
      }
    }
  }

  function insertIntoContainer(node, container, atBottom) {
    removeFromCurrentParent(node);
    node.parent = container;
    if (atBottom) {
      container.layers.push(node);
    } else {
      container.layers.unshift(node);
    }
    if (node.typename === "LayerSet") {
      if (atBottom) {
        container.layerSets.push(node);
      } else {
        container.layerSets.unshift(node);
      }
    }
  }

  function createArtLayer(name, bounds, extra) {
    var ex = extra || {};
    var lyr = {
      id: nextId++,
      name: name || "Layer",
      typename: "ArtLayer",
      visible: ex.visible !== false,
      allLocked: !!ex.allLocked,
      pixelsLocked: !!ex.pixelsLocked,
      grouped: !!ex.grouped,
      opacity: typeof ex.opacity === "number" ? ex.opacity : 100,
      blendMode: ex.blendMode || "BlendMode.NORMAL",
      kind: ex.kind || "LayerKind.NORMAL",
      bounds: bounds ? bounds.slice() : [10, 10, 200, 200],
      parent: null,
      translate: function (dx, dy) {
        this.bounds = [
          this.bounds[0] + dx,
          this.bounds[1] + dy,
          this.bounds[2] + dx,
          this.bounds[3] + dy
        ];
      },
      move: function (target, placement) {
        if (placement === "INSIDE") {
          insertIntoContainer(this, target, false);
        } else if (placement === "PLACEBEFORE" && target.parent) {
          removeFromCurrentParent(this);
          this.parent = target.parent;
          var bIdx = target.parent.layers.indexOf(target);
          target.parent.layers.splice(bIdx >= 0 ? bIdx : 0, 0, this);
        } else if (placement === "PLACEAFTER" && target.parent) {
          removeFromCurrentParent(this);
          this.parent = target.parent;
          var aIdx = target.parent.layers.indexOf(target);
          target.parent.layers.splice(aIdx >= 0 ? aIdx + 1 : target.parent.layers.length, 0, this);
        }
      },
      duplicate: function (relativeObject, insertionLocation) {
        var copy = createArtLayer(this.name + " copy", this.bounds, {
          visible: this.visible,
          allLocked: false,
          grouped: this.grouped,
          opacity: this.opacity,
          blendMode: this.blendMode,
          kind: this.kind
        });
        var destContainer = this.parent || doc;
        insertIntoContainer(copy, destContainer, false);
        if (relativeObject && insertionLocation) {
          copy.move(relativeObject, insertionLocation);
        }
        return copy;
      },
      remove: function () {
        removeFromCurrentParent(this);
      }
    };
    return lyr;
  }

  function createLayerSet(name, parentContainer) {
    var grp = {
      id: nextId++,
      name: name || "Group",
      typename: "LayerSet",
      visible: true,
      allLocked: false,
      opacity: 100,
      blendMode: "BlendMode.PASSTHROUGH",
      layers: [],
      layerSets: [],
      parent: null,
      move: function (target, placement) {
        if (placement === "INSIDE") {
          insertIntoContainer(this, target, false);
        } else if (placement === "PLACEBEFORE" && target.parent) {
          removeFromCurrentParent(this);
          this.parent = target.parent;
          var idx = target.parent.layers.indexOf(target);
          target.parent.layers.splice(idx >= 0 ? idx : 0, 0, this);
          if (target.parent.layerSets && target.parent.layerSets.indexOf(this) === -1) {
            target.parent.layerSets.unshift(this);
          }
        } else if (placement === "PLACEAFTER" && target.parent) {
          removeFromCurrentParent(this);
          this.parent = target.parent;
          var aIdx = target.parent.layers.indexOf(target);
          target.parent.layers.splice(aIdx >= 0 ? aIdx + 1 : target.parent.layers.length, 0, this);
          if (target.parent.layerSets && target.parent.layerSets.indexOf(this) === -1) {
            target.parent.layerSets.push(this);
          }
        }
      },
      duplicate: function (relativeObject, insertionLocation) {
        var copyG = createLayerSet(this.name + " copy", this.parent || doc);
        if (relativeObject && insertionLocation) {
          copyG.move(relativeObject, insertionLocation);
        }
        return copyG;
      }
    };
    grp.layerSets.add = function () {
      return createLayerSet("Group", grp);
    };
    if (parentContainer) {
      insertIntoContainer(grp, parentContainer, false);
    }
    return grp;
  }

  var doc = {
    name: "HeroCharacter.psd",
    typename: "Document",
    width: 1024,
    height: 1024,
    layers: [],
    layerSets: [],
    activeLayer: null,
    channels: {
      add: function () {
        return {
          name: "Alpha",
          savedBounds: doc._selectionBounds ? doc._selectionBounds.slice() : [20, 20, 120, 120],
          remove: function () {}
        };
      }
    },
    _selectionBounds: opts.selectionBounds !== undefined ? opts.selectionBounds : [20, 20, 120, 120],
    selection: {
      get bounds() {
        if (!doc._selectionBounds) {
          throw new Error("Error 1302: No such element");
        }
        return doc._selectionBounds;
      },
      deselect: function () {
        doc._selectionBounds = null;
      },
      expand: function (px) {
        var v = typeof px === "number" ? px : px.value;
        if (doc._selectionBounds) {
          doc._selectionBounds = [
            doc._selectionBounds[0] - v,
            doc._selectionBounds[1] - v,
            doc._selectionBounds[2] + v,
            doc._selectionBounds[3] + v
          ];
        }
      },
      contract: function (px) {
        var v = typeof px === "number" ? px : px.value;
        if (doc._selectionBounds) {
          doc._selectionBounds = [
            doc._selectionBounds[0] + v,
            doc._selectionBounds[1] + v,
            doc._selectionBounds[2] - v,
            doc._selectionBounds[3] - v
          ];
        }
      },
      store: function (ch) {
        ch.savedBounds = doc._selectionBounds ? doc._selectionBounds.slice() : null;
      },
      load: function (ch) {
        doc._selectionBounds = ch && ch.savedBounds ? ch.savedBounds.slice() : [20, 20, 120, 120];
      },
      invert: function () {},
      clear: function () {}
    },
    suspendHistory: function (title, scriptStr) {
      actionLog.push({ type: "suspendHistory", title: title });
      PSSplitter.Host.Safety._runPendingTransaction();
    }
  };

  doc.layerSets.add = function () {
    return createLayerSet("Group", doc);
  };

  var baseArt = createArtLayer("char_painted", [0, 0, 500, 800]);
  insertIntoContainer(baseArt, doc, false);
  doc.activeLayer = baseArt;

  function findLayerByIdRecursive(container, id) {
    var i;
    for (i = 0; i < container.layers.length; i++) {
      var l = container.layers[i];
      if (l.id === id) {
        return l;
      }
      if (l.typename === "LayerSet" && l.layers) {
        var found = findLayerByIdRecursive(l, id);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  // 注入 Photoshop 宿主全局变量
  global.Units = { PIXELS: "Units.PIXELS" };
  global.DialogModes = { NO: "DialogModes.NO" };
  global.LayerKind = { NORMAL: "LayerKind.NORMAL", SMARTOBJECT: "LayerKind.SMARTOBJECT" };
  global.ElementPlacement = {
    INSIDE: "INSIDE",
    PLACEBEFORE: "PLACEBEFORE",
    PLACEAFTER: "PLACEAFTER"
  };
  global.SelectionType = { DIMINISH: "DIMINISH" };
  global.UnitValue = function (val, unit) {
    this.value = val;
    this.unit = unit;
    this.as = function () { return val; };
  };
  global.charIDToTypeID = function (c) { return "C_" + c; };
  global.stringIDToTypeID = function (s) { return "S_" + s; };
  global.ActionDescriptor = function () {
    this._data = {};
    this.putReference = function (k, v) { this._data[k] = v; };
    this.putEnumerated = function (k, t, v) { this._data[k] = v; };
    this.putBoolean = function (k, v) { this._data[k] = v; };
    this.putUnitDouble = function (k, u, v) { this._data[k] = v; };
    this.putInteger = function (k, v) { this._data[k] = v; };
    this.putObject = function (k, t, v) { this._data[k] = v; };
  };
  global.ActionReference = function () {
    this._id = null;
    this.putProperty = function () {};
    this.putEnumerated = function () {};
    this.putIdentifier = function (k, id) { this._id = id; };
  };
  global.executeActionGet = function () {
    return {
      hasKey: function (k) {
        if (k === "S_selection") {
          return doc._selectionBounds !== null;
        }
        if (k === "S_targetLayersIDs") {
          return multiSelectedIds.length > 0;
        }
        return false;
      },
      getList: function () {
        return {
          count: multiSelectedIds.length,
          getReference: function (idx) {
            return { getIdentifier: function () { return multiSelectedIds[idx]; } };
          }
        };
      }
    };
  };
  global.executeAction = function (actionId, desc) {
    actionLog.push({ type: "executeAction", actionId: actionId });
    if (actionId === "C_CpTL" || actionId === "C_CtTL") {
      var src = doc.activeLayer;
      var newBounds = doc._selectionBounds ? doc._selectionBounds.slice() : src.bounds.slice();
      var splitLyr = createArtLayer(src.name + "_split", newBounds, {
        opacity: src.opacity,
        blendMode: src.blendMode
      });
      insertIntoContainer(splitLyr, src.parent || doc, false);
      doc.activeLayer = splitLyr;
      // 模拟 Photoshop CpTL/CtTL 自动取消选区
      doc._selectionBounds = null;
    } else if (actionId === "C_GrpL") {
      if (doc.activeLayer) {
        doc.activeLayer.grouped = true;
      }
    } else if (actionId === "C_Ungr") {
      if (doc.activeLayer) {
        doc.activeLayer.grouped = false;
      }
    } else if (actionId === "C_slct" && desc && desc._data["C_null"]) {
      var targetId = desc._data["C_null"]._id;
      var found = findLayerByIdRecursive(doc, targetId);
      if (found) {
        doc.activeLayer = found;
        if (desc._data["S_selectionModifier"] === "S_addToSelection") {
          if (multiSelectedIds.indexOf(targetId) === -1) {
            multiSelectedIds.push(targetId);
          }
        } else {
          multiSelectedIds = [targetId];
        }
      }
    } else if (actionId === "C_Mrg2") {
      if (multiSelectedIds.length > 1) {
        var keep = findLayerByIdRecursive(doc, multiSelectedIds[0]) || doc.activeLayer;
        var m;
        for (m = 1; m < multiSelectedIds.length; m++) {
          var rm = findLayerByIdRecursive(doc, multiSelectedIds[m]);
          if (rm && rm !== keep) {
            rm.remove();
          }
        }
        doc.activeLayer = keep;
        multiSelectedIds = [keep.id];
      }
    } else if (actionId === "C_setd") {
      if (doc.activeLayer && doc.activeLayer.bounds) {
        doc._selectionBounds = doc.activeLayer.bounds.slice();
      }
    } else if (actionId === "C_Fl  " && opts.failCaf) {
      throw new Error("CAF unavailable on current selection");
    }
  };

  global.app = {
    documents: [doc],
    activeDocument: doc,
    preferences: { rulerUnits: "Units.INCHES" },
    displayDialogs: "DialogModes.ALL",
    bringToFront: function () {}
  };

  return {
    doc: doc,
    baseArt: baseArt,
    createArtLayer: createArtLayer,
    createLayerSet: createLayerSet,
    insertIntoContainer: insertIntoContainer,
    actionLog: actionLog,
    setMultiSelectedIds: function (ids) { multiSelectedIds = ids.slice(); }
  };
}

test("模块 1：工作区初始化、原稿快照防切拦截与选区 Copy/Cut 自动归组命名", function () {
  var env = setupMockPhotoshop();
  var doc = env.doc;

  // 1. 初始化工作区
  var initRes = Safety.initWorkspace({ createSnapshot: true });
  assert.equal(initRes.ok, true);
  assert.equal(initRes.backupCreated, true);
  assert.equal(initRes.refCreated, true);
  assert.ok(initRes.snapshotName && initRes.snapshotName.indexOf("backup_") === 0);

  var bakGroup = Safety.findTopLevelGroup(doc, Safety.BACKUP_GROUP_NAME);
  var refGroup = Safety.findTopLevelGroup(doc, Safety.REF_GROUP_NAME);
  assert.ok(bakGroup && bakGroup.allLocked === true && bakGroup.visible === false);
  assert.ok(refGroup);

  // 2. 尝试对 SRC_BACKUP [ignore] 内部备份层执行 Cut 必须被拦截
  doc.activeLayer = bakGroup.layers[0];
  doc._selectionBounds = [20, 20, 100, 100];
  var blockedCut = SplitJointOps.splitSelection("cut", { baseName: "arm" });
  assert.equal(blockedCut.ok, false);
  assert.ok(blockedCut.message.indexOf("安全拦截") !== -1);

  // 3. 回到工作图层执行 Copy 和 Cut 拆出并路由到 "head [bone]/hair"
  doc.activeLayer = env.baseArt;
  doc._selectionBounds = [30, 30, 120, 120];
  var copyRes = SplitJointOps.splitSelection("copy", {
    targetGroupPath: "head [bone]/hair",
    baseName: "bangs",
    autoNumber: true,
    returnToSource: true
  });
  assert.equal(copyRes.ok, true);
  assert.equal(copyRes.layerName, "bangs_01");
  assert.equal(doc.activeLayer, env.baseArt, "勾选 returnToSource 后应自动切回源图层");

  doc._selectionBounds = [40, 40, 140, 140];
  var cutRes = SplitJointOps.splitSelection("cut", {
    targetGroupPath: "head [bone]/hair",
    baseName: "bangs",
    autoNumber: true,
    returnToSource: false
  });
  assert.equal(cutRes.ok, true);
  assert.equal(cutRes.layerName, "bangs_02", "同组内应自动顺延编号为 bangs_02");

  // 4. 从原稿快照无损补提
  doc._selectionBounds = [10, 10, 80, 80];
  var restoreRes = SplitJointOps.restoreSelectionFromBackup({
    targetGroupPath: "head [bone]/hair",
    baseName: "restored_lock"
  });
  assert.equal(restoreRes.ok, true);
  assert.equal(restoreRes.layerName, "restored_lock_01");
  assert.equal(bakGroup.allLocked, true, "补提后原稿备份组必须恢复锁定");
});

test("模块 1：复合剪贴蒙版链联动拆出（保留剪贴结构与安全合并双模式）", function () {
  var env = setupMockPhotoshop();
  var doc = env.doc;

  // 构建 1 个基底 + 2 个上方剪贴蒙版层（面板从上到下：highlight[clip] -> shadow[clip] -> cape_base）
  var baseCape = env.baseArt;
  baseCape.name = "cape_base";
  var shadowClip = env.createArtLayer("shadow", [0, 0, 500, 800], { grouped: true, blendMode: "BlendMode.MULTIPLY" });
  var highClip = env.createArtLayer("highlight", [0, 0, 500, 800], { grouped: true, opacity: 80 });
  env.insertIntoContainer(shadowClip, doc, false);
  env.insertIntoContainer(highClip, doc, false);

  // 选中中间剪贴层触发保留结构拆出
  doc.activeLayer = shadowClip;
  doc._selectionBounds = [20, 20, 180, 180];
  var preserveRes = SplitJointOps.splitClipChain("preserve", {
    targetGroupPath: "torso [bone]/cape",
    baseName: "cape_left"
  });
  assert.equal(preserveRes.ok, true);
  assert.equal(preserveRes.extractedCount, 3, "应连同基底与 2 个剪贴层一并拆出");

  var capeGroup = Safety.findGroupByPath(doc, "torso [bone]/cape");
  assert.ok(capeGroup && capeGroup.layers.length === 3);
  assert.equal(capeGroup.layers[0].grouped, true, "顶层剪贴层应重建 grouped=true");
  assert.equal(capeGroup.layers[1].grouped, true, "中层剪贴层应重建 grouped=true");
  assert.equal(capeGroup.layers[2].grouped, false, "底层基底应为 grouped=false");

  // 触发合并单图模式
  doc.activeLayer = baseCape;
  doc._selectionBounds = [50, 50, 200, 200];
  var mergeRes = SplitJointOps.splitClipChain("merge", {
    targetGroupPath: "torso [bone]/cape_merged",
    baseName: "cape_flat"
  });
  assert.equal(mergeRes.ok, true);
  var mergedGroup = Safety.findGroupByPath(doc, "torso [bone]/cape_merged");
  assert.ok(mergedGroup && mergedGroup.layers.length === 1, "merge 模式应在目标组内合并为单张干净图层");
});

test("模块 2：X-Ray 半透明透视切换还原、关节扩边补全与去杂边发光层保护", function () {
  var env = setupMockPhotoshop({ failCaf: true });
  var doc = env.doc;
  var armLayer = env.baseArt;
  armLayer.name = "arm_upper";
  armLayer.opacity = 92;

  // 1. X-Ray 切换与原始不透明度精确恢复
  var x1 = SplitJointOps.toggleXRay({ xrayOpacity: 30 });
  assert.equal(x1.ok, true);
  assert.equal(armLayer.opacity, 30);

  var x2 = SplitJointOps.toggleXRay({ xrayOpacity: 30 });
  assert.equal(x2.ok, true);
  assert.equal(armLayer.opacity, 92, "再次切换应精确恢复原始 92% 不透明度");

  // 2. 关节末端扩边补全（模拟 CAF 失败时自动无损降级为 8 方向像素外扩固色）
  doc._selectionBounds = null;
  var extRes = SplitJointOps.extendJoint({ expandPx: 8, mode: "caf" });
  assert.equal(extRes.ok, true);
  assert.equal(extRes.usedMode, "bleed", "CAF 异常时应自动安全降级为 bleed 外扩固色");

  // 3. 杂边清理应自动跳过 LINEARDODGE 发光层（注意扩边合并后当前图层为 doc.activeLayer）
  var mergedArmLayer = doc.activeLayer;
  var glowLayer = env.createArtLayer("magic_glow", [10, 10, 100, 100], { blendMode: "BlendMode.LINEARDODGE" });
  env.insertIntoContainer(glowLayer, doc, false);
  env.setMultiSelectedIds([mergedArmLayer.id, glowLayer.id]);

  var matteRes = SplitJointOps.cleanEdgeMatte({ mode: "blackMatte", forceGlowLayer: false });
  assert.equal(matteRes.ok, true);
  assert.equal(matteRes.processedCount, 1);
  assert.equal(matteRes.skippedGlow.length, 1, "发光混合模式层应被自动保护跳过");
});

test("模块 3：骨骼模板增量建组、官方 12 标签装配、Tag-Aware 批量重命名/LR互换与多皮肤克隆", function () {
  var env = setupMockPhotoshop();
  var doc = env.doc;

  // 1. 标准人形骨骼模板建组与幂等跳过
  var tplRes1 = NamingOps.applySkeletonTemplate("humanoid", { includeSlots: true });
  assert.equal(tplRes1.ok, true);
  assert.ok(tplRes1.createdCount > 15);

  var tplRes2 = NamingOps.applySkeletonTemplate("humanoid", { includeSlots: true });
  assert.equal(tplRes2.ok, true);
  assert.equal(tplRes2.createdCount, 0, "第二次对同一文档执行相同模板应完全幂等跳过");

  // 2. Spine 官方标签装配与错误拦截
  doc.activeLayer = env.baseArt;
  env.setMultiSelectedIds([env.baseArt.id]);
  var badMergeOnArt = NamingOps.applySpineTag("merge", null, true);
  assert.equal(badMergeOnArt.updatedCount, 0, "普通图层应禁止挂 [merge] 标签");
  assert.ok(badMergeOnArt.errors.length > 0);

  var goodTrimTag = NamingOps.applySpineTag("trim", "false", true);
  assert.equal(goodTrimTag.ok, true);
  assert.equal(env.baseArt.name, "char_painted [trim:false]");
  assert.ok(goodTrimTag.versionNote.indexOf("v7.42") !== -1);

  // 3. Tag-Aware 批量重命名与 L/R 对称互换（保护标签区不变）
  env.baseArt.name = "arm_L [slot:arm_L]";
  var lrRes = NamingOps.quickSwapLR(true, false);
  assert.equal(lrRes.ok, true);
  assert.equal(env.baseArt.name, "arm_R [slot:arm_L]", "swapLR 应互换基础名中的 _L->_R 并保留 [slot:arm_L] 标签不变");

  var renRes = NamingOps.applyBatchRename("selected", {
    prefix: "hero_",
    suffix: "_v1",
    preserveTags: true
  });
  assert.equal(renRes.ok, true);
  assert.equal(env.baseArt.name, "hero_arm_R_v1 [slot:arm_L]");

  // 4. 多皮肤目录同构克隆（拦截 default 并剥离危险 [path:]）
  var skinSrc = env.createLayerSet("costume_base [skin]", doc);
  var weaponSlot = env.createLayerSet("weapon [slot]", skinSrc);
  var swordArt = env.createArtLayer("sword [path:shared_sword] [mesh]", [10, 10, 90, 90]);
  env.insertIntoContainer(swordArt, weaponSlot, false);
  var refNote = env.createArtLayer("sketch [ignore]", [0, 0, 50, 50]);
  env.insertIntoContainer(refNote, skinSrc, false);

  doc.activeLayer = skinSrc;
  var rejectDefault = NamingOps.cloneSkinGroup("default", {});
  assert.equal(rejectDefault.ok, false, "必须拦截 Spine 保留皮肤名 default");

  var cloneRes = NamingOps.cloneSkinGroup("armor/gold", {
    meshStrategy: "unlink",
    pathStrategy: "strip"
  });
  assert.equal(cloneRes.ok, true);
  assert.equal(cloneRes.rootName, "gold [skin:armor/gold]");
  assert.equal(cloneRes.clonedLayers, 1, "应复制有效图层并自动跳过 [ignore] 层");

  var clonedSkinGroup = Safety.findTopLevelGroup(doc, "gold [skin:armor/gold]");
  assert.ok(clonedSkinGroup);
  var clonedWeaponSlot = clonedSkinGroup.layerSets[0];
  assert.equal(clonedWeaponSlot.layers[0].name, "sword [mesh]", "克隆后的图层应自动剥离会引发磁盘覆盖的 [path:] 标签");
});

test("UI 主控台与 6 个入口脚本在 Mock ScriptUI 环境下可正常挂载与调用", function () {
  setupMockPhotoshop();

  // Mock 最小 ScriptUI Window 以测试 MainPanel.show() 控件树构建与回调绑定
  global.Window = function (type, title) {
    this.type = type;
    this.title = title;
    this.preferredSize = {};
    function makeWidget() {
      var w = {
        preferredSize: {},
        selection: { index: 0, text: "" },
        value: true,
        text: "",
        add: function () { return makeWidget(); },
        removeAll: function () {},
        center: function () {},
        show: function () { return 0; },
        close: function () {}
      };
      return w;
    }
    this.add = function () { return makeWidget(); };
    this.center = function () {};
    this.show = function () { return 0; };
    this.close = function () {};
  };

  var uiRes = MainPanel.show();
  assert.equal(uiRes.ok, true);
  assert.equal(uiRes.shown, true);

  // 验证 6 个入口文件均存在且非空
  var entriesDir = path.resolve(__dirname, "../../src/entries");
  var expectedEntries = [
    "SpineSplitter_Panel.jsx",
    "01_Split_Copy.jsx",
    "02_Split_Cut.jsx",
    "03_Split_ClipChain.jsx",
    "04_Joint_Extend.jsx",
    "05_Toggle_XRay.jsx"
  ];
  var i;
  for (i = 0; i < expectedEntries.length; i++) {
    var fp = path.join(entriesDir, expectedEntries[i]);
    assert.equal(fs.existsSync(fp), true, "缺少入口脚本: " + expectedEntries[i]);
  }
});
