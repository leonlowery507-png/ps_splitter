/**
 * @fileoverview node:vm 剥离型纯 ES3 沙箱构造与双加载模式校验器
 * 在物理删除 ES5+/ES6+ 全局与原型方法的纯 ES3 上下文中验证：
 *   模式 A：ExtendScript #include 全局顺序加载模式（无 module/exports/require）
 *   模式 B：CommonJS 独立模块 require() 加载模式
 */

"use strict";

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var CORE_LOAD_ORDER = [
  "polyfill_es3.js",
  "spine_tags.js",
  "naming_engine.js",
  "skeleton_templates.js",
  "skin_mapper.js",
  "alignment_math.js",
  "clip_chain_resolver.js",
  "preflight_validator.js",
  "sanitize_planner.js"
];

var STRIP_ES56_SCRIPT = [
  "(function () {",
  "  var root = this;",
  "  var globalsToStrip = [",
  "    'JSON', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Promise', 'Symbol', 'Proxy', 'Reflect',",
  "    'BigInt', 'Intl', 'ArrayBuffer', 'DataView', 'globalThis', 'queueMicrotask',",
  "    'structuredClone', 'URL', 'URLSearchParams', 'TextEncoder', 'TextDecoder', 'fetch'",
  "  ];",
  "  var i;",
  "  for (i = 0; i < globalsToStrip.length; i++) {",
  "    try { delete root[globalsToStrip[i]]; } catch (e) {}",
  "    try { if (typeof root[globalsToStrip[i]] !== 'undefined') root[globalsToStrip[i]] = undefined; } catch (e2) {}",
  "  }",
  "  var objStatic = ['keys','values','entries','assign','create','defineProperty','defineProperties','getOwnPropertyNames','getOwnPropertyDescriptor','getOwnPropertyDescriptors','getPrototypeOf','setPrototypeOf','freeze','seal','preventExtensions','isFrozen','isSealed','isExtensible','hasOwn','is','fromEntries'];",
  "  for (i = 0; i < objStatic.length; i++) { try { delete Object[objStatic[i]]; } catch (e) {} }",
  "  var arrStatic = ['isArray','from','of'];",
  "  for (i = 0; i < arrStatic.length; i++) { try { delete Array[arrStatic[i]]; } catch (e) {} }",
  "  var arrProto = ['map','filter','forEach','reduce','reduceRight','some','every','indexOf','lastIndexOf','includes','find','findIndex','findLast','findLastIndex','flat','flatMap','fill','copyWithin','entries','keys','values','at','toReversed','toSorted','toSpliced','with'];",
  "  for (i = 0; i < arrProto.length; i++) { try { delete Array.prototype[arrProto[i]]; } catch (e) {} }",
  "  var strProto = ['trim','trimStart','trimEnd','trimLeft','trimRight','startsWith','endsWith','includes','repeat','padStart','padEnd','replaceAll','matchAll','at','codePointAt'];",
  "  for (i = 0; i < strProto.length; i++) { try { delete String.prototype[strProto[i]]; } catch (e) {} }",
  "  try { delete Function.prototype.bind; } catch (e) {}",
  "  try { delete Date.now; } catch (e) {}",
  "  try { delete Date.prototype.toISOString; } catch (e) {}",
  "  try { delete Date.prototype.toJSON; } catch (e) {}",
  "  try { delete Number.isNaN; delete Number.isFinite; delete Number.isInteger; } catch (e) {}",
  "  try { delete String.fromCodePoint; delete String.raw; } catch (e) {}",
  "})();"
].join("\n");

/**
 * 创建已物理剥离 ES5+/ES6+ 运行时 API 的纯净 ES3 vm 上下文
 * @returns {Object} vm Context
 */
function createES3Sandbox() {
  var ctx = vm.createContext({});
  vm.runInContext(STRIP_ES56_SCRIPT, ctx, { filename: "strip_es56.js" });
  return ctx;
}

/**
 * 将 vm Realm 返回值深转换为当前宿主 Realm 的纯对象/数组（规避 assert.deepStrictEqual 跨 Realm 失败）
 * @param {*} val vm 上下文返回值
 * @returns {*} 宿主 Realm 纯对象
 */
function toHostPlain(val) {
  if (val === null || val === undefined || typeof val !== "object") {
    return val;
  }
  var tag = Object.prototype.toString.call(val);
  if (tag === "[object Array]") {
    var arr = [];
    var i;
    for (i = 0; i < val.length; i++) {
      arr.push(toHostPlain(val[i]));
    }
    return arr;
  }
  if (tag === "[object Date]") {
    return new Date(val.getTime());
  }
  if (tag === "[object RegExp]") {
    return new RegExp(val.source, (val.global ? "g" : "") + (val.ignoreCase ? "i" : "") + (val.multiline ? "m" : ""));
  }
  var out = {};
  var k;
  for (k in val) {
    if (Object.prototype.hasOwnProperty.call(val, k)) {
      out[k] = toHostPlain(val[k]);
    }
  }
  return out;
}

/**
 * 模式 A：模拟 ExtendScript #include 顺序加载全部核心模块（无 module/exports/require）
 * @param {string} coreDir src/core 绝对路径
 * @returns {Object} 加载完成后的 vm Context
 */
function loadCoreIncludeMode(coreDir) {
  var ctx = createES3Sandbox();
  var i;
  for (i = 0; i < CORE_LOAD_ORDER.length; i++) {
    var fileName = CORE_LOAD_ORDER[i];
    var fullPath = path.join(coreDir, fileName);
    var code = fs.readFileSync(fullPath, "utf8");
    vm.runInContext(code, ctx, { filename: fullPath });
  }
  return ctx;
}

/**
 * 模式 B：在剥离型 ES3 沙箱内通过隔离 CommonJS 加载器单独加载指定模块
 * @param {string} coreDir src/core 绝对路径
 * @param {string} entryFileName 目标模块文件名
 * @returns {{ctx:Object, exported:*}} 沙箱上下文与导出对象
 */
function loadCoreCommonJSModule(coreDir, entryFileName) {
  var ctx = createES3Sandbox();
  var cache = {};

  function sandboxRequire(requestId) {
    var resolved = path.resolve(coreDir, requestId);
    if (resolved.indexOf(path.resolve(coreDir)) !== 0) {
      throw new Error("Sandbox require restricted to coreDir: " + requestId);
    }
    if (Object.prototype.hasOwnProperty.call(cache, resolved)) {
      return cache[resolved].exports;
    }
    var modObj = { exports: {} };
    cache[resolved] = modObj;
    var code = fs.readFileSync(resolved, "utf8");
    var wrapped = "(function (exports, require, module, __filename, __dirname) {\n" + code + "\n});";
    var fn = vm.runInContext(wrapped, ctx, { filename: resolved });
    fn(modObj.exports, sandboxRequire, modObj, resolved, path.dirname(resolved));
    return modObj.exports;
  }

  var exported = sandboxRequire("./" + entryFileName);
  return {
    ctx: ctx,
    exported: exported
  };
}

module.exports = {
  CORE_LOAD_ORDER: CORE_LOAD_ORDER,
  createES3Sandbox: createES3Sandbox,
  toHostPlain: toHostPlain,
  loadCoreIncludeMode: loadCoreIncludeMode,
  loadCoreCommonJSModule: loadCoreCommonJSModule
};
