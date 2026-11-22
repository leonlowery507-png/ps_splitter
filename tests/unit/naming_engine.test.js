/**
 * @fileoverview NamingEngine 模块单元测试 (naming_engine.js)
 */

"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var NamingEngine = require("../../src/core/naming_engine.js");

test("validateAttachmentName 应拦截非法字符、.png、保留名、__drag、纯点及超长路径", function () {
  assert.deepStrictEqual(NamingEngine.validateAttachmentName("weapons/sword_01"), {
    valid: true,
    sanitized: "weapons/sword_01",
    errors: []
  });

  var pngRes = NamingEngine.validateAttachmentName("hand.png");
  assert.equal(pngRes.valid, false);
  assert.equal(pngRes.sanitized, "hand");

  var badChars = NamingEngine.validateAttachmentName("a<b>c:d*e?f|g\"h\\i");
  assert.equal(badChars.valid, false);
  assert.equal(badChars.sanitized, "abcdefghi");

  assert.equal(NamingEngine.validateAttachmentName("CON").valid, false);
  assert.equal(NamingEngine.validateAttachmentName("com1.png").valid, false);
  assert.equal(NamingEngine.validateAttachmentName("folder/aux/arm").valid, false);
  assert.equal(NamingEngine.validateAttachmentName("__drag").valid, false);
  assert.equal(NamingEngine.validateAttachmentName("...").valid, false);
  assert.equal(NamingEngine.validateAttachmentName("").valid, false);

  var longName = new Array(260).join("a");
  var longRes = NamingEngine.validateAttachmentName(longName);
  assert.equal(longRes.valid, false);
  assert.equal(longRes.sanitized.length, 255);
});

test("swapLR 应精准单遍互换 L/R 标识且不误伤 LEG / cleft / 标签区", function () {
  assert.deepStrictEqual(NamingEngine.swapLR("arm_LEG [slot:arm_L]", true), {
    changed: false,
    name: "arm_LEG [slot:arm_L]"
  });
  assert.deepStrictEqual(NamingEngine.swapLR("cleft_chin", true), {
    changed: false,
    name: "cleft_chin"
  });
  assert.deepStrictEqual(NamingEngine.swapLR("ALL_arm", true), {
    changed: false,
    name: "ALL_arm"
  });
  assert.deepStrictEqual(NamingEngine.swapLR("leftover_food", true), {
    changed: false,
    name: "leftover_food"
  });

  assert.equal(NamingEngine.swapLR("leftArm_L [slot:arm_L]", true).name, "rightArm_R [slot:arm_L]");
  assert.equal(NamingEngine.swapLR("armLeft.l", true).name, "armRight.r");
  assert.equal(NamingEngine.swapLR("arm_Left", true).name, "arm_Right");
  assert.equal(NamingEngine.swapLR("L_R", true).name, "R_L");
  assert.equal(NamingEngine.swapLR("右手 [bone:hand_R]", true).name, "左手 [bone:hand_R]");
  assert.equal(NamingEngine.swapLR("arm_L [slot:arm_L]", false).name, "arm_R [slot:arm_R]");
});

test("batchRenamePlan 应支持 Tag-Aware 批量变换、非法正则安全捕获与同级大小写冲突检测", function () {
  var nodes = [
    { id: 1, name: "arm_L [slot:arm_L]", isGroup: false, parentId: 10 },
    { id: 2, name: "ARM_l [slot:arm_l_alt]", isGroup: false, parentId: 10 },
    { id: 3, name: "leg_L", isGroup: false, parentId: 20 }
  ];

  var plan = NamingEngine.batchRenamePlan(nodes, {
    prefix: "hero_",
    regexPattern: "_[Ll]$",
    regexReplace: "",
    sequentialStart: 1,
    sequentialPad: 2,
    preserveTags: true
  });

  assert.equal(plan.errors.length, 0);
  assert.equal(plan.items[0].newName, "hero_arm_01 [slot:arm_L]");
  assert.equal(plan.items[1].newName, "hero_ARM_02 [slot:arm_l_alt]");
  assert.equal(plan.items[2].newName, "hero_leg_03");

  // 同 parentId=10 下忽略序号测试冲突
  var conflictPlan = NamingEngine.batchRenamePlan([
    { id: 11, name: "eye_A [slot:e1]", isGroup: false, parentId: 100 },
    { id: 12, name: "EYE_b [slot:e2]", isGroup: false, parentId: 100 }
  ], {
    regexPattern: "_[ab]$",
    regexFlags: "i",
    regexReplace: ""
  });
  assert.equal(conflictPlan.conflicts.length, 1);
  assert.deepStrictEqual(conflictPlan.conflicts[0].ids, [11, 12]);

  // 非法正则或 ES6 flags 不应抛未捕获异常
  var badRegex = NamingEngine.batchRenamePlan(nodes, { regexPattern: "[abc" });
  assert.ok(badRegex.errors.length > 0);
  var badFlag = NamingEngine.batchRenamePlan(nodes, { regexPattern: "a", regexFlags: "u" });
  assert.ok(badFlag.errors.length > 0);
});
