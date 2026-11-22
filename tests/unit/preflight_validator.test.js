/**
 * @fileoverview PreflightValidator 模块单元测试 (preflight_validator.js)
 * 完整覆盖 10 条前置输入契约与 [ignore] 作用域隔离、大小写碰撞、500层阈值及 Mesh 环检测。
 */

"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var PreflightValidator = require("../../src/core/preflight_validator.js");

function makeDoc(overrides) {
  var base = {
    name: "hero.psd",
    saved: true,
    path: "C:/work/hero.psd",
    width: 1000,
    height: 1000,
    mode: "RGB",
    bitsPerChannel: 8,
    rulerOrigin: { x: 500, y: 900 },
    hasSelection: false,
    selectionBounds: null,
    totalLayerCount: 5,
    hasArtboards: false,
    layers: []
  };
  if (overrides) {
    var k;
    for (k in overrides) {
      if (Object.prototype.hasOwnProperty.call(overrides, k)) {
        base[k] = overrides[k];
      }
    }
  }
  return base;
}

function makeLayer(id, name, extra) {
  var node = {
    id: id,
    name: name,
    type: "ArtLayer",
    kind: "NORMAL",
    visible: true,
    allLocked: false,
    opacity: 100,
    blendMode: "NORMAL",
    grouped: false,
    hasLayerEffects: false,
    hasUserMask: false,
    hasVectorMask: false,
    isBackground: false,
    isArtboard: false,
    bounds: [100, 100, 200, 200],
    boundsNoEffects: [100, 100, 200, 200],
    isEmpty: false
  };
  if (extra) {
    var k;
    for (k in extra) {
      if (Object.prototype.hasOwnProperty.call(extra, k)) {
        node[k] = extra[k];
      }
    }
  }
  return node;
}

function makeGroup(id, name, children, extra) {
  var node = makeLayer(id, name, {
    type: "LayerSet",
    kind: "GROUP",
    blendMode: "PASSTHROUGH",
    children: children || []
  });
  if (extra) {
    var k;
    for (k in extra) {
      if (Object.prototype.hasOwnProperty.call(extra, k)) {
        node[k] = extra[k];
      }
    }
  }
  return node;
}

function hasCode(report, code) {
  return report.issues.some(function (iss) { return iss.code === code; });
}

test("全面合规文档与 SRC_BACKUP/__REF__ [ignore] 内部脏层应通过体检", function () {
  var doc = makeDoc({
    layers: [
      makeGroup(1, "SRC_BACKUP [ignore]", [
        makeLayer(2, "坏标签 [NOTRIM] [CON]", { isEmpty: true, bounds: [0, 0, 0, 0] })
      ]),
      makeGroup(3, "__REF__ [ignore]", [
        makeLayer(4, "草稿", { kind: "CURVES" })
      ]),
      makeGroup(5, "head [bone]", [
        makeLayer(6, "face", { blendMode: "NORMAL" })
      ])
    ]
  });

  var rep = PreflightValidator.validateDocument(doc);
  assert.equal(rep.passed, true);
  assert.equal(rep.summary.errors, 0);
  assert.equal(rep.exportStats.attachmentCount, 1);
});

test("契约 1：文档模式、位深、未保存与画板检测", function () {
  var doc = makeDoc({
    mode: "CMYK",
    bitsPerChannel: 16,
    saved: false,
    hasArtboards: true
  });
  var rep = PreflightValidator.validateDocument(doc);
  assert.equal(rep.passed, false);
  assert.equal(hasCode(rep, "DOC_NOT_RGB"), true);
  assert.equal(hasCode(rep, "DOC_NOT_8BIT"), true);
  assert.equal(hasCode(rep, "DOC_UNSAVED"), true);
  assert.equal(hasCode(rep, "ARTBOARD_DETECTED"), true);
});

test("契约 2：12 标签白名单、组权限、非法参数及非 merge 组 [path:] 检测", function () {
  var doc = makeDoc({
    layers: [
      makeLayer(1, "arm [notrim]"),
      makeLayer(2, "leg [Bone]"),
      makeLayer(3, "foot [name:*_alt]"),
      makeLayer(4, "hand [scale:0]"),
      makeLayer(5, "head [bone:]"),
      makeGroup(6, "grp [name:no_star]", [makeLayer(7, "a")]),
      makeGroup(8, "body [folder] [path:shared]", [makeLayer(9, "torso")])
    ]
  });
  var rep = PreflightValidator.validateDocument(doc);
  assert.equal(rep.passed, false);
  assert.equal(hasCode(rep, "INVALID_TAG_NOTRIM"), true);
  assert.equal(hasCode(rep, "INVALID_TAG"), true);
  assert.equal(hasCode(rep, "GROUP_ONLY_TAG_ON_LAYER"), true);
  assert.equal(hasCode(rep, "INVALID_SCALE_VALUE"), true);
  assert.equal(hasCode(rep, "EMPTY_TAG_VALUE"), true);
  assert.equal(hasCode(rep, "INVALID_NAME_PATTERN"), true);
  assert.equal(hasCode(rep, "PATH_TAG_ON_NON_MERGE_GROUP"), true);
});

test("契约 3 & 4：非法命名、Windows 保留名、皮肤前缀、default 保留名与跨槽位大小写 PNG 碰撞", function () {
  var doc = makeDoc({
    layers: [
      makeLayer(1, "CON"),
      makeGroup(2, "hero [skin]", [
        makeLayer(3, "/sword")
      ]),
      makeGroup(4, "badSkin [skin:Default]", [
        makeLayer(5, "cape")
      ]),
      makeGroup(6, "slot_L [slot]", [
        makeLayer(7, "hand")
      ]),
      makeGroup(8, "slot_R [slot]", [
        makeLayer(9, "Hand")
      ])
    ]
  });

  var rep = PreflightValidator.validateDocument(doc);
  assert.equal(rep.passed, false);
  assert.equal(hasCode(rep, "INVALID_ATTACHMENT_NAME"), true);
  assert.equal(hasCode(rep, "EXPECTED_ATTACHMENT_PREFIX"), true);
  assert.equal(hasCode(rep, "DEFAULT_SKIN_RESERVED"), true);
  assert.equal(hasCode(rep, "PNG_PATH_COLLISION_CASE_INSENSITIVE"), true);
  assert.equal(rep.exportStats.caseInsensitivePaths.length, 1);
  assert.equal(rep.exportStats.caseInsensitivePaths[0].lowerPath, "hand");
});

test("契约 5 & 6：混合模式（PASSTHROUGH 组放行）、悬空调整/剪贴层、FX 与 >=500 层未栅格化 ERROR", function () {
  var doc = makeDoc({
    totalLayerCount: 500,
    layers: [
      makeGroup(1, "normal_group", [
        makeLayer(2, "valid_glow", { blendMode: "LINEARDODGE" }),
        makeLayer(3, "bad_blend", { blendMode: "OVERLAY" }),
        makeLayer(4, "adj_curves", { kind: "CURVES" }),
        makeLayer(5, "clip_orphan", { grouped: true }),
        makeLayer(6, "smart_part", { kind: "SMARTOBJECT", hasLayerEffects: true })
      ], { blendMode: "PASSTHROUGH" })
    ]
  });

  var rep = PreflightValidator.validateDocument(doc);
  assert.equal(rep.passed, false);
  assert.equal(hasCode(rep, "UNSUPPORTED_BLEND_MODE"), true);
  assert.equal(hasCode(rep, "DANGLING_ADJUSTMENT_LAYER"), true);
  assert.equal(hasCode(rep, "DANGLING_CLIPPING_MASK"), true);
  assert.equal(hasCode(rep, "UNRASTERIZED_LAYER_HIGH_RISK_500"), true);
  assert.equal(hasCode(rep, "LARGE_DOC_RASTERIZE_RISK"), true);
  assert.equal(hasCode(rep, "LAYER_EFFECTS_PRESENT"), true);
});

test("契约 7 & 8 & 9 & 10：[bone] 顶层空层飞角、锁定层、同骨不同父骨及 Mesh 环检测", function () {
  var doc = makeDoc({
    rulerOrigin: { x: 0, y: 0 },
    layers: [
      makeGroup(1, "arm [bone]", [
        makeLayer(2, "top_empty", { isEmpty: true, bounds: [0, 0, 0, 0] }),
        makeLayer(3, "arm_gfx", { allLocked: true, bounds: [-10, 0, 100, 100] })
      ]),
      makeGroup(4, "hip [bone]", [
        makeGroup(5, "leg [bone]", [makeLayer(6, "leg_a")])
      ]),
      makeGroup(7, "leg [bone]", [makeLayer(8, "leg_b")]),
      makeGroup(9, "wp [slot]", [
        makeLayer(10, "mesh_a [mesh:mesh_b]"),
        makeLayer(11, "mesh_b [mesh:mesh_a]"),
        makeLayer(12, "mesh_missing [mesh:ghost]")
      ])
    ]
  });

  var rep = PreflightValidator.validateDocument(doc);
  assert.equal(rep.passed, false);
  assert.equal(hasCode(rep, "EMPTY_LAYER_CORRUPTS_BONE_ORIGIN"), true);
  assert.equal(hasCode(rep, "LOCKED_EXPORT_LAYER"), true);
  assert.equal(hasCode(rep, "LAYER_OUT_OF_BOUNDS"), true);
  assert.equal(hasCode(rep, "INCONSISTENT_BONE_PARENT"), true);
  assert.equal(hasCode(rep, "MESH_CYCLE_DETECTED"), true);
  assert.equal(hasCode(rep, "MESH_SOURCE_NOT_FOUND"), true);
  assert.equal(hasCode(rep, "RULER_ORIGIN_DEFAULT"), true);
});
