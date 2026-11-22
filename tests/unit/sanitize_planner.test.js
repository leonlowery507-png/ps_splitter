/**
 * @fileoverview SanitizePlanner 模块单元测试 (sanitize_planner.js)
 */

"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var PreflightValidator = require("../../src/core/preflight_validator.js");
var SanitizePlanner = require("../../src/core/sanitize_planner.js");

test("buildSanitizePlan 应强制 requiresBackupSnapshot 并按安全拓扑顺序编排净身步骤", function () {
  var dirtyDoc = {
    name: "dirty.psd",
    saved: true,
    width: 1000,
    height: 1000,
    mode: "CMYK",
    bitsPerChannel: 16,
    rulerOrigin: { x: 500, y: 900 },
    totalLayerCount: 10,
    hasArtboards: false,
    layers: [
      {
        id: 99,
        name: "__REF__ [ignore]",
        type: "LayerSet",
        kind: "GROUP",
        visible: false,
        allLocked: true,
        blendMode: "PASSTHROUGH",
        grouped: false,
        bounds: [0, 0, 0, 0],
        children: [
          {
            id: 100,
            name: "ref_smart",
            type: "ArtLayer",
            kind: "SMARTOBJECT",
            visible: false,
            allLocked: true,
            blendMode: "NORMAL",
            grouped: false,
            hasLayerEffects: true,
            bounds: [-50, -50, 500, 500],
            isEmpty: false
          }
        ]
      },
      {
        id: 1,
        name: "hidden_draft",
        type: "ArtLayer",
        kind: "NORMAL",
        visible: false,
        allLocked: false,
        blendMode: "NORMAL",
        grouped: false,
        bounds: [10, 10, 50, 50],
        isEmpty: false
      },
      {
        id: 2,
        name: "empty_top",
        type: "ArtLayer",
        kind: "NORMAL",
        visible: true,
        allLocked: true,
        blendMode: "NORMAL",
        grouped: false,
        bounds: [0, 0, 0, 0],
        isEmpty: true
      },
      {
        id: 3,
        name: "clip_fx",
        type: "ArtLayer",
        kind: "CURVES",
        visible: true,
        allLocked: false,
        blendMode: "NORMAL",
        grouped: true,
        bounds: [20, 20, 120, 120],
        isEmpty: false
      },
      {
        id: 4,
        name: "base_smart [notrim]",
        type: "ArtLayer",
        kind: "SMARTOBJECT",
        visible: true,
        allLocked: false,
        blendMode: "NORMAL",
        grouped: false,
        hasLayerEffects: true,
        bounds: [-10, 20, 200, 200],
        isEmpty: false
      }
    ]
  };

  var report = PreflightValidator.validateDocument(dirtyDoc);
  var plan = SanitizePlanner.buildSanitizePlan(dirtyDoc, report, {
    createBackupSnapshot: true,
    trimCanvas: true,
    canvasPadding: 4
  });

  assert.equal(plan.requiresBackupSnapshot, true);
  var actions = plan.steps.map(function (s) { return s.action; });

  // 验证严格拓扑顺序
  var expectedOrder = [
    "CREATE_BACKUP_SNAPSHOT",
    "CONVERT_TO_RGB",
    "CONVERT_TO_8BIT",
    "UNLOCK_LAYERS",
    "FIX_TAG_SYNTAX",
    "TAG_IGNORE_HIDDEN_LAYERS",
    "DELETE_EMPTY_LAYERS",
    "RASTERIZE_LAYERS",
    "MERGE_CLIP_CHAINS",
    "BAKE_LAYER_EFFECTS",
    "CLIP_OUT_OF_BOUNDS",
    "TRIM_CANVAS"
  ];
  assert.deepStrictEqual(actions, expectedOrder);

  // 验证 __REF__ [ignore] 内部图层 id 99 / 100 绝对未被任何步骤触碰
  var sIdx;
  for (sIdx = 0; sIdx < plan.steps.length; sIdx++) {
    assert.equal(plan.steps[sIdx].layerIds.indexOf(99), -1);
    assert.equal(plan.steps[sIdx].layerIds.indexOf(100), -1);
  }
});

test("已存在 SRC_BACKUP [ignore] 且文档完全合规时不应生成任何修改步骤", function () {
  var cleanDoc = {
    name: "clean.psd",
    saved: true,
    width: 1000,
    height: 1000,
    mode: "RGB",
    bitsPerChannel: 8,
    rulerOrigin: { x: 500, y: 900 },
    totalLayerCount: 2,
    hasArtboards: false,
    layers: [
      { id: 1, name: "SRC_BACKUP [ignore]", type: "LayerSet", kind: "GROUP", visible: false, allLocked: true, blendMode: "PASSTHROUGH", grouped: false, bounds: [0, 0, 0, 0], children: [] },
      { id: 2, name: "body", type: "ArtLayer", kind: "NORMAL", visible: true, allLocked: false, blendMode: "NORMAL", grouped: false, bounds: [10, 10, 100, 100], isEmpty: false }
    ]
  };

  var plan = SanitizePlanner.buildSanitizePlan(cleanDoc, null, {});
  assert.equal(plan.requiresBackupSnapshot, false);
  assert.deepStrictEqual(plan.steps, []);
});

test("即使调用方传 createBackupSnapshot: false，存在修改步骤时 requiresBackupSnapshot 仍必须为 true", function () {
  var doc = {
    name: "cmyk.psd",
    saved: true,
    width: 500,
    height: 500,
    mode: "CMYK",
    bitsPerChannel: 8,
    layers: []
  };
  var plan = SanitizePlanner.buildSanitizePlan(doc, null, { createBackupSnapshot: false });
  assert.equal(plan.requiresBackupSnapshot, true);
  assert.equal(plan.steps[0].action, "CONVERT_TO_RGB");
});
