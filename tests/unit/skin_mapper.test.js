/**
 * @fileoverview SkinMapper 模块单元测试 (skin_mapper.js)
 */

"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var SkinMapper = require("../../src/core/skin_mapper.js");

test("validateSkinName 应拦截 default 保留字、非法路径与 Windows 保留名，允许合法多级路径", function () {
  assert.equal(SkinMapper.validateSkinName("dark_knight").valid, true);
  assert.equal(SkinMapper.validateSkinName("armor/gold_v2").valid, true);

  var invalidList = [
    "",
    "default",
    "Default",
    "armor/DEFAULT",
    "/leading",
    "trailing/",
    "a//b",
    "a[b]",
    "con",
    "armor/LPT1/helm",
    "__drag",
    "..."
  ];

  var i;
  for (i = 0; i < invalidList.length; i++) {
    assert.equal(
      SkinMapper.validateSkinName(invalidList[i]).valid,
      false,
      "非法皮肤名应被拒绝: " + invalidList[i]
    );
  }
});

test("buildSkinClonePlan 应正确生成多级皮肤、跳过 [ignore]、剥离危险 [path:] 并处理 [mesh] 跨皮肤引用", function () {
  var srcSkinNode = {
    id: 100,
    name: "base_knight [skin]",
    type: "LayerSet",
    children: [
      { id: 101, name: "draft_ref [ignore]", type: "ArtLayer" },
      {
        id: 102,
        name: "chest [slot]",
        type: "LayerSet",
        children: [
          { id: 103, name: "/armor_front [path:shared/chest]", type: "ArtLayer" },
          { id: 104, name: "cape [mesh]", type: "ArtLayer" }
        ]
      }
    ]
  };

  var plan = SkinMapper.buildSkinClonePlan(srcSkinNode, "armor/gold", {
    includeIgnored: false,
    pathStrategy: "strip",
    meshStrategy: "linkToSource"
  });

  assert.equal(plan.ok, true);
  assert.equal(plan.rootName, "gold [skin:armor/gold]");
  assert.equal(plan.operations.length, 4); // root + chest + armor_front + cape（跳过了 ignore）
  assert.equal(plan.operations[0].type, "cloneSkinRoot");
  assert.equal(plan.operations[1].targetName, "chest [slot]");
  // 剥离了前导 / 与 [path:]
  assert.equal(plan.operations[2].targetName, "armor_front");
  // 自动生成跨皮肤 linkedmesh 源引用
  assert.equal(plan.operations[3].targetName, "cape [mesh:base_knight/cape]");
  assert.ok(plan.warnings.length >= 3);
});

test("buildSkinClonePlan 对非组节点或非法目标皮肤名应安全失败", function () {
  var artNode = { id: 1, name: "layer", type: "ArtLayer" };
  assert.equal(SkinMapper.buildSkinClonePlan(artNode, "hero").ok, false);

  var grpNode = { id: 2, name: "skin_a [skin]", type: "LayerSet", children: [] };
  assert.equal(SkinMapper.buildSkinClonePlan(grpNode, "default").ok, false);
});
