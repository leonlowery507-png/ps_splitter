/**
 * @fileoverview AlignmentMath 模块单元测试 (alignment_math.js)
 */

"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var AlignmentMath = require("../../src/core/alignment_math.js");

test("calcMirrorDelta 应严格返回契约键名并正确计算整数/浮点轴镜像坐标", function () {
  var res = AlignmentMath.calcMirrorDelta([100, 50, 200, 150], 500);
  assert.deepStrictEqual(res, {
    targetCenterX: 850,
    deltaX: 700,
    targetBounds: [800, 50, 900, 150]
  });

  // 居中绕轴镜像，deltaX 应为 +0（非 -0）
  var centered = AlignmentMath.calcMirrorDelta([450, 0, 550, 100], 500);
  assert.equal(Object.is(centered.deltaX, 0), true);
  assert.deepStrictEqual(centered.targetBounds, [450, 0, 550, 100]);

  assert.throws(function () {
    AlignmentMath.calcMirrorDelta([200, 0, 100, 10], 500);
  });
});

test("calcSymmetryDeviation 应精准测算偏差且规避 -0 陷阱", function () {
  var dev = AlignmentMath.calcSymmetryDeviation([100, 200, 200, 300], [805, 203, 905, 303], 500);
  assert.deepStrictEqual(dev, {
    deltaX: 5,
    deltaY: 3,
    fixForR: { dx: -5, dy: -3 }
  });

  // 完全对称时，fixForR 不得包含 -0
  var sym = AlignmentMath.calcSymmetryDeviation([100, 200, 200, 300], [800, 200, 900, 300], 500);
  assert.equal(Object.is(sym.deltaX, 0), true);
  assert.equal(Object.is(sym.deltaY, 0), true);
  assert.equal(Object.is(sym.fixForR.dx, 0), true);
  assert.equal(Object.is(sym.fixForR.dy, 0), true);
});

test("calcNineGridOffset 应覆盖全部 9 个锚点枚举并拦截非法锚点", function () {
  var src = [10, 20, 50, 60];     // w=40, h=40, center=(30,40)
  var dst = [100, 200, 180, 280]; // w=80, h=80, center=(140,240)

  assert.deepStrictEqual(AlignmentMath.calcNineGridOffset(src, dst, "TL"), { dx: 90, dy: 180 });
  assert.deepStrictEqual(AlignmentMath.calcNineGridOffset(src, dst, "TC"), { dx: 110, dy: 180 });
  assert.deepStrictEqual(AlignmentMath.calcNineGridOffset(src, dst, "TR"), { dx: 130, dy: 180 });
  assert.deepStrictEqual(AlignmentMath.calcNineGridOffset(src, dst, "CL"), { dx: 90, dy: 200 });
  assert.deepStrictEqual(AlignmentMath.calcNineGridOffset(src, dst, "CC"), { dx: 110, dy: 200 });
  assert.deepStrictEqual(AlignmentMath.calcNineGridOffset(src, dst, "CR"), { dx: 130, dy: 200 });
  assert.deepStrictEqual(AlignmentMath.calcNineGridOffset(src, dst, "BL"), { dx: 90, dy: 220 });
  assert.deepStrictEqual(AlignmentMath.calcNineGridOffset(src, dst, "BC"), { dx: 110, dy: 220 });
  assert.deepStrictEqual(AlignmentMath.calcNineGridOffset(src, dst, "BR"), { dx: 130, dy: 220 });
  assert.deepStrictEqual(AlignmentMath.calcNineGridOffset(src, dst), { dx: 110, dy: 200 });

  assert.throws(function () {
    AlignmentMath.calcNineGridOffset(src, dst, "CENTER");
  });
});

test("calcSafeCanvasBounds 应过滤空包围盒、钳位画布边界并处理全空输入", function () {
  var res = AlignmentMath.calcSafeCanvasBounds(
    1000,
    1000,
    [[0, 0, 0, 0], null, [-20, 100, 300, 1200]],
    10
  );
  assert.deepStrictEqual(res, {
    bounds: [0, 90, 310, 1000],
    changed: true
  });

  var emptyRes = AlignmentMath.calcSafeCanvasBounds(1000, 1000, [[0, 0, 0, 0]], 10);
  assert.deepStrictEqual(emptyRes, {
    bounds: [0, 0, 1000, 1000],
    changed: false
  });
});
