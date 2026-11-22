/**
 * @fileoverview SkeletonTemplates 模块单元测试 (skeleton_templates.js)
 */

"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var SkeletonTemplates = require("../../src/core/skeleton_templates.js");
var SpineTags = require("../../src/core/spine_tags.js");
var NamingEngine = require("../../src/core/naming_engine.js");

test("listTemplates 应返回全部 4 套标准角色骨骼模板元数据", function () {
  var list = SkeletonTemplates.listTemplates();
  var ids = list.map(function (t) { return t.id; });
  assert.deepStrictEqual(ids, ["humanoid", "chibi", "quadruped", "portrait"]);
});

test("4 套模板生成的所有组名均应通过 SpineTags 与 NamingEngine 校验，且同一模板内无同名跨分支 [bone]", function () {
  var templates = SkeletonTemplates.listTemplates();
  var i;
  for (i = 0; i < templates.length; i++) {
    var tplId = templates[i].id;
    var plan = SkeletonTemplates.buildHierarchyPlan(tplId, { includeSlots: true }, { layers: [] });
    assert.equal(plan.ok, true, tplId + " 应建组成功");
    assert.ok(plan.operations.length > 0, tplId + " 应至少生成一个建组操作");

    var seenBones = {};
    var j;
    for (j = 0; j < plan.operations.length; j++) {
      var op = plan.operations[j];
      var parsed = SpineTags.parseLayerName(op.name, true);
      assert.equal(parsed.errors.length, 0, tplId + " 节点标签非法: " + op.name);

      var nameCheck = NamingEngine.validateAttachmentName(parsed.cleanName);
      assert.equal(nameCheck.valid, true, tplId + " 节点名称非法: " + parsed.cleanName);

      var k;
      for (k = 0; k < parsed.tags.length; k++) {
        if (parsed.tags[k].key === "bone") {
          var boneName = parsed.tags[k].value || parsed.cleanName;
          assert.equal(
            Object.prototype.hasOwnProperty.call(seenBones, boneName),
            false,
            tplId + " 存在重复 [bone] 名: " + boneName
          );
          seenBones[boneName] = true;
        }
      }
    }
  }
});

test("buildHierarchyPlan 增量合并应跳过已有组并补建缺失子槽位，不覆盖同名 ArtLayer", function () {
  var existingDoc = {
    layers: [
      { id: 1, name: "SRC_BACKUP [ignore]", type: "LayerSet", children: [] },
      {
        id: 2,
        name: "head [bone]",
        type: "LayerSet",
        children: [
          { id: 3, name: "eyes [slot]", type: "LayerSet", children: [] },
          { id: 4, name: "mouth", type: "ArtLayer", children: [] }
        ]
      }
    ]
  };

  var plan = SkeletonTemplates.buildHierarchyPlan("portrait", { includeSlots: true }, existingDoc);
  assert.equal(plan.ok, true);

  var opPaths = plan.operations.map(function (op) { return op.path; });
  assert.equal(opPaths.indexOf("head [bone]"), -1, "已有 head [bone] 应跳过");
  assert.equal(opPaths.indexOf("head [bone]/eyes [slot]"), -1, "已有 eyes [slot] 应跳过");
  assert.ok(opPaths.indexOf("head [bone]/eyebrows [slot]") !== -1, "缺失槽位 eyebrows 应补建");
  assert.equal(opPaths.indexOf("head [bone]/mouth [slot]"), -1, "同名 ArtLayer 冲突分支应跳过");
  assert.ok(plan.warnings.length > 0, "同名 ArtLayer 冲突应产出警告");
});

test("buildHierarchyPlan 对未知模板 ID 应安全返回错误", function () {
  var res = SkeletonTemplates.buildHierarchyPlan("unknown_rig", {}, { layers: [] });
  assert.equal(res.ok, false);
  assert.equal(res.operations.length, 0);
  assert.ok(res.error);
});
