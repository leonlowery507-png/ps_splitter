/**
 * @fileoverview ClipChainResolver 模块单元测试 (clip_chain_resolver.js)
 */

"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var ClipChainResolver = require("../../src/core/clip_chain_resolver.js");

test("findClipChain 选中基底或链条内任一剪贴层均应返回一致的完整链条且不串链", function () {
  var siblings = [
    { id: 10, name: "other_top", grouped: false, visible: true },
    { id: 11, name: "clip_top", grouped: true, visible: false },
    { id: 12, name: "clip_mid", grouped: true, visible: true },
    { id: 13, name: "base_layer", grouped: false, visible: true },
    { id: 14, name: "other_clip", grouped: true, visible: true },
    { id: 15, name: "other_base", grouped: false, visible: true }
  ];

  var indicesToSelect = [1, 2, 3];
  var i;
  for (i = 0; i < indicesToSelect.length; i++) {
    var res = ClipChainResolver.findClipChain(siblings, indicesToSelect[i]);
    assert.equal(res.ok, true);
    assert.equal(res.baseIndex, 3);
    assert.equal(res.baseNode.id, 13);
    assert.deepStrictEqual(res.clipIndices, [1, 2]);
    assert.deepStrictEqual(res.clipNodes.map(function (n) { return n.id; }), [11, 12]);
    assert.equal(res.topIndex, 1);
    assert.equal(res.bottomIndex, 3);
    assert.deepStrictEqual(res.hiddenIndices, [1]);
    assert.equal(res.error, null);
  }
});

test("findClipChain 对独立无剪贴层的基底应返回空剪贴数组", function () {
  var siblings = [
    { id: 1, name: "solo", grouped: false, visible: true }
  ];
  var res = ClipChainResolver.findClipChain(siblings, 0);
  assert.equal(res.ok, true);
  assert.equal(res.baseIndex, 0);
  assert.deepStrictEqual(res.clipIndices, []);
  assert.deepStrictEqual(res.clipNodes, []);
});

test("findClipChain 应准确拦截 NO_BASE_LAYER、INDEX_OUT_OF_RANGE 与 EMPTY_SIBLINGS", function () {
  var orphanChain = [
    { id: 1, name: "c1", grouped: true, visible: true },
    { id: 2, name: "c2", grouped: true, visible: true }
  ];
  var noBase = ClipChainResolver.findClipChain(orphanChain, 0);
  assert.equal(noBase.ok, false);
  assert.equal(noBase.error, "NO_BASE_LAYER");

  assert.equal(ClipChainResolver.findClipChain([], 0).error, "EMPTY_SIBLINGS");
  assert.equal(ClipChainResolver.findClipChain(orphanChain, -1).error, "INDEX_OUT_OF_RANGE");
  assert.equal(ClipChainResolver.findClipChain(orphanChain, 2).error, "INDEX_OUT_OF_RANGE");
  assert.equal(ClipChainResolver.findClipChain(orphanChain, 0.5).error, "INDEX_OUT_OF_RANGE");
});
