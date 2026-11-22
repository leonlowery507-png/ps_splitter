/**
 * @fileoverview ES3 合规性静态审计与沙箱测试套件（node:test）
 * 覆盖 src/core/*.js、src/host/*.js、src/ui/*.js 及 src/entries/*.jsx 全量源码。
 */

"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var auditor = require("./es3_auditor.js");
var sandbox = require("./vm_es3_sandbox.js");

var PROJECT_ROOT = path.resolve(__dirname, "../..");
var CORE_DIR = path.join(PROJECT_ROOT, "src", "core");
var HOST_DIR = path.join(PROJECT_ROOT, "src", "host");
var UI_DIR = path.join(PROJECT_ROOT, "src", "ui");
var ENTRIES_DIR = path.join(PROJECT_ROOT, "src", "entries");

test("1. src/core/*.js 全部模块通过严格 ES3 静态语法、API 与零宿主污染审计", function () {
  var entries = fs.readdirSync(CORE_DIR).filter(function (f) {
    return f.slice(-3) === ".js";
  });
  assert.equal(entries.length, 9, "应包含全部 9 个 core 模块");

  var i;
  for (i = 0; i < entries.length; i++) {
    var fp = path.join(CORE_DIR, entries[i]);
    var src = fs.readFileSync(fp, "utf8");
    var res = auditor.auditSource(src, "src/core/" + entries[i], {
      checkHostPollution: true,
      allowDirectives: false
    });
    assert.equal(
      res.passed,
      true,
      "模块 " + entries[i] + " 存在 ES3 违规: " + JSON.stringify(res.violations)
    );
  }
});

test("2. src/host/*.js、src/ui/*.js 与 src/entries/*.jsx 全部通过 ES3 语法审计、UTF-8 BOM 检查与 //@include 闭合校验", function () {
  var dirs = [
    { dir: HOST_DIR, prefix: "src/host/", allowDirectives: false },
    { dir: UI_DIR, prefix: "src/ui/", allowDirectives: false },
    { dir: ENTRIES_DIR, prefix: "src/entries/", allowDirectives: true }
  ];

  var d;
  for (d = 0; d < dirs.length; d++) {
    var item = dirs[d];
    var files = fs.readdirSync(item.dir).filter(function (f) {
      return /\.(js|jsx)$/i.test(f);
    });
    assert.ok(files.length > 0, item.prefix + " 目录下应包含脚本文件");

    var i;
    for (i = 0; i < files.length; i++) {
      var fp = path.join(item.dir, files[i]);
      var rawBuf = fs.readFileSync(fp);
      var hasBom = rawBuf.length >= 3 && rawBuf[0] === 0xEF && rawBuf[1] === 0xBB && rawBuf[2] === 0xBF;
      assert.equal(hasBom, true, item.prefix + files[i] + " 必须包含 UTF-8 BOM 以防中文 Photoshop 乱码");

      var src = rawBuf.toString("utf8");
      var res = auditor.auditSource(src, item.prefix + files[i], {
        checkHostPollution: false,
        allowDirectives: item.allowDirectives
      });
      assert.equal(
        res.passed,
        true,
        item.prefix + files[i] + " 存在 ES3 违规: " + JSON.stringify(res.violations)
      );

      if (item.prefix === "src/entries/") {
        var includeRe = /^[ \t]*\/\/@include\s+"([^"]+)"/gm;
        var match;
        var includeCount = 0;
        while ((match = includeRe.exec(src)) !== null) {
          includeCount++;
          var targetPath = path.resolve(item.dir, match[1]);
          assert.equal(
            fs.existsSync(targetPath),
            true,
            item.prefix + files[i] + " 引用的 //@include 路径不存在: " + match[1]
          );
        }
        assert.ok(includeCount >= 6, item.prefix + files[i] + " 应至少包含 6 条 //@include 依赖声明");
      }
    }
  }
});

test("3. 审计器负向自测：必须拦截全部常见 ES5+/ES6+ 语法、API 与宿主污染", function () {
  var badSamples = [
    { name: "let/const", code: "let a = 1; const b = 2;", rule: "ES6_KEYWORD" },
    { name: "arrow", code: "var f = (x) => x + 1;", rule: "ES6_OPERATOR" },
    { name: "template", code: "var s = `hello ${x}`;", rule: "ILLEGAL_TEMPLATE_LITERAL" },
    { name: "trailing comma obj", code: "var o = { a: 1, };", rule: "TRAILING_COMMA_OBJECT" },
    { name: "trailing comma arr", code: "var a = [1, 2, ];", rule: "TRAILING_COMMA_ARRAY" },
    { name: "destructuring var", code: "var { a, b } = obj;", rule: "ES6_VAR_DESTRUCTURING" },
    { name: "default param", code: "function foo(a = 1) { return a; }", rule: "ES6_PARAM_SYNTAX" },
    { name: "for..of", code: "for (var x of list) {}", rule: "ES6_FOR_OF" },
    { name: "arr.map", code: "var b = arr.map(function (x) { return x; });", rule: "ES5_PROTO_METHOD" },
    { name: "JSON.stringify", code: "var s = JSON.stringify(obj);", rule: "ES5_GLOBAL" },
    { name: "Object.keys", code: "var k = Object.keys(obj);", rule: "ES5_STATIC_METHOD" },
    { name: "reserved dot", code: "var x = obj.default;", rule: "ES3_RESERVED_PROPERTY" },
    { name: "reserved key", code: "var o = { default: 1 };", rule: "ES3_RESERVED_OBJECT_KEY" },
    { name: "ps host", code: "var d = app.activeDocument;", rule: "HOST_GLOBAL_POLLUTION" },
    { name: "Array.prototype.indexOf", code: "var fn = Array.prototype.indexOf;", rule: "ES5_ARRAY_INDEXOF" }
  ];

  var i;
  for (i = 0; i < badSamples.length; i++) {
    var sample = badSamples[i];
    var res = auditor.auditSource(sample.code, "bad_" + i + ".js", { checkHostPollution: true });
    assert.equal(res.passed, false, "负向样本未被拦截: " + sample.name);
    var hasExpectedRule = res.violations.some(function (v) {
      return v.rule === sample.rule;
    });
    assert.equal(
      hasExpectedRule,
      true,
      "样本 [" + sample.name + "] 预期规则 " + sample.rule + "，实际: " + JSON.stringify(res.violations)
    );
  }
});

test("4. 审计器正向自测：注释、字符串、复杂正则、Polyfill 调用与合法除法不得误报", function () {
  var goodCode = [
    "// 注释里写 let const => [1,] arr.map() JSON.stringify(x) app.activeDocument",
    "/* 多行注释 { default: 1, } */",
    "var str = \"let const => {a:1,} [1,] arr.map() obj.default\";",
    "var re1 = /[\\\\:\"*?<>|]/g;",
    "var re2 = /\\[([^\\]]+)\\]/g;",
    "var num = 10 / 2;",
    "if (num > 0) /abc/i.test(str);",
    "var obj = { \"default\": 1, normalKey: [1, 2], nested: { ok: true } };",
    "var idx = \"abc\".indexOf(\"b\");",
    "var mapped = PSSplitter.Core.Polyfill.map([1, 2], function (x) { return x * 2; });",
    "var probe = (typeof $ !== \"undefined\" && $.global) ? $.global : this;",
    "if (typeof module !== \"undefined\" && module.exports) { module.exports = obj; }"
  ].join("\n");

  var res = auditor.auditSource(goodCode, "good_sample.js", { checkHostPollution: true });
  assert.equal(res.passed, true, "合法 ES3 样本被误报: " + JSON.stringify(res.violations));
});

test("5. 剥离型 node:vm ES3 沙箱：模式 A (#include 全局顺序加载) 完整挂载并可执行", function () {
  var ctx = sandbox.loadCoreIncludeMode(CORE_DIR);

  assert.equal(vm.runInContext("typeof JSON", ctx), "undefined");
  assert.equal(vm.runInContext("typeof Object.keys", ctx), "undefined");
  assert.equal(vm.runInContext("typeof Array.prototype.indexOf", ctx), "undefined");
  assert.equal(vm.runInContext("typeof Array.prototype.map", ctx), "undefined");
  assert.equal(vm.runInContext("typeof String.prototype.trim", ctx), "undefined");
  assert.equal(vm.runInContext("typeof app", ctx), "undefined");

  var namespaces = [
    "Polyfill",
    "SpineTags",
    "NamingEngine",
    "SkeletonTemplates",
    "SkinMapper",
    "AlignmentMath",
    "ClipChainResolver",
    "PreflightValidator",
    "SanitizePlanner"
  ];
  var i;
  for (i = 0; i < namespaces.length; i++) {
    var nsType = vm.runInContext("typeof PSSplitter.Core." + namespaces[i], ctx);
    assert.equal(nsType, "object", "缺失命名空间 PSSplitter.Core." + namespaces[i]);
  }
});

test("6. 剥离型 node:vm ES3 沙箱：模式 B (CommonJS 独立模块逐个加载) 均成功导出", function () {
  var i;
  for (i = 0; i < sandbox.CORE_LOAD_ORDER.length; i++) {
    var fileName = sandbox.CORE_LOAD_ORDER[i];
    var res = sandbox.loadCoreCommonJSModule(CORE_DIR, fileName);
    assert.ok(res && res.exported, "模块未能通过 CommonJS 导出: " + fileName);
  }
});
