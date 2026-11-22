/**
 * @fileoverview Polyfill 模块单元测试 (polyfill_es3.js)
 */

"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var Polyfill = require("../../src/core/polyfill_es3.js");

test("trim 应正确去除首尾空白、BOM 与不换行空格，并对 null/undefined 返回空串", function () {
  assert.equal(Polyfill.trim("  \t\r\nhello world \u00A0\uFEFF "), "hello world");
  assert.equal(Polyfill.trim("   \t\n  "), "");
  assert.equal(Polyfill.trim(""), "");
  assert.equal(Polyfill.trim(null), "");
  assert.equal(Polyfill.trim(undefined), "");
});

test("startsWith 与 endsWith 应正确修复长度不足负索引缺陷并处理边界输入", function () {
  assert.equal(Polyfill.startsWith("arm_L", "arm"), true);
  assert.equal(Polyfill.startsWith("arm_L", ""), true);
  assert.equal(Polyfill.startsWith("arm", "arm_L"), false);
  assert.equal(Polyfill.startsWith(null, "a"), false);

  assert.equal(Polyfill.endsWith("hero.png", ".png"), true);
  assert.equal(Polyfill.endsWith("hero.png", ""), true);
  // 关键边界：suffix 长度大于源串长度时不得受负索引影响误判为 true
  assert.equal(Polyfill.endsWith("a", "ba"), false);
  assert.equal(Polyfill.endsWith("a", "aa"), false);
  assert.equal(Polyfill.endsWith(undefined, ".png"), false);
});

test("indexOf / map / filter / forEach 应符合 ES5 语义且不修改原数组", function () {
  var arr = [10, "10", 20, 30];
  assert.equal(Polyfill.indexOf(arr, 10), 0);
  assert.equal(Polyfill.indexOf(arr, "10"), 1);
  assert.equal(Polyfill.indexOf(arr, 20, -2), 2);
  assert.equal(Polyfill.indexOf(arr, 99), -1);
  assert.equal(Polyfill.indexOf(null, 1), -1);

  var ctx = { factor: 2 };
  var mapped = Polyfill.map([1, 2, 3], function (v, idx) {
    return v * this.factor + idx;
  }, ctx);
  assert.deepStrictEqual(mapped, [2, 5, 8]);

  var filtered = Polyfill.filter([1, 2, 3, 4], function (v) {
    return v % 2 === 0;
  });
  assert.deepStrictEqual(filtered, [2, 4]);

  var visited = [];
  Polyfill.forEach(["a", "b"], function (v, i) {
    visited.push(i + ":" + v);
  });
  assert.deepStrictEqual(visited, ["0:a", "1:b"]);
});

test("keys / hasOwn 应仅返回自有可枚举键并安全应对 hasOwnProperty 被覆写与 DontEnum", function () {
  function Base() {
    this.ownA = 1;
  }
  Base.prototype.protoProp = 999;
  var obj = new Base();
  obj.hasOwnProperty = null;
  obj.toString = function () { return "custom"; };

  assert.equal(Polyfill.hasOwn(obj, "ownA"), true);
  assert.equal(Polyfill.hasOwn(obj, "protoProp"), false);

  var k = Polyfill.keys(obj);
  assert.ok(Polyfill.indexOf(k, "ownA") !== -1);
  assert.ok(Polyfill.indexOf(k, "hasOwnProperty") !== -1);
  assert.ok(Polyfill.indexOf(k, "toString") !== -1);
  assert.equal(Polyfill.indexOf(k, "protoProp"), -1);
  assert.deepStrictEqual(Polyfill.keys(null), []);
});

test("isArray 与 clone 应正确深拷贝嵌套对象、Date、RegExp 及循环引用", function () {
  assert.equal(Polyfill.isArray([1, 2]), true);
  assert.equal(Polyfill.isArray({ length: 1 }), false);

  var original = {
    arr: [1, { b: "x" }],
    dt: new Date(1700000000000),
    re: /abc/gi
  };
  original.self = original;

  var copied = Polyfill.clone(original);
  assert.notEqual(copied, original);
  assert.notEqual(copied.arr, original.arr);
  assert.notEqual(copied.dt, original.dt);
  assert.notEqual(copied.re, original.re);
  assert.equal(copied.self, copied);
  assert.equal(copied.dt.getTime(), 1700000000000);
  assert.equal(copied.re.source, "abc");
  assert.equal(copied.re.global, true);
  assert.equal(copied.re.ignoreCase, true);

  copied.arr[1].b = "changed";
  assert.equal(original.arr[1].b, "x");
});

test("jsonStringify 应处理特殊转义、非有限数值、省略函数及循环引用抛错", function () {
  var payload = {
    text: "line1\n\"quoted\"\\slash\t\u2028",
    nanVal: NaN,
    infVal: Infinity,
    ok: true,
    nil: null,
    undef: undefined,
    fn: function () {},
    arr: [1, undefined, function () {}, "end"]
  };
  var jsonStr = Polyfill.jsonStringify(payload);
  var parsed = JSON.parse(jsonStr);
  assert.deepStrictEqual(parsed, {
    text: "line1\n\"quoted\"\\slash\t\u2028",
    nanVal: null,
    infVal: null,
    ok: true,
    nil: null,
    arr: [1, null, null, "end"]
  });
  assert.equal(Polyfill.jsonStringify(undefined), undefined);

  var cyclic = { name: "loop" };
  cyclic.self = cyclic;
  assert.throws(function () {
    Polyfill.jsonStringify(cyclic);
  }, /circular/i);
});
