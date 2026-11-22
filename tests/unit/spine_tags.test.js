/**
 * @fileoverview SpineTags 模块单元测试 (spine_tags.js)
 */

"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var SpineTags = require("../../src/core/spine_tags.js");

test("OFFICIAL_TAGS 应严格等于官方 12 个小写标签", function () {
  assert.deepStrictEqual(SpineTags.OFFICIAL_TAGS, [
    "bone", "slot", "skin", "folder", "merge", "ignore",
    "overlay", "trim", "mesh", "scale", "name", "path"
  ]);
});

test("parseLayerName 应正确解析全 12 类合法标签与前缀/后缀混合写法", function () {
  var res = SpineTags.parseLayerName("arm_L [bone:arm] [slot] [trim:false] [scale:0.5] [mesh:base/arm]", false);
  assert.equal(res.cleanName, "arm_L");
  assert.equal(res.errors.length, 0);
  assert.equal(res.invalidTags.length, 0);
  assert.equal(res.tags.length, 5);
  assert.equal(res.tags[2].key, "trim");
  assert.equal(res.tags[2].value, "false");
  assert.equal(res.tags[3].value, "0.5");

  var grp = SpineTags.parseLayerName("[folder:parts] [name:*_alt] [merge] [path:custom/item] fx", true);
  assert.equal(grp.cleanName, "fx");
  assert.equal(grp.errors.length, 0);
  assert.equal(grp.warnings.length, 0);
});

test("parseLayerName 应严格拦截大小写错误、[notrim]、空参数、非法 scale 与 groupOnlyTag", function () {
  var cases = [
    { name: "arm [Bone]", isGroup: false, errMatch: /全小写/ },
    { name: "arm [notrim]", isGroup: false, errMatch: /trim:false/ },
    { name: "arm [pivot:1,2]", isGroup: false, errMatch: /未知/ },
    { name: "arm [bone:]", isGroup: false, errMatch: /不能为空/ },
    { name: "arm [mesh:]", isGroup: false, errMatch: /不能为空/ },
    { name: "arm [ignore:1]", isGroup: false, errMatch: /不允许带参数/ },
    { name: "arm [path]", isGroup: false, errMatch: /必须提供冒号参数/ },
    { name: "arm [scale]", isGroup: false, errMatch: /必须提供冒号参数/ },
    { name: "arm [scale:0]", isGroup: false, errMatch: /正数/ },
    { name: "arm [scale:-0.5]", isGroup: false, errMatch: /正数/ },
    { name: "arm [scale:1px]", isGroup: false, errMatch: /正数/ },
    { name: "arm [trim:FALSE]", isGroup: false, errMatch: /trim/ },
    { name: "arm [name:*_v2]", isGroup: false, errMatch: /groupOnlyTag|仅允许用于图层组/ },
    { name: "grp [name:no_star]", isGroup: true, errMatch: /\*/ },
    { name: "grp []", isGroup: true, errMatch: /空方括号/ }
  ];

  var i;
  for (i = 0; i < cases.length; i++) {
    var c = cases[i];
    var parsed = SpineTags.parseLayerName(c.name, c.isGroup);
    assert.ok(parsed.errors.length > 0, "用例应产生 error: " + c.name);
    assert.ok(parsed.invalidTags.length > 0, "用例应记录 invalidTags: " + c.name);
    assert.match(parsed.errors[0], c.errMatch, "错误信息不匹配: " + c.name);
  }
});

test("parseLayerName 对普通层 [merge] 与非 merge 组 [path:] 应产出告警", function () {
  var layerMerge = SpineTags.parseLayerName("hand [merge]", false);
  assert.equal(layerMerge.errors.length, 0);
  assert.equal(layerMerge.tags.length, 1);
  assert.ok(layerMerge.warnings.length > 0);

  var groupPath = SpineTags.parseLayerName("weapons [path:shared/w]", true);
  assert.equal(groupPath.errors.length, 0);
  assert.ok(groupPath.warnings.length > 0);
});

test("formatLayerName / stripAllTags / toggleOrSetTag 应保持幂等并阻断非法主动注入", function () {
  assert.equal(SpineTags.stripAllTags(" [bone:a]  arm_L  [slot] "), "arm_L");

  var formatted = SpineTags.formatLayerName("sword", [
    { key: "path", value: "weapons/sword" },
    { key: "slot", value: null },
    { key: "trim", value: "false" }
  ], "suffix");
  assert.equal(formatted, "sword [slot] [trim:false] [path:weapons/sword]");

  // 幂等添加与更新
  var r1 = SpineTags.toggleOrSetTag("arm", false, "slot", "arm_L", true);
  assert.equal(r1.ok, true);
  assert.equal(r1.name, "arm [slot:arm_L]");

  var r2 = SpineTags.toggleOrSetTag(r1.name, false, "slot", "arm_R", true);
  assert.equal(r2.ok, true);
  assert.equal(r2.name, "arm [slot:arm_R]");

  var r3 = SpineTags.toggleOrSetTag(r2.name, false, "slot", null, false);
  assert.equal(r3.ok, true);
  assert.equal(r3.name, "arm");

  // 拦截普通层主动注入 merge/name 及保留字 skin:default
  assert.equal(SpineTags.toggleOrSetTag("arm", false, "merge", null, true).ok, false);
  assert.equal(SpineTags.toggleOrSetTag("arm", false, "name", "*_1", true).ok, false);
  assert.equal(SpineTags.toggleOrSetTag("grp", true, "skin", "Default", true).ok, false);
  assert.equal(SpineTags.toggleOrSetTag("arm", false, "notrim", null, true).ok, false);
});
