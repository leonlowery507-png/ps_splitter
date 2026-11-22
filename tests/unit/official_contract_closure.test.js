/**
 * @fileoverview 核心引擎协同与 PhotoshopToSpine.jsx 官方规则闭环集成测试
 * 验证：脏文档 -> Preflight 拦截 -> 规划并应用 Core 修复 -> 复检通过 -> 送入官方前置语义消费器 0 错误导出。
 */

"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");

var Polyfill = require("../../src/core/polyfill_es3.js");
var SpineTags = require("../../src/core/spine_tags.js");
var NamingEngine = require("../../src/core/naming_engine.js");
var SkeletonTemplates = require("../../src/core/skeleton_templates.js");
var SkinMapper = require("../../src/core/skin_mapper.js");
var AlignmentMath = require("../../src/core/alignment_math.js");
var ClipChainResolver = require("../../src/core/clip_chain_resolver.js");
var PreflightValidator = require("../../src/core/preflight_validator.js");
var SanitizePlanner = require("../../src/core/sanitize_planner.js");

/**
 * 复刻 PhotoshopToSpine.jsx v7.42 核心收集与前置校验语义（独立参考消费器）
 * 用于验证经 Core 模块处理后的 VirtualDoc 100% 符合官方脚本前置输入要求。
 */
function simulateOfficialPhotoshopToSpineCheck(doc) {
  var errors = [];
  if (!doc || !doc.saved) {
    errors.push("docUnsaved");
  }
  if (!doc || doc.mode !== "RGB") {
    errors.push("rgbRequired");
  }
  if (doc && doc.hasArtboards) {
    errors.push("artboardUnsupported");
  }

  var officialTags = SpineTags.OFFICIAL_TAGS;
  var boneParents = {};
  var slots = {};

  function hasTag(tags, k) {
    var i;
    for (i = 0; i < tags.length; i++) {
      if (tags[i].key === k) { return tags[i]; }
    }
    return null;
  }

  function walk(nodes, ancestors) {
    var i;
    for (i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var isGroup = n.type === "LayerSet";
      var str = String(n.name || "");
      var rawTags = [];
      var re = /\[([^\]]+)\]/g;
      var m;
      var ignored = false;

      // 官方 L1289：[ignore] 早于正则校验
      var j;
      for (j = 0; j < ancestors.length; j++) {
        if (/\[ignore\]/.test(ancestors[j].name)) { ignored = true; }
      }
      if (/\[ignore\]/.test(str)) { ignored = true; }
      if (ignored) { continue; }

      while ((m = re.exec(str)) !== null) {
        var tagText = m[1];
        var colon = tagText.indexOf(":");
        var key = colon !== -1 ? tagText.slice(0, colon) : tagText;
        var val = colon !== -1 ? tagText.slice(colon + 1) : null;
        if (Polyfill.indexOf(officialTags, key) === -1 || key !== key.toLowerCase()) {
          errors.push("invalidTag:" + m[0]);
        }
        if (key === "name" && !isGroup) {
          errors.push("groupOnlyTag:" + m[0]);
        }
        if (key === "name" && (!val || val.indexOf("*") === -1)) {
          errors.push("invalidNamePattern:" + m[0]);
        }
        if (key === "scale" && (!val || isNaN(parseFloat(val)) || parseFloat(val) <= 0)) {
          errors.push("invalidScale:" + m[0]);
        }
        rawTags.push({ key: key, value: val });
      }

      if (isGroup) {
        walk(n.children || [], ancestors.concat([n]));
        continue;
      }

      if (n.grouped || n.kind === "CURVES" || n.kind === "LEVELS") {
        // 官方跳过但不隐藏，若出现在非 merge 组视作潜在污染
        errors.push("danglingSpecialLayer:" + n.name);
        continue;
      }

      if (n.isEmpty) { continue; }

      // 检查骨骼父子一致
      var chain = ancestors.concat([n]);
      var prevBone = "__root__";
      for (j = 0; j < chain.length; j++) {
        var bt = /\[\s*bone(?::([^\]]+))?\s*\]/.exec(chain[j].name);
        if (bt) {
          var bName = bt[1] || SpineTags.stripAllTags(chain[j].name);
          if (Polyfill.hasOwn(boneParents, bName) && boneParents[bName] !== prevBone) {
            errors.push("parentBones:" + bName);
          } else {
            boneParents[bName] = prevBone;
          }
          prevBone = bName;
        }
      }

      // 检查附件与皮肤前缀
      var clean = SpineTags.stripAllTags(str).replace(/\.png$/i, "").replace(/[\\:"*?<>|]/g, "");
      if (!clean || /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i.test(clean) || clean.length > 255) {
        errors.push("invalidAttachmentName:" + str);
      }

      var folders = [];
      var skinName = "default";
      for (j = 0; j < ancestors.length; j++) {
        var am = /\[(folder|skin)(?::([^\]]+))?\]/.exec(ancestors[j].name);
        if (am) {
          var seg = am[2] || SpineTags.stripAllTags(ancestors[j].name);
          if (am[1] === "skin") {
            if (seg.toLowerCase() === "default") {
              errors.push("defaultSkinReserved");
            }
            skinName = seg;
          }
          folders.push(seg);
        }
      }
      var attName = folders.length > 0 ? (folders.join("/") + "/" + clean) : clean;
      if (skinName !== "default" && !Polyfill.startsWith(attName, skinName + "/")) {
        errors.push("expectedAttachmentPrefix:" + attName);
      }
      var slotKey = clean;
      var slotRecKey = skinName + "::" + slotKey + "::" + attName;
      if (Polyfill.hasOwn(slots, slotRecKey)) {
        errors.push("duplicateSkinAttachment:" + slotRecKey);
      }
      slots[slotRecKey] = true;
    }
  }

  walk(doc.layers || [], []);
  return { ok: errors.length === 0, errors: errors };
}

test("全 9 个 Core 模块协同：从脏文档体检、骨骼建组、皮肤克隆、对齐计算到净身修复并满足官方导出前置契约", function () {
  // 1. 构造含多类典型生产缺陷的脏文档
  var doc = {
    name: "knight.psd",
    saved: true,
    width: 1000,
    height: 1000,
    mode: "CMYK",
    bitsPerChannel: 16,
    rulerOrigin: { x: 500, y: 900 },
    totalLayerCount: 6,
    hasArtboards: false,
    layers: [
      {
        id: 1,
        name: "arm_L [notrim]",
        type: "ArtLayer",
        kind: "SMARTOBJECT",
        visible: true,
        allLocked: true,
        blendMode: "NORMAL",
        grouped: false,
        hasLayerEffects: true,
        bounds: [-20, 100, 180, 300],
        isEmpty: false
      },
      {
        id: 2,
        name: "CON",
        type: "ArtLayer",
        kind: "NORMAL",
        visible: true,
        allLocked: false,
        blendMode: "NORMAL",
        grouped: false,
        bounds: [0, 0, 0, 0],
        isEmpty: true
      }
    ]
  };

  // 2. 初次体检应拦截失败
  var initialReport = PreflightValidator.validateDocument(doc);
  assert.equal(initialReport.passed, false);
  assert.ok(initialReport.summary.errors >= 2);

  // 3. 生成净身计划并验证
  var plan = SanitizePlanner.buildSanitizePlan(doc, initialReport, { createBackupSnapshot: true });
  assert.equal(plan.requiresBackupSnapshot, true);
  assert.equal(plan.steps[0].action, "CREATE_BACKUP_SNAPSHOT");

  // 4. 模拟执行修复 + 骨骼模板 + 镜像对称 L/R 克隆 + 皮肤克隆
  var fixedArmTag = SpineTags.toggleOrSetTag("arm_L [trim:false]", false, "slot", "arm_L", true);
  assert.equal(fixedArmTag.ok, true);
  var swappedArmR = NamingEngine.swapLR(fixedArmTag.name, true);
  assert.equal(swappedArmR.name, "arm_R [slot:arm_L] [trim:false]");
  var fixedSlotR = SpineTags.toggleOrSetTag(swappedArmR.name, false, "slot", "arm_R", true);
  assert.equal(fixedSlotR.name, "arm_R [slot:arm_R] [trim:false]");

  var mirrorGeom = AlignmentMath.calcMirrorDelta([0, 100, 180, 300], 500);
  assert.deepStrictEqual(mirrorGeom.targetBounds, [820, 100, 1000, 300]);

  var tplPlan = SkeletonTemplates.buildHierarchyPlan("portrait", { includeSlots: true }, doc);
  assert.equal(tplPlan.ok, true);

  // 构造修复后的合规文档（含 SRC_BACKUP [ignore] 备份原稿、标准骨骼组、主皮肤与克隆皮肤）
  var baseSkinGroup = {
    id: 50,
    name: "knight_base [skin]",
    type: "LayerSet",
    kind: "GROUP",
    visible: true,
    allLocked: false,
    blendMode: "PASSTHROUGH",
    grouped: false,
    bounds: [0, 0, 1000, 1000],
    children: [
      {
        id: 51,
        name: "chest [slot]",
        type: "LayerSet",
        kind: "GROUP",
        visible: true,
        allLocked: false,
        blendMode: "PASSTHROUGH",
        grouped: false,
        bounds: [400, 300, 600, 500],
        children: [
          {
            id: 52,
            name: "chest_plate",
            type: "ArtLayer",
            kind: "NORMAL",
            visible: true,
            allLocked: false,
            blendMode: "NORMAL",
            grouped: false,
            bounds: [400, 300, 600, 500],
            isEmpty: false
          }
        ]
      }
    ]
  };
  var skinClone = SkinMapper.buildSkinClonePlan(baseSkinGroup, "gold_edition", {});
  assert.equal(skinClone.ok, true);
  assert.equal(skinClone.rootName, "gold_edition [skin]");

  var repairedDoc = {
    name: "knight.psd",
    saved: true,
    width: 1000,
    height: 1000,
    mode: "RGB",
    bitsPerChannel: 8,
    rulerOrigin: { x: 500, y: 900 },
    totalLayerCount: 8,
    hasArtboards: false,
    layers: [
      {
        id: 900,
        name: "SRC_BACKUP [ignore]",
        type: "LayerSet",
        kind: "GROUP",
        visible: false,
        allLocked: true,
        blendMode: "PASSTHROUGH",
        grouped: false,
        bounds: [0, 0, 0, 0],
        children: Polyfill.clone(doc.layers)
      },
      {
        id: 10,
        name: "arm_L_bone [bone]",
        type: "LayerSet",
        kind: "GROUP",
        visible: true,
        allLocked: false,
        blendMode: "PASSTHROUGH",
        grouped: false,
        bounds: [0, 100, 180, 300],
        children: [
          {
            id: 1,
            name: fixedArmTag.name,
            type: "ArtLayer",
            kind: "NORMAL",
            visible: true,
            allLocked: false,
            blendMode: "NORMAL",
            grouped: false,
            hasLayerEffects: false,
            bounds: [0, 100, 180, 300],
            isEmpty: false
          }
        ]
      },
      {
        id: 20,
        name: "arm_R_bone [bone]",
        type: "LayerSet",
        kind: "GROUP",
        visible: true,
        allLocked: false,
        blendMode: "PASSTHROUGH",
        grouped: false,
        bounds: mirrorGeom.targetBounds,
        children: [
          {
            id: 21,
            name: fixedSlotR.name,
            type: "ArtLayer",
            kind: "NORMAL",
            visible: true,
            allLocked: false,
            blendMode: "NORMAL",
            grouped: false,
            hasLayerEffects: false,
            bounds: mirrorGeom.targetBounds,
            isEmpty: false
          }
        ]
      },
      baseSkinGroup,
      {
        id: 60,
        name: skinClone.rootName,
        type: "LayerSet",
        kind: "GROUP",
        visible: true,
        allLocked: false,
        blendMode: "PASSTHROUGH",
        grouped: false,
        bounds: [400, 300, 600, 500],
        children: [
          {
            id: 61,
            name: skinClone.operations[1].targetName,
            type: "LayerSet",
            kind: "GROUP",
            visible: true,
            allLocked: false,
            blendMode: "PASSTHROUGH",
            grouped: false,
            bounds: [400, 300, 600, 500],
            children: [
              {
                id: 62,
                name: skinClone.operations[2].targetName,
                type: "ArtLayer",
                kind: "NORMAL",
                visible: true,
                allLocked: false,
                blendMode: "NORMAL",
                grouped: false,
                bounds: [400, 300, 600, 500],
                isEmpty: false
              }
            ]
          }
        ]
      }
    ]
  };

  // 5. 复检通过，且无剩余净身步骤
  var recheck = PreflightValidator.validateDocument(repairedDoc);
  assert.equal(recheck.passed, true, "复检应通过，实际 issues: " + JSON.stringify(recheck.issues));
  assert.equal(recheck.summary.errors, 0);

  var postPlan = SanitizePlanner.buildSanitizePlan(repairedDoc, recheck, {});
  assert.equal(postPlan.steps.length, 0);

  // 6. 官方规则闭环消费器 0 错误导出
  var officialCheck = simulateOfficialPhotoshopToSpineCheck(repairedDoc);
  assert.equal(officialCheck.ok, true, "官方前置校验应 0 错误，实际: " + JSON.stringify(officialCheck.errors));

  // 7. 验证 ClipChainResolver 协同可用
  var chainRes = ClipChainResolver.findClipChain([
    { id: 1, grouped: true, visible: true },
    { id: 2, grouped: false, visible: true }
  ], 0);
  assert.equal(chainRes.ok, true);
  assert.equal(chainRes.baseIndex, 1);
});
