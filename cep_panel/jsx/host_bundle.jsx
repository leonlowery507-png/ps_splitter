// SpineSplitter CEP Host Bundle (Auto-Generated ES3)

// --- BEGIN core\polyfill_es3.js ---
/**
 * @fileoverview Pure ES3 基础兼容库（PSSplitter.Core.Polyfill）
 * 提供 ExtendScript (ES3) 环境下缺失的数组、字符串、对象与 JSON 基础工具，
 * 零原生原型污染、零宿主依赖，支持 ExtendScript #include 与 Node.js CommonJS 双模式加载。
 */

(function () {
  var rootScope = (typeof $ !== "undefined" && $.global)
    ? $.global
    : (typeof global !== "undefined" ? global : (function () { return this; }()));
  rootScope.PSSplitter = rootScope.PSSplitter || {};
  rootScope.PSSplitter.Core = rootScope.PSSplitter.Core || {};
  var PSSplitter = rootScope.PSSplitter;

  var objToString = Object.prototype.toString;
  var objHasOwn = Object.prototype.hasOwnProperty;

  // ES3 环境在枚举对象属性时可能遗漏的 DontEnum 属性列表
  var DONT_ENUM_KEYS = [
    "toString",
    "toLocaleString",
    "valueOf",
    "hasOwnProperty",
    "isPrototypeOf",
    "propertyIsEnumerable",
    "constructor"
  ];

  /**
   * 安全判断对象自身是否包含指定属性（防止对象覆写 hasOwnProperty）
   * @param {*} obj 目标对象
   * @param {string} key 属性名
   * @returns {boolean} 是否为自有属性
   */
  function hasOwn(obj, key) {
    if (obj === null || obj === undefined) {
      return false;
    }
    return objHasOwn.call(obj, key);
  }

  /**
   * 判断值是否为原生数组（跨 vm Realm 安全）
   * @param {*} v 待检测值
   * @returns {boolean} 是否为数组
   */
  function isArray(v) {
    return objToString.call(v) === "[object Array]";
  }

  /**
   * 去除字符串首尾空白字符（含 BOM 与不换行空格）
   * @param {*} s 输入值
   * @returns {string} 去除首尾空白后的字符串
   */
  function trim(s) {
    if (s === null || s === undefined) {
      return "";
    }
    return String(s).replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
  }

  /**
   * 判断字符串是否以指定前缀开头
   * @param {string} s 源字符串
   * @param {string} prefix 前缀字符串
   * @returns {boolean} 是否匹配前缀
   */
  function startsWith(s, prefix) {
    if (s === null || s === undefined || prefix === null || prefix === undefined) {
      return false;
    }
    var str = String(s);
    var p = String(prefix);
    if (p.length === 0) {
      return true;
    }
    if (str.length < p.length) {
      return false;
    }
    return str.slice(0, p.length) === p;
  }

  /**
   * 判断字符串是否以指定后缀结尾（已修复长度不足时的负索引边界缺陷）
   * @param {string} s 源字符串
   * @param {string} suffix 后缀字符串
   * @returns {boolean} 是否匹配后缀
   */
  function endsWith(s, suffix) {
    if (s === null || s === undefined || suffix === null || suffix === undefined) {
      return false;
    }
    var str = String(s);
    var suf = String(suffix);
    if (suf.length === 0) {
      return true;
    }
    if (str.length < suf.length) {
      return false;
    }
    return str.slice(str.length - suf.length) === suf;
  }

  /**
   * 在数组中查找元素首次出现的索引（严格全等 ===）
   * @param {Array} arr 目标数组
   * @param {*} item 待查找元素
   * @param {number} [fromIndex] 起始查找索引（支持负数）
   * @returns {number} 元素索引，未找到返回 -1
   */
  function indexOf(arr, item, fromIndex) {
    if (arr === null || arr === undefined || typeof arr.length !== "number") {
      return -1;
    }
    var len = arr.length >>> 0;
    if (len === 0) {
      return -1;
    }
    var start = 0;
    if (typeof fromIndex === "number" && !isNaN(fromIndex)) {
      start = fromIndex >= 0 ? Math.floor(fromIndex) : Math.ceil(fromIndex);
      if (start < 0) {
        start = Math.max(0, len + start);
      }
    }
    var i;
    for (i = start; i < len; i++) {
      if (i in arr && arr[i] === item) {
        return i;
      }
    }
    return -1;
  }

  /**
   * 遍历数组并逐项执行回调
   * @param {Array} arr 目标数组
   * @param {Function} fn 回调函数 (item, index, array)
   * @param {*} [thisArg] 回调绑定上下文
   */
  function forEach(arr, fn, thisArg) {
    if (arr === null || arr === undefined || typeof arr.length !== "number" || typeof fn !== "function") {
      return;
    }
    var len = arr.length >>> 0;
    var i;
    for (i = 0; i < len; i++) {
      if (i in arr) {
        fn.call(thisArg, arr[i], i, arr);
      }
    }
  }

  /**
   * 将数组按映射函数转换为新数组
   * @param {Array} arr 源数组
   * @param {Function} fn 映射函数 (item, index, array)
   * @param {*} [thisArg] 回调绑定上下文
   * @returns {Array} 映射后的新数组
   */
  function map(arr, fn, thisArg) {
    if (arr === null || arr === undefined || typeof arr.length !== "number" || typeof fn !== "function") {
      return [];
    }
    var len = arr.length >>> 0;
    var result = new Array(len);
    var i;
    for (i = 0; i < len; i++) {
      if (i in arr) {
        result[i] = fn.call(thisArg, arr[i], i, arr);
      }
    }
    return result;
  }

  /**
   * 按条件过滤数组并返回满足条件的新数组
   * @param {Array} arr 源数组
   * @param {Function} fn 过滤函数 (item, index, array)
   * @param {*} [thisArg] 回调绑定上下文
   * @returns {Array} 过滤后的新数组
   */
  function filter(arr, fn, thisArg) {
    if (arr === null || arr === undefined || typeof arr.length !== "number" || typeof fn !== "function") {
      return [];
    }
    var len = arr.length >>> 0;
    var result = [];
    var i;
    for (i = 0; i < len; i++) {
      if (i in arr) {
        if (fn.call(thisArg, arr[i], i, arr)) {
          result.push(arr[i]);
        }
      }
    }
    return result;
  }

  /**
   * 获取对象所有自有可枚举属性名（兼容 ES3 DontEnum 覆写场景）
   * @param {*} obj 目标对象
   * @returns {Array<string>} 属性名数组
   */
  function keys(obj) {
    if (obj === null || obj === undefined) {
      return [];
    }
    var t = typeof obj;
    if (t !== "object" && t !== "function") {
      return [];
    }
    var out = [];
    var k;
    for (k in obj) {
      if (hasOwn(obj, k)) {
        out.push(k);
      }
    }
    var i;
    for (i = 0; i < DONT_ENUM_KEYS.length; i++) {
      var dk = DONT_ENUM_KEYS[i];
      if (hasOwn(obj, dk) && indexOf(out, dk) === -1) {
        out.push(dk);
      }
    }
    return out;
  }

  /**
   * 递归深拷贝值（支持原始值、Date、RegExp、Array、普通对象，处理循环引用）
   * @param {*} obj 待拷贝的值
   * @returns {*} 深拷贝副本
   */
  function clone(obj) {
    var srcList = [];
    var copyList = [];

    function cloneInner(val) {
      if (val === null || val === undefined) {
        return val;
      }
      var t = typeof val;
      if (t !== "object") {
        return val;
      }
      var tag = objToString.call(val);
      if (tag === "[object Date]") {
        return new Date(val.getTime());
      }
      if (tag === "[object RegExp]") {
        var flags = "";
        if (val.global) { flags += "g"; }
        if (val.ignoreCase) { flags += "i"; }
        if (val.multiline) { flags += "m"; }
        return new RegExp(val.source, flags);
      }
      var existingIdx = indexOf(srcList, val);
      if (existingIdx !== -1) {
        return copyList[existingIdx];
      }
      var copy;
      var i;
      if (isArray(val)) {
        copy = [];
        srcList.push(val);
        copyList.push(copy);
        for (i = 0; i < val.length; i++) {
          if (i in val) {
            copy[i] = cloneInner(val[i]);
          }
        }
        return copy;
      }
      copy = {};
      srcList.push(val);
      copyList.push(copy);
      var propKeys = keys(val);
      for (i = 0; i < propKeys.length; i++) {
        var pk = propKeys[i];
        copy[pk] = cloneInner(val[pk]);
      }
      return copy;
    }

    return cloneInner(obj);
  }

  /**
   * 将数字左填充零至指定长度
   * @param {string} str 原十六进制字符串
   * @param {number} len 目标长度
   * @returns {string} 补零结果
   */
  function padZeroLeft(str, len) {
    var s = str;
    while (s.length < len) {
      s = "0" + s;
    }
    return s;
  }

  /**
   * 将字符串转义为合法 JSON 字符串字面量
   * @param {string} s 原字符串
   * @returns {string} 带双引号的 JSON 字符串
   */
  function quoteJsonString(s) {
    var out = "\"";
    var i;
    for (i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      var code = s.charCodeAt(i);
      if (ch === "\"") {
        out += "\\\"";
      } else if (ch === "\\") {
        out += "\\\\";
      } else if (ch === "\b") {
        out += "\\b";
      } else if (ch === "\f") {
        out += "\\f";
      } else if (ch === "\n") {
        out += "\\n";
      } else if (ch === "\r") {
        out += "\\r";
      } else if (ch === "\t") {
        out += "\\t";
      } else if (code < 0x20 || code === 0x2028 || code === 0x2029) {
        out += "\\u" + padZeroLeft(code.toString(16), 4);
      } else {
        out += ch;
      }
    }
    out += "\"";
    return out;
  }

  /**
   * 纯 ES3 JSON 序列化实现（含循环引用检测与控制字符转义）
   * @param {*} val 待序列化值
   * @returns {string|undefined} JSON 字符串；顶层 undefined/function 返回 undefined
   */
  function jsonStringify(val) {
    var stack = [];

    function stringifyInner(v) {
      if (v === null) {
        return "null";
      }
      var t = typeof v;
      if (t === "undefined" || t === "function") {
        return undefined;
      }
      if (t === "boolean") {
        return v ? "true" : "false";
      }
      if (t === "number") {
        return isFinite(v) ? String(v) : "null";
      }
      if (t === "string") {
        return quoteJsonString(v);
      }
      if (indexOf(stack, v) !== -1) {
        throw new Error("Converting circular structure to JSON");
      }
      stack.push(v);
      try {
        var i;
        if (isArray(v)) {
          var arrParts = [];
          for (i = 0; i < v.length; i++) {
            var itemStr = stringifyInner(v[i]);
            arrParts.push(itemStr === undefined ? "null" : itemStr);
          }
          return "[" + arrParts.join(",") + "]";
        }
        var objParts = [];
        var propKeys = keys(v);
        for (i = 0; i < propKeys.length; i++) {
          var k = propKeys[i];
          var propStr = stringifyInner(v[k]);
          if (propStr !== undefined) {
            objParts.push(quoteJsonString(k) + ":" + propStr);
          }
        }
        return "{" + objParts.join(",") + "}";
      } finally {
        stack.pop();
      }
    }

    return stringifyInner(val);
  }

  /**
   * 转义字符串中的正则表达式元字符
   * @param {string} s 原字符串
   * @returns {string} 转义后的安全正则文本
   */
  function escapeRegExp(s) {
    if (s === null || s === undefined) {
      return "";
    }
    return String(s).replace(/([.*+?^${}()|[\]\\])/g, "\\$1");
  }

  /**
   * 精确计算字符串在 UTF-8 编码下的字节长度（支持 UTF-16 代理对）
   * @param {string} s 输入字符串
   * @returns {number} UTF-8 字节数
   */
  function utf8ByteLength(s) {
    if (s === null || s === undefined) {
      return 0;
    }
    var str = String(s);
    var bytes = 0;
    var i;
    for (i = 0; i < str.length; i++) {
      var code = str.charCodeAt(i);
      if (code < 0x80) {
        bytes += 1;
      } else if (code < 0x800) {
        bytes += 2;
      } else if (code >= 0xD800 && code <= 0xDBFF && i + 1 < str.length) {
        var next = str.charCodeAt(i + 1);
        if (next >= 0xDC00 && next <= 0xDFFF) {
          bytes += 4;
          i++;
        } else {
          bytes += 3;
        }
      } else {
        bytes += 3;
      }
    }
    return bytes;
  }

  PSSplitter.Core.Polyfill = {
    hasOwn: hasOwn,
    isArray: isArray,
    trim: trim,
    startsWith: startsWith,
    endsWith: endsWith,
    indexOf: indexOf,
    forEach: forEach,
    map: map,
    filter: filter,
    keys: keys,
    clone: clone,
    jsonStringify: jsonStringify,
    escapeRegExp: escapeRegExp,
    utf8ByteLength: utf8ByteLength
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = PSSplitter.Core.Polyfill;
  }
})();

// --- END core\polyfill_es3.js ---

// --- BEGIN core\spine_tags.js ---
/**
 * @fileoverview Spine 官方 12 标签解析与装配引擎（PSSplitter.Core.SpineTags）
 * 严格对齐 PhotoshopToSpine.jsx v7.42 标签白名单、大小写敏感校验及分组权限约束。
 */

(function () {
  var rootScope = (typeof $ !== "undefined" && $.global)
    ? $.global
    : (typeof global !== "undefined" ? global : (function () { return this; }()));
  rootScope.PSSplitter = rootScope.PSSplitter || {};
  rootScope.PSSplitter.Core = rootScope.PSSplitter.Core || {};
  var PSSplitter = rootScope.PSSplitter;

  /**
   * 懒加载获取 Polyfill 模块（兼容 ExtendScript #include 与 CommonJS require）
   * @returns {Object} Polyfill 模块对象
   */
  function getPolyfill() {
    if (PSSplitter && PSSplitter.Core && PSSplitter.Core.Polyfill) {
      return PSSplitter.Core.Polyfill;
    }
    if (typeof require === "function") {
      return require("./polyfill_es3.js");
    }
    throw new Error("PSSplitter.Core.Polyfill is required");
  }

  /**
   * Spine 官方支持的 12 个图层/组标签白名单（全小写）
   * @type {Array<string>}
   */
  var OFFICIAL_TAGS = [
    "bone",
    "slot",
    "skin",
    "folder",
    "merge",
    "ignore",
    "overlay",
    "trim",
    "mesh",
    "scale",
    "name",
    "path"
  ];

  // 序列化输出顺序（语义优先级从作用域到附件修饰）
  var SERIALIZE_ORDER = [
    "ignore",
    "skin",
    "bone",
    "slot",
    "folder",
    "merge",
    "overlay",
    "trim",
    "mesh",
    "scale",
    "name",
    "path"
  ];

  var NO_ARG_TAGS = ["ignore", "overlay", "merge"];
  var REQUIRED_ARG_TAGS = ["scale", "name", "path"];
  var POSITIVE_FLOAT_RE = /^(?:\d+(?:\.\d*)?|\.\d+)$/;

  /**
   * 校验 [scale:val] 参数是否为有限正数
   * @param {string} val 参数文本
   * @returns {boolean} 是否有效
   */
  function isValidPositiveScale(val) {
    if (typeof val !== "string" || !POSITIVE_FLOAT_RE.test(val)) {
      return false;
    }
    var num = parseFloat(val);
    return !isNaN(num) && isFinite(num) && num > 0;
  }

  /**
   * 剥离图层或组名中的全部 [...] 标签并折叠多余空白
   * @param {string} rawName 原始图层名
   * @returns {string} 清洗后的名称
   */
  function stripAllTags(rawName) {
    var P = getPolyfill();
    if (rawName === null || rawName === undefined) {
      return "";
    }
    var stripped = String(rawName).replace(/\[[^\]]*\]/g, " ").replace(/\s+/g, " ");
    return P.trim(stripped);
  }

  /**
   * 解析图层或组名称中的 Spine 官方标签，返回结构化标签与校验结果
   * @param {string} rawName 原始图层/组名称
   * @param {boolean} isGroup 是否为图层组 (LayerSet)
   * @returns {{rawName:string, cleanName:string, tags:Array, invalidTags:Array, errors:Array, warnings:Array}}
   */
  function parseLayerName(rawName, isGroup) {
    var P = getPolyfill();
    var str = (rawName === null || rawName === undefined) ? "" : String(rawName);
    var groupFlag = !!isGroup;
    var tags = [];
    var invalidTags = [];
    var errors = [];
    var warnings = [];

    // 检测未闭合括号（先移除所有成对的 [...]）
    var remainder = str.replace(/\[[^\]]*\]/g, "");
    if (remainder.indexOf("[") !== -1 || remainder.indexOf("]") !== -1) {
      warnings.push("图层名称存在未闭合的方括号");
    }

    var re = /\[([^\]]*)\]/g;
    var match;
    var hasMergeTag = false;
    var hasPathOnGroup = false;

    while ((match = re.exec(str)) !== null) {
      var fullMatch = match[0];
      var inner = match[1];
      var trimmedInner = P.trim(inner);

      if (trimmedInner === "") {
        invalidTags.push(fullMatch);
        errors.push("存在空方括号标签: " + fullMatch);
        continue;
      }

      var colonIdx = inner.indexOf(":");
      var hasColon = colonIdx !== -1;
      var rawKey = hasColon ? P.trim(inner.slice(0, colonIdx)) : trimmedInner;
      var rawVal = hasColon ? P.trim(inner.slice(colonIdx + 1)) : null;
      var lowerKey = rawKey.toLowerCase();

      if (lowerKey === "notrim") {
        invalidTags.push(fullMatch);
        errors.push("不支持 [notrim]，请使用 [trim:false]");
        continue;
      }

      if (P.indexOf(OFFICIAL_TAGS, lowerKey) === -1) {
        invalidTags.push(fullMatch);
        errors.push("未知 Spine 标签: " + fullMatch);
        continue;
      }

      if (rawKey !== lowerKey) {
        invalidTags.push(fullMatch);
        errors.push("Spine 标签名必须全小写: " + fullMatch);
        continue;
      }

      if (hasColon && rawVal === "") {
        invalidTags.push(fullMatch);
        errors.push("标签参数不能为空: " + fullMatch);
        continue;
      }

      if (P.indexOf(NO_ARG_TAGS, rawKey) !== -1) {
        if (hasColon) {
          invalidTags.push(fullMatch);
          errors.push("标签 [" + rawKey + "] 不允许带参数: " + fullMatch);
          continue;
        }
        if (rawKey === "merge") {
          hasMergeTag = true;
          if (!groupFlag) {
            warnings.push("普通图层上的 [merge] 仅作兼容容错，建议仅用于图层组");
          }
        }
        tags.push({ key: rawKey, value: null, raw: fullMatch });
        continue;
      }

      if (P.indexOf(REQUIRED_ARG_TAGS, rawKey) !== -1 && !hasColon) {
        invalidTags.push(fullMatch);
        errors.push("标签 [" + rawKey + "] 必须提供冒号参数: " + fullMatch);
        continue;
      }

      if (rawKey === "name") {
        if (!groupFlag) {
          invalidTags.push(fullMatch);
          errors.push("标签 [name:pattern] 仅允许用于图层组 (groupOnlyTag): " + fullMatch);
          continue;
        }
        if (rawVal.indexOf("*") === -1) {
          invalidTags.push(fullMatch);
          errors.push("标签 [name:pattern] 必须包含通配符 '*': " + fullMatch);
          continue;
        }
        tags.push({ key: "name", value: rawVal, raw: fullMatch });
        continue;
      }

      if (rawKey === "scale") {
        if (!isValidPositiveScale(rawVal)) {
          invalidTags.push(fullMatch);
          errors.push("标签 [scale] 必须为大于 0 的有限正数: " + fullMatch);
          continue;
        }
        tags.push({ key: "scale", value: rawVal, raw: fullMatch });
        continue;
      }

      if (rawKey === "trim") {
        if (hasColon && rawVal !== "false" && rawVal !== "true") {
          invalidTags.push(fullMatch);
          errors.push("标签 [trim] 仅允许无参数或小写 [trim:false] / [trim:true]: " + fullMatch);
          continue;
        }
        tags.push({ key: "trim", value: hasColon ? rawVal : null, raw: fullMatch });
        continue;
      }

      if (rawKey === "skin") {
        if (hasColon && rawVal.toLowerCase() === "default") {
          warnings.push("皮肤名不得使用保留字 default: " + fullMatch);
        }
        tags.push({ key: "skin", value: hasColon ? rawVal : null, raw: fullMatch });
        continue;
      }

      if (rawKey === "path") {
        if (groupFlag) {
          hasPathOnGroup = true;
        }
        tags.push({ key: "path", value: rawVal, raw: fullMatch });
        continue;
      }

      // bone, slot, folder, mesh
      tags.push({ key: rawKey, value: hasColon ? rawVal : null, raw: fullMatch });
    }

    if (hasPathOnGroup && !hasMergeTag) {
      warnings.push("普通非 [merge] 父组使用 [path:] 会被所有子图层继承并导致导出覆盖");
    }

    return {
      rawName: str,
      cleanName: stripAllTags(str),
      tags: tags,
      invalidTags: invalidTags,
      errors: errors,
      warnings: warnings
    };
  }

  /**
   * 格式化单个标签对象为标准 [key] 或 [key:value] 文本
   * @param {{key:string, value:*}} tag 标签对象
   * @returns {string} 格式化文本
   */
  function formatSingleTag(tag) {
    if (tag.key === "trim") {
      if (tag.value === false || tag.value === "false") {
        return "[trim:false]";
      }
      return "[trim]";
    }
    if (tag.value === null || tag.value === undefined || tag.value === "") {
      return "[" + tag.key + "]";
    }
    return "[" + tag.key + ":" + String(tag.value) + "]";
  }

  /**
   * 将纯名称与标签列表组装为规范的图层名
   * @param {string} cleanName 不含标签的纯名称
   * @param {Array<{key:string, value:*}>} tags 标签列表
   * @param {string} [position="suffix"] 标签位置："suffix" 或 "prefix"
   * @returns {string} 组装后的图层名称
   */
  function formatLayerName(cleanName, tags, position) {
    var P = getPolyfill();
    var clean = P.trim(cleanName === null || cleanName === undefined ? "" : String(cleanName));
    var pos = position === "prefix" ? "prefix" : "suffix";

    if (!P.isArray(tags) || tags.length === 0) {
      return clean;
    }

    // 按 key 去重（同 key 保留后者）并按官方序列化优先级排列
    var deduped = [];
    var i;
    var j;
    for (i = 0; i < tags.length; i++) {
      var t = tags[i];
      if (!t || !t.key) {
        continue;
      }
      var replaced = false;
      for (j = 0; j < deduped.length; j++) {
        if (deduped[j].key === t.key) {
          deduped[j] = { key: t.key, value: t.value };
          replaced = true;
          break;
        }
      }
      if (!replaced) {
        deduped.push({ key: t.key, value: t.value });
      }
    }

    if (deduped.length === 0) {
      return clean;
    }

    deduped.sort(function (a, b) {
      var ia = P.indexOf(SERIALIZE_ORDER, a.key);
      var ib = P.indexOf(SERIALIZE_ORDER, b.key);
      if (ia === -1) { ia = 999; }
      if (ib === -1) { ib = 999; }
      return ia - ib;
    });

    var formattedParts = P.map(deduped, formatSingleTag);
    var tagStr = formattedParts.join(" ");

    if (!clean) {
      return tagStr;
    }
    if (pos === "prefix") {
      return tagStr + " " + clean;
    }
    return clean + " " + tagStr;
  }

  /**
   * 检测原图层名中标签主要处于前缀还是后缀位置
   * @param {string} rawName 原图层名
   * @returns {string} "prefix" 或 "suffix"
   */
  function detectTagPosition(rawName) {
    var P = getPolyfill();
    var s = P.trim(rawName || "");
    if (P.startsWith(s, "[") && !P.endsWith(s, "]")) {
      return "prefix";
    }
    return "suffix";
  }

  /**
   * 在保留其余标签的前提下，幂等地设置、更新或移除指定官方标签
   * @param {string} rawName 原图层或组名
   * @param {boolean} isGroup 是否为图层组
   * @param {string} tagKey 目标标签键（全小写）
   * @param {*} tagValue 标签参数（无参数可传 null/undefined）
   * @param {boolean} enable true=启用或更新；false=移除
   * @returns {{ok:boolean, name:string, error:string|null}} 操作结果
   */
  function toggleOrSetTag(rawName, isGroup, tagKey, tagValue, enable) {
    var P = getPolyfill();
    var srcName = (rawName === null || rawName === undefined) ? "" : String(rawName);
    var groupFlag = !!isGroup;

    if (typeof tagKey !== "string" || tagKey === "") {
      return { ok: false, name: srcName, error: "标签键必须为非空字符串" };
    }
    if (tagKey === "notrim") {
      return { ok: false, name: srcName, error: "不支持 [notrim]，请改用 tagKey=\"trim\", tagValue=\"false\"" };
    }
    if (tagKey !== tagKey.toLowerCase()) {
      return { ok: false, name: srcName, error: "标签键必须全小写: " + tagKey };
    }
    if (P.indexOf(OFFICIAL_TAGS, tagKey) === -1) {
      return { ok: false, name: srcName, error: "未知 Spine 标签: " + tagKey };
    }

    var parsed = parseLayerName(srcName, groupFlag);
    var pos = detectTagPosition(srcName);

    if (!enable) {
      var remaining = P.filter(parsed.tags, function (item) {
        return item.key !== tagKey;
      });
      return {
        ok: true,
        name: formatLayerName(parsed.cleanName, remaining, pos),
        error: null
      };
    }

    // 主动注入权限与参数严格校验
    if (!groupFlag && (tagKey === "name" || tagKey === "merge")) {
      return {
        ok: false,
        name: srcName,
        error: "普通图层不允许主动设置 [" + tagKey + "] 标签"
      };
    }

    var hasVal = tagValue !== null && tagValue !== undefined;
    var strVal = hasVal ? P.trim(String(tagValue)) : null;

    if (P.indexOf(NO_ARG_TAGS, tagKey) !== -1) {
      if (hasVal && strVal !== "") {
        return {
          ok: false,
          name: srcName,
          error: "标签 [" + tagKey + "] 不允许携带参数"
        };
      }
      strVal = null;
    } else if (P.indexOf(REQUIRED_ARG_TAGS, tagKey) !== -1) {
      if (!hasVal || strVal === "") {
        return {
          ok: false,
          name: srcName,
          error: "标签 [" + tagKey + "] 必须提供有效参数"
        };
      }
      if (tagKey === "name" && strVal.indexOf("*") === -1) {
        return {
          ok: false,
          name: srcName,
          error: "标签 [name] 参数必须包含 '*': " + strVal
        };
      }
      if (tagKey === "scale" && !isValidPositiveScale(strVal)) {
        return {
          ok: false,
          name: srcName,
          error: "标签 [scale] 参数必须为正数: " + strVal
        };
      }
    } else if (tagKey === "trim") {
      if (hasVal && strVal !== "") {
        if (tagValue === false || strVal === "false") {
          strVal = "false";
        } else if (tagValue === true || strVal === "true") {
          strVal = "true";
        } else {
          return {
            ok: false,
            name: srcName,
            error: "标签 [trim] 参数仅支持 false / true 或无参数"
          };
        }
      } else {
        strVal = null;
      }
    } else {
      // bone, slot, skin, folder, mesh
      if (hasVal && strVal === "") {
        return {
          ok: false,
          name: srcName,
          error: "标签 [" + tagKey + "] 若传递参数则不可为空白"
        };
      }
      if (tagKey === "skin" && strVal !== null && strVal.toLowerCase() === "default") {
        return {
          ok: false,
          name: srcName,
          error: "皮肤名称不可使用保留字 default"
        };
      }
    }

    var nextTags = P.filter(parsed.tags, function (item) {
      return item.key !== tagKey;
    });
    nextTags.push({ key: tagKey, value: strVal });

    return {
      ok: true,
      name: formatLayerName(parsed.cleanName, nextTags, pos),
      error: null
    };
  }

  PSSplitter.Core.SpineTags = {
    OFFICIAL_TAGS: OFFICIAL_TAGS,
    parseLayerName: parseLayerName,
    formatLayerName: formatLayerName,
    toggleOrSetTag: toggleOrSetTag,
    stripAllTags: stripAllTags
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = PSSplitter.Core.SpineTags;
  }
})();

// --- END core\spine_tags.js ---

// --- BEGIN core\naming_engine.js ---
/**
 * @fileoverview 图层命名清洗、Tag-Aware 批量重命名与 L/R 对称互换引擎（PSSplitter.Core.NamingEngine）
 * 严格对齐 PhotoshopToSpine.jsx v7.42 附件名清洗与 Windows 保留名校验规则。
 */

(function () {
  var rootScope = (typeof $ !== "undefined" && $.global)
    ? $.global
    : (typeof global !== "undefined" ? global : (function () { return this; }()));
  rootScope.PSSplitter = rootScope.PSSplitter || {};
  rootScope.PSSplitter.Core = rootScope.PSSplitter.Core || {};
  var PSSplitter = rootScope.PSSplitter;

  /**
   * 懒加载 Polyfill 模块
   * @returns {Object} Polyfill 模块
   */
  function getPolyfill() {
    if (PSSplitter && PSSplitter.Core && PSSplitter.Core.Polyfill) {
      return PSSplitter.Core.Polyfill;
    }
    if (typeof require === "function") {
      return require("./polyfill_es3.js");
    }
    throw new Error("PSSplitter.Core.Polyfill is required");
  }

  /**
   * 懒加载 SpineTags 模块
   * @returns {Object} SpineTags 模块
   */
  function getSpineTags() {
    if (PSSplitter && PSSplitter.Core && PSSplitter.Core.SpineTags) {
      return PSSplitter.Core.SpineTags;
    }
    if (typeof require === "function") {
      return require("./spine_tags.js");
    }
    throw new Error("PSSplitter.Core.SpineTags is required");
  }

  var ILLEGAL_CHARS_RE = /[\\:"*?<>|\x00-\x1F]/g;
  var DOTS_ONLY_RE = /^\.+$/;
  var DRAG_ONLY_RE = /^__drag$/i;
  var WINDOWS_RESERVED_RE = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;

  /**
   * 按 UTF-8 字节数与字符长度安全截断字符串至 <= 255
   * @param {string} str 输入字符串
   * @returns {string} 截断后字符串
   */
  function truncateToMax255(str) {
    var P = getPolyfill();
    var out = str;
    if (out.length > 255) {
      out = out.slice(0, 255);
    }
    while (out.length > 0 && P.utf8ByteLength(out) > 255) {
      out = out.slice(0, out.length - 1);
    }
    return out;
  }

  /**
   * 校验 Spine 附件基础名称是否符合文件系统与 PhotoshopToSpine.jsx 规范
   * @param {string} baseName 待校验名称（可带子路径 /）
   * @returns {{valid:boolean, sanitized:string, errors:Array<string>}} 校验结果与清洗建议
   */
  function validateAttachmentName(baseName) {
    var P = getPolyfill();
    var T = getSpineTags();
    var errors = [];

    if (typeof baseName !== "string") {
      return { valid: false, sanitized: "", errors: ["附件名称必须为字符串"] };
    }

    var rawTrimmed = P.trim(baseName);
    if (rawTrimmed === "") {
      return { valid: false, sanitized: "", errors: ["附件名称不能为空"] };
    }

    // 剥离误传入的 [...] 标签
    var work = T.stripAllTags(rawTrimmed);
    if (work !== rawTrimmed && /\[[^\]]*\]/.test(rawTrimmed)) {
      errors.push("附件基础名称中不应包含方括号标签");
    }

    // 检查并剥离 .png 后缀
    if (/\.png$/i.test(work)) {
      errors.push("图层名称不应包含 .png 扩展名");
      work = work.replace(/\.png$/i, "");
    }

    // 检查非法文件系统字符
    if (ILLEGAL_CHARS_RE.test(work)) {
      errors.push("名称包含非法文件系统字符 (\\ : \" * ? < > | 或控制字符)");
      ILLEGAL_CHARS_RE.lastIndex = 0;
      work = work.replace(ILLEGAL_CHARS_RE, "");
    }

    // 检查斜杠路径规范
    if (P.startsWith(work, "/") || P.endsWith(work, "/") || /\/{2,}/.test(work)) {
      errors.push("路径格式不规范（存在首尾斜杠或连续双斜杠）");
      work = work.replace(/\/{2,}/g, "/").replace(/^\/+|\/+$/g, "");
    }

    var rawSegments = work === "" ? [] : work.split("/");
    var cleanSegments = [];
    var i;
    for (i = 0; i < rawSegments.length; i++) {
      var seg = P.trim(rawSegments[i]);
      if (seg === "") {
        errors.push("路径包含空分段");
        continue;
      }
      if (DOTS_ONLY_RE.test(seg)) {
        errors.push("禁止使用纯点号路径段: " + seg);
        continue;
      }
      if (DRAG_ONLY_RE.test(seg)) {
        errors.push("禁止使用 Photoshop 内部保留名 __drag");
        continue;
      }
      if (WINDOWS_RESERVED_RE.test(seg)) {
        errors.push("命中 Windows 设备保留名: " + seg);
        continue;
      }
      if (seg.length > 255 || P.utf8ByteLength(seg) > 255) {
        errors.push("路径分段超过 255 字节/字符限制: " + seg);
        seg = truncateToMax255(seg);
      }
      if (seg !== "") {
        cleanSegments.push(seg);
      }
    }

    var sanitized = cleanSegments.join("/");
    if (sanitized.length > 255 || P.utf8ByteLength(sanitized) > 255) {
      errors.push("完整附件路径超过 255 字节/字符限制");
      sanitized = truncateToMax255(sanitized);
    }

    if (sanitized === "") {
      errors.push("清洗后名称为空");
    }

    return {
      valid: errors.length === 0 && sanitized.length > 0,
      sanitized: sanitized,
      errors: errors
    };
  }

  function isAsciiAlpha(ch) {
    return (ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z");
  }

  function isAsciiUpper(ch) {
    return ch >= "A" && ch <= "Z";
  }

  function isAsciiLower(ch) {
    return ch >= "a" && ch <= "z";
  }

  function isAsciiAlphaNum(ch) {
    return isAsciiAlpha(ch) || (ch >= "0" && ch <= "9");
  }

  function isSepChar(ch) {
    return ch === "_" || ch === "." || ch === "-";
  }

  /**
   * 对纯文本片段执行单遍 L/R 对称标识互换（不误伤 LEG、cleft 等普通单词）
   * @param {string} seg 文本片段
   * @returns {string} 互换后文本
   */
  function swapSegmentLR(seg) {
    var WORD_PAIRS = [
      ["Left", "Right"],
      ["Right", "Left"],
      ["left", "right"],
      ["right", "left"],
      ["LEFT", "RIGHT"],
      ["RIGHT", "LEFT"]
    ];

    var out = "";
    var i = 0;
    var len = seg.length;

    while (i < len) {
      var ch = seg.charAt(i);

      // 1. 中文左右互换
      if (ch === "左") {
        out += "右";
        i += 1;
        continue;
      }
      if (ch === "右") {
        out += "左";
        i += 1;
        continue;
      }

      // 2. 完整英文词 Left / Right（支持驼峰及分隔边界）
      var matchedWord = null;
      var matchedSwap = null;
      var w;
      for (w = 0; w < WORD_PAIRS.length; w++) {
        var srcWord = WORD_PAIRS[w][0];
        if (seg.slice(i, i + srcWord.length) === srcWord) {
          var prevCh = i > 0 ? seg.charAt(i - 1) : "";
          var nextCh = (i + srcWord.length < len) ? seg.charAt(i + srcWord.length) : "";

          var firstIsUpper = isAsciiUpper(srcWord.charAt(0));
          var allUpper = (srcWord === "LEFT" || srcWord === "RIGHT");

          var leftOk = (prevCh === "") ||
            (!isAsciiAlpha(prevCh)) ||
            (firstIsUpper && !allUpper && isAsciiLower(prevCh));

          var rightOk = (nextCh === "") ||
            (!isAsciiAlpha(nextCh)) ||
            (!allUpper && isAsciiUpper(nextCh));

          if (leftOk && rightOk) {
            matchedWord = srcWord;
            matchedSwap = WORD_PAIRS[w][1];
            break;
          }
        }
      }

      if (matchedWord !== null) {
        out += matchedSwap;
        i += matchedWord.length;
        continue;
      }

      // 3. 简写标识 _L/_R, _l/_r, .L/.R, -L/-R, L_/R_, l_/r_
      if (ch === "L" || ch === "R" || ch === "l" || ch === "r") {
        var p = i > 0 ? seg.charAt(i - 1) : "";
        var n = (i + 1 < len) ? seg.charAt(i + 1) : "";
        var isSuffixMarker = isSepChar(p) && (n === "" || !isAsciiAlphaNum(n));
        var isPrefixMarker = isSepChar(n) && (p === "" || !isAsciiAlphaNum(p));

        if (isSuffixMarker || isPrefixMarker) {
          if (ch === "L") { out += "R"; }
          else if (ch === "R") { out += "L"; }
          else if (ch === "l") { out += "r"; }
          else { out += "l"; }
          i += 1;
          continue;
        }
      }

      out += ch;
      i += 1;
    }

    return out;
  }

  /**
   * 互换图层名称中的左右对称标识，默认保护 [...] 标签区不被破坏
   * @param {string} name 原始图层名称
   * @param {boolean} [preserveTags=true] 是否保护方括号标签区不变
   * @returns {{changed:boolean, name:string}} 互换结果
   */
  function swapLR(name, preserveTags) {
    if (name === null || name === undefined) {
      return { changed: false, name: "" };
    }
    var src = String(name);
    var keepTags = preserveTags !== false;
    var parts = src.split(/(\[[^\]]*\])/g);
    var i;
    for (i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (!part) {
        continue;
      }
      if (part.charAt(0) === "[" && part.charAt(part.length - 1) === "]") {
        if (!keepTags) {
          var colonIdx = part.indexOf(":");
          if (colonIdx !== -1) {
            var head = part.slice(0, colonIdx + 1);
            var valBody = part.slice(colonIdx + 1, part.length - 1);
            parts[i] = head + swapSegmentLR(valBody) + "]";
          }
        }
      } else {
        parts[i] = swapSegmentLR(part);
      }
    }
    var result = parts.join("");
    return {
      changed: result !== src,
      name: result
    };
  }

  /**
   * 将整数补零格式化为指定宽度字符串
   * @param {number} num 数值
   * @param {number} pad 最小位宽
   * @returns {string} 格式化序号
   */
  function formatSeqNumber(num, pad) {
    var s = String(num);
    var width = (typeof pad === "number" && pad > 0) ? Math.floor(pad) : 0;
    while (s.length < width) {
      s = "0" + s;
    }
    return s;
  }

  /**
   * 检测图层名称标签处于前缀还是后缀位置
   * @param {string} rawName 原始名称
   * @returns {string} "prefix" 或 "suffix"
   */
  function detectTagPosition(rawName) {
    var P = getPolyfill();
    var s = P.trim(rawName || "");
    if (P.startsWith(s, "[") && !P.endsWith(s, "]")) {
      return "prefix";
    }
    return "suffix";
  }

  /**
   * 生成批量重命名预览计划（支持前缀、后缀、正则、序号、L/R 互换与同级重名冲突检测）
   * @param {Array<{id:number, name:string, isGroup?:boolean, parentId?:number|null}>} nodes 待重命名节点列表
   * @param {Object} [options] 选项配置
   * @returns {{items:Array, conflicts:Array, errors:Array<string>}} 重命名计划与冲突报告
   */
  function batchRenamePlan(nodes, options) {
    var P = getPolyfill();
    var T = getSpineTags();
    var opts = options || {};
    var errors = [];

    if (!P.isArray(nodes)) {
      return { items: [], conflicts: [], errors: ["nodes 必须为数组"] };
    }

    var compiledRegex = null;
    if (opts.regexPattern !== undefined && opts.regexPattern !== null && opts.regexPattern !== "") {
      var flags = typeof opts.regexFlags === "string" ? opts.regexFlags : "";
      if (!/^[gim]*$/.test(flags)) {
        return { items: [], conflicts: [], errors: ["ES3 正则仅支持 g / i / m 标志: " + flags] };
      }
      // 校验 flags 不重复
      var seenFlags = {};
      var fi;
      for (fi = 0; fi < flags.length; fi++) {
        var fc = flags.charAt(fi);
        if (P.hasOwn(seenFlags, fc)) {
          return { items: [], conflicts: [], errors: ["重复的正则标志: " + fc] };
        }
        seenFlags[fc] = true;
      }
      try {
        compiledRegex = new RegExp(String(opts.regexPattern), flags);
      } catch (e) {
        return { items: [], conflicts: [], errors: ["无效正则表达式: " + (e && e.message ? e.message : String(e))] };
      }
    }

    var preserveTags = opts.preserveTags !== false;
    var hasSeq = typeof opts.sequentialStart === "number" && !isNaN(opts.sequentialStart) && isFinite(opts.sequentialStart);
    var seqPad = typeof opts.sequentialPad === "number" ? opts.sequentialPad : 2;
    var items = [];
    var conflictBuckets = {};
    var bucketOrder = [];
    var i;

    for (i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (!node) {
        continue;
      }
      var oldName = node.name === null || node.name === undefined ? "" : String(node.name);
      var isGroup = !!node.isGroup || node.type === "LayerSet";
      var parsed = T.parseLayerName(oldName, isGroup);
      var workBase = preserveTags ? parsed.cleanName : oldName;

      if (compiledRegex !== null) {
        if (compiledRegex.global) {
          compiledRegex.lastIndex = 0;
        }
        workBase = workBase.replace(compiledRegex, opts.regexReplace !== undefined && opts.regexReplace !== null ? String(opts.regexReplace) : "");
      }

      if (opts.swapLR) {
        workBase = swapLR(workBase, preserveTags).name;
      }

      if (typeof opts.prefix === "string" && opts.prefix !== "") {
        workBase = opts.prefix + workBase;
      }

      if (typeof opts.suffix === "string" && opts.suffix !== "") {
        workBase = workBase + opts.suffix;
      }

      if (hasSeq) {
        var seqStr = formatSeqNumber(Math.floor(opts.sequentialStart) + i, seqPad);
        if (workBase.indexOf("{#}") !== -1) {
          workBase = workBase.replace(/\{#\}/g, seqStr);
        } else {
          workBase = workBase === "" ? seqStr : workBase + "_" + seqStr;
        }
      }

      var newName;
      if (preserveTags && (parsed.tags.length > 0 || parsed.invalidTags.length > 0)) {
        var pos = detectTagPosition(oldName);
        newName = T.formatLayerName(workBase, parsed.tags, pos);
        if (parsed.invalidTags.length > 0) {
          newName = (newName ? newName + " " : "") + parsed.invalidTags.join(" ");
        }
      } else {
        newName = workBase;
      }

      items.push({
        id: node.id,
        oldName: oldName,
        newName: newName,
        changed: newName !== oldName
      });

      var parentKey = (node.parentId !== undefined && node.parentId !== null) ? String(node.parentId) : "__root__";
      var cleanFinal = T.stripAllTags(newName);
      var bucketKey = parentKey + "::" + cleanFinal.toLowerCase();
      if (!P.hasOwn(conflictBuckets, bucketKey)) {
        conflictBuckets[bucketKey] = { name: cleanFinal, ids: [] };
        bucketOrder.push(bucketKey);
      }
      conflictBuckets[bucketKey].ids.push(node.id);
    }

    var conflicts = [];
    for (i = 0; i < bucketOrder.length; i++) {
      var bucket = conflictBuckets[bucketOrder[i]];
      if (bucket.ids.length > 1) {
        conflicts.push({
          name: bucket.name,
          ids: bucket.ids
        });
      }
    }

    return {
      items: items,
      conflicts: conflicts,
      errors: errors
    };
  }

  PSSplitter.Core.NamingEngine = {
    validateAttachmentName: validateAttachmentName,
    swapLR: swapLR,
    batchRenamePlan: batchRenamePlan
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = PSSplitter.Core.NamingEngine;
  }
})();

// --- END core\naming_engine.js ---

// --- BEGIN core\skeleton_templates.js ---
/**
 * @fileoverview 标准化 Spine 角色骨骼模板与增量建组规划器（PSSplitter.Core.SkeletonTemplates）
 * 提供 4 套常用角色骨骼层级模板（humanoid / chibi / quadruped / portrait），
 * 严格遵循从前景到背景遮挡顺序与增量合并幂等原则。
 */

(function () {
  var rootScope = (typeof $ !== "undefined" && $.global)
    ? $.global
    : (typeof global !== "undefined" ? global : (function () { return this; }()));
  rootScope.PSSplitter = rootScope.PSSplitter || {};
  rootScope.PSSplitter.Core = rootScope.PSSplitter.Core || {};
  var PSSplitter = rootScope.PSSplitter;

  function getPolyfill() {
    if (PSSplitter && PSSplitter.Core && PSSplitter.Core.Polyfill) {
      return PSSplitter.Core.Polyfill;
    }
    if (typeof require === "function") {
      return require("./polyfill_es3.js");
    }
    throw new Error("PSSplitter.Core.Polyfill is required");
  }

  function getSpineTags() {
    if (PSSplitter && PSSplitter.Core && PSSplitter.Core.SpineTags) {
      return PSSplitter.Core.SpineTags;
    }
    if (typeof require === "function") {
      return require("./spine_tags.js");
    }
    throw new Error("PSSplitter.Core.SpineTags is required");
  }

  /**
   * 构造模板节点辅助函数
   * @param {string} name 纯净节点名
   * @param {Array<{key:string, value:*}>} tags 官方标签列表
   * @param {Array} [children] 子模板节点数组（从前景到背景）
   * @returns {Object} 模板节点
   */
  function tplNode(name, tags, children) {
    return {
      name: name,
      tags: tags || [],
      children: children || []
    };
  }

  var TEMPLATES = {
    humanoid: {
      id: "humanoid",
      name: "标准人形角色 (Humanoid)",
      description: "适用于常见双足立绘/横版动作人形角色，按前臂-头部-躯干-前腿-后腿-后臂遮挡序组织",
      tree: [
        tplNode("arm_front", [{ key: "bone", value: "arm_L" }], [
          tplNode("hand_L", [{ key: "bone", value: null }], [
            tplNode("hand_L", [{ key: "slot", value: null }])
          ]),
          tplNode("forearm_L", [{ key: "bone", value: null }], [
            tplNode("forearm_L", [{ key: "slot", value: null }])
          ]),
          tplNode("upper_arm_L", [{ key: "slot", value: null }])
        ]),
        tplNode("head", [{ key: "bone", value: null }], [
          tplNode("hair_front", [{ key: "bone", value: null }], [
            tplNode("hair_front", [{ key: "slot", value: null }])
          ]),
          tplNode("eyes", [{ key: "slot", value: null }]),
          tplNode("eyebrows", [{ key: "slot", value: null }]),
          tplNode("mouth", [{ key: "slot", value: null }]),
          tplNode("nose", [{ key: "slot", value: null }]),
          tplNode("head_base", [{ key: "slot", value: null }]),
          tplNode("hair_back", [{ key: "bone", value: null }], [
            tplNode("hair_back", [{ key: "slot", value: null }])
          ])
        ]),
        tplNode("torso", [{ key: "bone", value: null }], [
          tplNode("chest", [{ key: "slot", value: null }]),
          tplNode("hip", [{ key: "bone", value: null }], [
            tplNode("hip", [{ key: "slot", value: null }])
          ])
        ]),
        tplNode("leg_front", [{ key: "bone", value: "thigh_L" }], [
          tplNode("thigh_L", [{ key: "slot", value: null }]),
          tplNode("calf_L", [{ key: "bone", value: null }], [
            tplNode("calf_L", [{ key: "slot", value: null }]),
            tplNode("foot_L", [{ key: "bone", value: null }], [
              tplNode("foot_L", [{ key: "slot", value: null }])
            ])
          ])
        ]),
        tplNode("leg_back", [{ key: "bone", value: "thigh_R" }], [
          tplNode("thigh_R", [{ key: "slot", value: null }]),
          tplNode("calf_R", [{ key: "bone", value: null }], [
            tplNode("calf_R", [{ key: "slot", value: null }]),
            tplNode("foot_R", [{ key: "bone", value: null }], [
              tplNode("foot_R", [{ key: "slot", value: null }])
            ])
          ])
        ]),
        tplNode("arm_back", [{ key: "bone", value: "arm_R" }], [
          tplNode("upper_arm_R", [{ key: "slot", value: null }]),
          tplNode("forearm_R", [{ key: "bone", value: null }], [
            tplNode("forearm_R", [{ key: "slot", value: null }])
          ]),
          tplNode("hand_R", [{ key: "bone", value: null }], [
            tplNode("hand_R", [{ key: "slot", value: null }])
          ])
        ])
      ]
    },
    chibi: {
      id: "chibi",
      name: "Q版 / 二头身角色 (Chibi)",
      description: "适用于二头身 Q 版角色，强化头部表情槽位与精简四肢结构",
      tree: [
        tplNode("head", [{ key: "bone", value: null }], [
          tplNode("hair_front", [{ key: "bone", value: null }]),
          tplNode("face_fx", [{ key: "slot", value: null }]),
          tplNode("eyes", [{ key: "slot", value: null }]),
          tplNode("mouth", [{ key: "slot", value: null }]),
          tplNode("head_base", [{ key: "slot", value: null }]),
          tplNode("hair_back", [{ key: "bone", value: null }])
        ]),
        tplNode("arm_L", [{ key: "bone", value: null }], [
          tplNode("hand_L", [{ key: "slot", value: null }]),
          tplNode("arm_L", [{ key: "slot", value: null }])
        ]),
        tplNode("torso", [{ key: "bone", value: null }], [
          tplNode("body", [{ key: "slot", value: null }])
        ]),
        tplNode("leg_L", [{ key: "bone", value: null }], [
          tplNode("leg_L", [{ key: "slot", value: null }])
        ]),
        tplNode("leg_R", [{ key: "bone", value: null }], [
          tplNode("leg_R", [{ key: "slot", value: null }])
        ]),
        tplNode("arm_R", [{ key: "bone", value: null }], [
          tplNode("hand_R", [{ key: "slot", value: null }]),
          tplNode("arm_R", [{ key: "slot", value: null }])
        ])
      ]
    },
    quadruped: {
      id: "quadruped",
      name: "四足动物 / 坐骑 (Quadruped)",
      description: "适用于狼、马、宠物等四足生物，划分 FL/FR 前肢、BL/BR 后肢、颈部与尾巴层级",
      tree: [
        tplNode("head", [{ key: "bone", value: null }], [
          tplNode("ear_L", [{ key: "bone", value: null }]),
          tplNode("eyes", [{ key: "slot", value: null }]),
          tplNode("jaw", [{ key: "bone", value: null }]),
          tplNode("head_base", [{ key: "slot", value: null }]),
          tplNode("ear_R", [{ key: "bone", value: null }])
        ]),
        tplNode("neck", [{ key: "bone", value: null }], [
          tplNode("neck", [{ key: "slot", value: null }])
        ]),
        tplNode("leg_FL", [{ key: "bone", value: null }], [
          tplNode("paw_FL", [{ key: "bone", value: null }]),
          tplNode("shin_FL", [{ key: "bone", value: null }]),
          tplNode("leg_FL", [{ key: "slot", value: null }])
        ]),
        tplNode("leg_FR", [{ key: "bone", value: null }], [
          tplNode("paw_FR", [{ key: "bone", value: null }]),
          tplNode("shin_FR", [{ key: "bone", value: null }]),
          tplNode("leg_FR", [{ key: "slot", value: null }])
        ]),
        tplNode("torso", [{ key: "bone", value: null }], [
          tplNode("body", [{ key: "slot", value: null }]),
          tplNode("hip", [{ key: "bone", value: null }])
        ]),
        tplNode("leg_BL", [{ key: "bone", value: null }], [
          tplNode("paw_BL", [{ key: "bone", value: null }]),
          tplNode("shin_BL", [{ key: "bone", value: null }]),
          tplNode("leg_BL", [{ key: "slot", value: null }])
        ]),
        tplNode("leg_BR", [{ key: "bone", value: null }], [
          tplNode("paw_BR", [{ key: "bone", value: null }]),
          tplNode("shin_BR", [{ key: "bone", value: null }]),
          tplNode("leg_BR", [{ key: "slot", value: null }])
        ]),
        tplNode("tail", [{ key: "bone", value: null }], [
          tplNode("tail_tip", [{ key: "bone", value: null }])
        ])
      ]
    },
    portrait: {
      id: "portrait",
      name: "半身立绘 / 表情差分 (Portrait)",
      description: "适用于 AVG/RPG 半身立绘与多表情差分，精简下半身，突出面部情绪槽位",
      tree: [
        tplNode("hair_front", [{ key: "bone", value: null }]),
        tplNode("head", [{ key: "bone", value: null }], [
          tplNode("eyes", [{ key: "slot", value: null }]),
          tplNode("eyebrows", [{ key: "slot", value: null }]),
          tplNode("mouth", [{ key: "slot", value: null }]),
          tplNode("blush", [{ key: "slot", value: null }]),
          tplNode("head_base", [{ key: "slot", value: null }])
        ]),
        tplNode("arm_L", [{ key: "bone", value: null }], [
          tplNode("arm_L", [{ key: "slot", value: null }])
        ]),
        tplNode("torso", [{ key: "bone", value: null }], [
          tplNode("collar", [{ key: "slot", value: null }]),
          tplNode("body", [{ key: "slot", value: null }])
        ]),
        tplNode("arm_R", [{ key: "bone", value: null }], [
          tplNode("arm_R", [{ key: "slot", value: null }])
        ]),
        tplNode("hair_back", [{ key: "bone", value: null }])
      ]
    }
  };

  var TEMPLATE_ORDER = ["humanoid", "chibi", "quadruped", "portrait"];

  /**
   * 列出所有内置骨骼模板元数据
   * @returns {Array<{id:string, name:string, description:string}>} 模板列表
   */
  function listTemplates() {
    var result = [];
    var i;
    for (i = 0; i < TEMPLATE_ORDER.length; i++) {
      var tpl = TEMPLATES[TEMPLATE_ORDER[i]];
      result.push({
        id: tpl.id,
        name: tpl.name,
        description: tpl.description
      });
    }
    return result;
  }

  /**
   * 在同级节点列表中查找匹配的已有 LayerSet 或冲突的 ArtLayer
   * @param {Array} siblingNodes 现有同级节点
   * @param {string} rawLower 目标含标签全小写名
   * @param {string} cleanLower 目标清洗后全小写名
   * @returns {{groupNode:Object|null, artConflict:Object|null}} 匹配结果
   */
  function findExistingMatch(siblingNodes, rawLower, cleanLower) {
    var P = getPolyfill();
    var T = getSpineTags();
    if (!P.isArray(siblingNodes) || siblingNodes.length === 0) {
      return { groupNode: null, artConflict: null };
    }

    var i;
    var cleanMatchedGroup = null;
    var artConflict = null;

    for (i = 0; i < siblingNodes.length; i++) {
      var n = siblingNodes[i];
      if (!n || typeof n.name !== "string") {
        continue;
      }
      var nodeRawLower = P.trim(n.name).toLowerCase();
      var nodeCleanLower = T.stripAllTags(n.name).toLowerCase();

      if (n.type === "LayerSet") {
        if (nodeRawLower === rawLower) {
          return { groupNode: n, artConflict: null };
        }
        if (cleanMatchedGroup === null && nodeCleanLower === cleanLower) {
          cleanMatchedGroup = n;
        }
      } else {
        if (artConflict === null && (nodeRawLower === rawLower || nodeCleanLower === cleanLower)) {
          artConflict = n;
        }
      }
    }

    return { groupNode: cleanMatchedGroup, artConflict: artConflict };
  }

  /**
   * 检查模板节点是否仅包含 [slot] 标签且无子级
   * @param {Object} node 模板节点
   * @returns {boolean} 是否为纯叶 slot 节点
   */
  function isSlotOnlyLeaf(node) {
    if (!node.tags || node.tags.length !== 1) {
      return false;
    }
    if (node.tags[0].key !== "slot") {
      return false;
    }
    return !node.children || node.children.length === 0;
  }

  /**
   * 根据模板生成增量建组操作计划（跳过已有组且不破坏现有图层）
   * @param {string} templateId 模板 ID ("humanoid"|"chibi"|"quadruped"|"portrait")
   * @param {Object} [options] 配置项 {rootGroupName?:string, includeSlots?:boolean, tagPosition?:string}
   * @param {Object} [existingDoc] 当前文档 VirtualDoc 快照
   * @returns {{ok:boolean, error:string|null, warnings:Array<string>, operations:Array}} 建组计划
   */
  function buildHierarchyPlan(templateId, options, existingDoc) {
    var P = getPolyfill();
    var T = getSpineTags();
    var opts = options || {};

    if (!templateId || !P.hasOwn(TEMPLATES, templateId)) {
      return {
        ok: false,
        error: "未知骨骼模板: " + String(templateId),
        warnings: [],
        operations: []
      };
    }

    var tpl = TEMPLATES[templateId];
    var includeSlots = opts.includeSlots !== false;
    var tagPosition = opts.tagPosition === "prefix" ? "prefix" : "suffix";
    var docLayers = (existingDoc && P.isArray(existingDoc.layers)) ? existingDoc.layers : [];
    var operations = [];
    var warnings = [];

    var startParentPath = "";
    var startSiblings = docLayers;

    var rootName = opts.rootGroupName ? P.trim(String(opts.rootGroupName)) : "";
    if (rootName !== "") {
      var rootLower = rootName.toLowerCase();
      var rootCleanLower = T.stripAllTags(rootName).toLowerCase();
      var rootMatch = findExistingMatch(docLayers, rootLower, rootCleanLower);

      if (rootMatch.groupNode !== null) {
        startParentPath = rootMatch.groupNode.name;
        startSiblings = P.isArray(rootMatch.groupNode.children) ? rootMatch.groupNode.children : [];
      } else if (rootMatch.artConflict !== null) {
        warnings.push("根路径存在同名普通图层，已跳过模板建组: " + rootMatch.artConflict.name);
        return {
          ok: true,
          error: null,
          warnings: warnings,
          operations: operations
        };
      } else {
        operations.push({
          type: "createGroup",
          path: rootName,
          name: rootName,
          parentPath: "",
          tags: []
        });
        startParentPath = rootName;
        startSiblings = [];
      }
    }

    function walkNodes(tplNodes, currentParentPath, existingSiblings) {
      var i;
      for (i = 0; i < tplNodes.length; i++) {
        var tplItem = tplNodes[i];
        if (!includeSlots && isSlotOnlyLeaf(tplItem)) {
          continue;
        }

        var targetName = T.formatLayerName(tplItem.name, tplItem.tags, tagPosition);
        var rawLower = targetName.toLowerCase();
        var cleanLower = tplItem.name.toLowerCase();
        var matched = findExistingMatch(existingSiblings, rawLower, cleanLower);

        var nextParentName;
        var nextSiblings;

        if (matched.groupNode !== null) {
          nextParentName = matched.groupNode.name;
          nextSiblings = P.isArray(matched.groupNode.children) ? matched.groupNode.children : [];
        } else if (matched.artConflict !== null) {
          var conflictPath = currentParentPath ? (currentParentPath + "/" + targetName) : targetName;
          warnings.push("路径存在同名普通图层，已跳过建组: " + conflictPath);
          continue;
        } else {
          var nextPath = currentParentPath ? (currentParentPath + "/" + targetName) : targetName;
          operations.push({
            type: "createGroup",
            path: nextPath,
            name: targetName,
            parentPath: currentParentPath,
            tags: P.clone(tplItem.tags)
          });
          nextParentName = targetName;
          nextSiblings = [];
        }

        if (tplItem.children && tplItem.children.length > 0) {
          var childParentPath = currentParentPath ? (currentParentPath + "/" + nextParentName) : nextParentName;
          walkNodes(tplItem.children, childParentPath, nextSiblings);
        }
      }
    }

    walkNodes(tpl.tree, startParentPath, startSiblings);

    return {
      ok: true,
      error: null,
      warnings: warnings,
      operations: operations
    };
  }

  PSSplitter.Core.SkeletonTemplates = {
    listTemplates: listTemplates,
    buildHierarchyPlan: buildHierarchyPlan
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = PSSplitter.Core.SkeletonTemplates;
  }
})();

// --- END core\skeleton_templates.js ---

// --- BEGIN core\skin_mapper.js ---
/**
 * @fileoverview 多皮肤与换装目录同构克隆规划器（PSSplitter.Core.SkinMapper）
 * 严格对齐 PhotoshopToSpine.jsx v7.42 的 [skin] 路径前缀、default 保留名拦截与 linkedmesh 跨皮肤引用规则。
 */

(function () {
  var rootScope = (typeof $ !== "undefined" && $.global)
    ? $.global
    : (typeof global !== "undefined" ? global : (function () { return this; }()));
  rootScope.PSSplitter = rootScope.PSSplitter || {};
  rootScope.PSSplitter.Core = rootScope.PSSplitter.Core || {};
  var PSSplitter = rootScope.PSSplitter;

  function getPolyfill() {
    if (PSSplitter && PSSplitter.Core && PSSplitter.Core.Polyfill) {
      return PSSplitter.Core.Polyfill;
    }
    if (typeof require === "function") {
      return require("./polyfill_es3.js");
    }
    throw new Error("PSSplitter.Core.Polyfill is required");
  }

  function getSpineTags() {
    if (PSSplitter && PSSplitter.Core && PSSplitter.Core.SpineTags) {
      return PSSplitter.Core.SpineTags;
    }
    if (typeof require === "function") {
      return require("./spine_tags.js");
    }
    throw new Error("PSSplitter.Core.SpineTags is required");
  }

  var ILLEGAL_SKIN_CHARS_RE = /[\\:"*?<>|\[\]\x00-\x1F]/;
  var DOTS_ONLY_RE = /^\.+$/;
  var DRAG_ONLY_RE = /^__drag$/i;
  var WINDOWS_RESERVED_RE = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;

  /**
   * 校验目标皮肤名称是否合法（拦截 default 保留名、首尾斜杠、非法字符与 Windows 保留名）
   * @param {string} skinName 目标皮肤名（支持多级路径如 "armor/gold"）
   * @returns {{valid:boolean, errors:Array<string>}} 校验结果
   */
  function validateSkinName(skinName) {
    var P = getPolyfill();
    var errors = [];

    if (typeof skinName !== "string") {
      return { valid: false, errors: ["皮肤名称必须为字符串"] };
    }

    var trimmed = P.trim(skinName);
    if (trimmed === "") {
      return { valid: false, errors: ["皮肤名称不能为空"] };
    }

    if (trimmed.toLowerCase() === "default") {
      errors.push("皮肤名称禁止使用 Spine 保留字 default");
    }

    if (P.startsWith(trimmed, "/") || P.endsWith(trimmed, "/")) {
      errors.push("皮肤名称不得以 '/' 开头或结尾");
    }

    if (/\/{2,}/.test(trimmed)) {
      errors.push("皮肤名称不得包含连续斜杠 '//'");
    }

    if (ILLEGAL_SKIN_CHARS_RE.test(trimmed)) {
      errors.push("皮肤名称包含非法字符 (\\ : \" * ? < > | [ ] 或控制字符)");
    }

    var segments = trimmed.split("/");
    var i;
    for (i = 0; i < segments.length; i++) {
      var seg = P.trim(segments[i]);
      if (seg === "") {
        if (!P.startsWith(trimmed, "/") && !P.endsWith(trimmed, "/") && !/\/{2,}/.test(trimmed)) {
          errors.push("皮肤路径包含空分段");
        }
        continue;
      }
      if (seg.toLowerCase() === "default") {
        errors.push("皮肤路径分段禁止使用保留字 default");
      }
      if (DOTS_ONLY_RE.test(seg)) {
        errors.push("皮肤路径分段禁止为纯点号: " + seg);
      }
      if (DRAG_ONLY_RE.test(seg)) {
        errors.push("皮肤路径分段禁止为 __drag");
      }
      if (WINDOWS_RESERVED_RE.test(seg)) {
        errors.push("皮肤路径分段命中 Windows 保留名: " + seg);
      }
    }

    if (trimmed.length > 255 || P.utf8ByteLength(trimmed) > 255) {
      errors.push("皮肤名称超过 255 字节/字符限制");
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * 从解析后的标签列表中查找指定 key 的第一个标签项
   * @param {Array} tags 标签数组
   * @param {string} key 目标键
   * @returns {Object|null} 标签项
   */
  function findTag(tags, key) {
    var i;
    for (i = 0; i < tags.length; i++) {
      if (tags[i].key === key) {
        return tags[i];
      }
    }
    return null;
  }

  /**
   * 去除尾部 .png 与非法字符，辅助推算附件相对名
   * @param {string} cleanName 剥离标签后的节点名
   * @returns {string} 规范化名称片段
   */
  function normalizeAttachmentBase(cleanName) {
    var P = getPolyfill();
    var s = P.trim(cleanName || "");
    s = s.replace(/\.png$/i, "");
    s = s.replace(/[\\:"*?<>|]/g, "");
    return s;
  }

  /**
   * 构建多皮肤/换装目录同构克隆执行计划
   * @param {Object} sourceSkinNode 源皮肤 LayerSet 节点 (VirtualNode)
   * @param {string} targetSkinName 目标皮肤名（如 "dark_knight" 或 "armor/gold"）
   * @param {Object} [options] 配置项
   * @returns {{ok:boolean, errors:Array<string>, warnings:Array<string>, rootName:string|null, operations:Array}}
   */
  function buildSkinClonePlan(sourceSkinNode, targetSkinName, options) {
    var P = getPolyfill();
    var T = getSpineTags();
    var opts = options || {};
    var errors = [];
    var warnings = [];

    if (!sourceSkinNode || sourceSkinNode.type !== "LayerSet") {
      return {
        ok: false,
        errors: ["源皮肤节点必须为有效的 LayerSet 图层组"],
        warnings: [],
        rootName: null,
        operations: []
      };
    }

    var nameCheck = validateSkinName(targetSkinName);
    if (!nameCheck.valid) {
      return {
        ok: false,
        errors: nameCheck.errors,
        warnings: [],
        rootName: null,
        operations: []
      };
    }

    var includeIgnored = !!opts.includeIgnored;
    var pathStrategy = opts.pathStrategy === "keep" ? "keep" : "strip";
    var meshStrategy = opts.meshStrategy || "unlink";
    var tagPosition = opts.tagPosition === "prefix" ? "prefix" : "suffix";

    var parsedRoot = T.parseLayerName(sourceSkinNode.name, true);
    var srcSkinTag = findTag(parsedRoot.tags, "skin");
    var srcSkinName;
    if (srcSkinTag && srcSkinTag.value) {
      srcSkinName = srcSkinTag.value.replace(/^\/+/, "");
    } else if (typeof opts.sourceSkinName === "string" && P.trim(opts.sourceSkinName) !== "") {
      srcSkinName = P.trim(opts.sourceSkinName).replace(/^\/+/, "");
    } else {
      srcSkinName = parsedRoot.cleanName;
    }

    var cleanTargetSkin = P.trim(targetSkinName);
    var targetParts = cleanTargetSkin.split("/");
    var leafName = targetParts[targetParts.length - 1];
    var isNestedSkin = targetParts.length > 1;

    var skinTagVal = null;
    if (isNestedSkin) {
      skinTagVal = opts.parentHasFolder ? ("/" + cleanTargetSkin) : cleanTargetSkin;
    } else if (opts.parentHasFolder) {
      skinTagVal = "/" + cleanTargetSkin;
    }

    var rootTags = [];
    var i;
    for (i = 0; i < parsedRoot.tags.length; i++) {
      var rt = parsedRoot.tags[i];
      if (rt.key === "skin" || rt.key === "folder") {
        continue;
      }
      if (rt.key === "path" && pathStrategy === "strip") {
        warnings.push("已剥离源皮肤根组上的 [path:] 标签: " + sourceSkinNode.name);
        continue;
      }
      rootTags.push({ key: rt.key, value: rt.value });
    }
    rootTags.push({ key: "skin", value: skinTagVal });

    var rootName = T.formatLayerName(leafName, rootTags, tagPosition);
    var operations = [
      {
        type: "cloneSkinRoot",
        sourceLayerId: sourceSkinNode.id,
        sourceName: sourceSkinNode.name,
        targetName: rootName
      }
    ];

    /**
     * 递归遍历源皮肤子节点，生成同构克隆指令
     * @param {Array} children 子节点列表
     * @param {string} parentTargetPath 目标组路径
     * @param {string} folderPrefix 源皮肤内部 folder 子路径前缀
     */
    function walkChildren(children, parentTargetPath, folderPrefix) {
      if (!P.isArray(children)) {
        return;
      }
      var idx;
      for (idx = 0; idx < children.length; idx++) {
        var node = children[idx];
        if (!node) {
          continue;
        }
        var isGroup = node.type === "LayerSet";
        var parsed = T.parseLayerName(node.name, isGroup);

        if (!includeIgnored && findTag(parsed.tags, "ignore") !== null) {
          warnings.push("已跳过 [ignore] 辅助节点: " + node.name);
          continue;
        }

        var cleanBase = parsed.cleanName;
        if (P.startsWith(cleanBase, "/")) {
          warnings.push("非 default 皮肤子节点禁止以 '/' 开头，已自动剥离前导斜杠: " + node.name);
          cleanBase = cleanBase.replace(/^\/+/, "");
        }

        // 计算源皮肤下相对 folder 路径（用于 linkedmesh 跨皮肤源引用）
        var nextFolderPrefix = folderPrefix;
        var folderTag = findTag(parsed.tags, "folder");
        var folderSeg = null;
        if (folderTag) {
          folderSeg = folderTag.value !== null ? folderTag.value : normalizeAttachmentBase(cleanBase);
          if (P.startsWith(folderSeg, "/")) {
            nextFolderPrefix = folderSeg.slice(1);
          } else if (folderSeg !== "") {
            nextFolderPrefix = nextFolderPrefix ? (nextFolderPrefix + "/" + folderSeg) : folderSeg;
          }
          if (nextFolderPrefix !== "" && !P.endsWith(nextFolderPrefix, "/")) {
            nextFolderPrefix += "/";
          }
        }

        var newTags = [];
        var tIdx;
        for (tIdx = 0; tIdx < parsed.tags.length; tIdx++) {
          var t = parsed.tags[tIdx];
          if (t.key === "skin") {
            continue;
          }
          if (t.key === "path") {
            if (pathStrategy === "strip") {
              warnings.push("已剥离 [path:] 防止与源皮肤覆写同一 PNG: " + node.name);
              continue;
            }
            warnings.push("保留了 [path:]，请确认不会与源皮肤磁盘文件冲突: " + node.name);
            newTags.push({ key: "path", value: t.value });
            continue;
          }
          if (t.key === "mesh") {
            if (meshStrategy === "linkToSource") {
              if (t.value === null) {
                var attBase = normalizeAttachmentBase(cleanBase);
                var srcAttachment = srcSkinName + "/" + folderPrefix + attBase;
                newTags.push({ key: "mesh", value: srcAttachment });
              } else if (t.value.indexOf("/") === -1) {
                newTags.push({ key: "mesh", value: srcSkinName + "/" + t.value });
              } else {
                newTags.push({ key: "mesh", value: t.value });
              }
            } else if (meshStrategy === "keep") {
              if (t.value !== null && t.value.indexOf("/") === -1) {
                warnings.push("保留无皮肤前缀的 [mesh:" + t.value + "] 可能导致跨皮肤查找不到源网格");
              }
              newTags.push({ key: "mesh", value: t.value });
            } else {
              // unlink：将链接网格转为独立网格
              if (t.value !== null) {
                warnings.push("已将 [mesh:" + t.value + "] 解绑为独立 [mesh]: " + node.name);
              }
              newTags.push({ key: "mesh", value: null });
            }
            continue;
          }
          newTags.push({ key: t.key, value: t.value });
        }

        var targetNodeName = T.formatLayerName(cleanBase, newTags, tagPosition);
        if (isGroup) {
          operations.push({
            type: "createGroup",
            sourceLayerId: node.id,
            sourceName: node.name,
            targetName: targetNodeName,
            parentTargetPath: parentTargetPath
          });
          walkChildren(node.children, parentTargetPath + "/" + targetNodeName, nextFolderPrefix);
        } else {
          operations.push({
            type: "duplicateLayer",
            sourceLayerId: node.id,
            sourceName: node.name,
            targetName: targetNodeName,
            parentTargetPath: parentTargetPath
          });
        }
      }
    }

    walkChildren(sourceSkinNode.children, rootName, "");

    return {
      ok: true,
      errors: errors,
      warnings: warnings,
      rootName: rootName,
      operations: operations
    };
  }

  PSSplitter.Core.SkinMapper = {
    validateSkinName: validateSkinName,
    buildSkinClonePlan: buildSkinClonePlan
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = PSSplitter.Core.SkinMapper;
  }
})();

// --- END core\skin_mapper.js ---

// --- BEGIN core\alignment_math.js ---
/**
 * @fileoverview 对称轴镜像、偏差检测、9宫格对齐与安全画布裁切几何数学库（PSSplitter.Core.AlignmentMath）
 * 所有返回值键名严格对齐 PROJECT.md 契约，并对 -0 做 +0 规范化处理。
 */

(function () {
  var rootScope = (typeof $ !== "undefined" && $.global)
    ? $.global
    : (typeof global !== "undefined" ? global : (function () { return this; }()));
  rootScope.PSSplitter = rootScope.PSSplitter || {};
  rootScope.PSSplitter.Core = rootScope.PSSplitter.Core || {};
  var PSSplitter = rootScope.PSSplitter;

  function getPolyfill() {
    if (PSSplitter && PSSplitter.Core && PSSplitter.Core.Polyfill) {
      return PSSplitter.Core.Polyfill;
    }
    if (typeof require === "function") {
      return require("./polyfill_es3.js");
    }
    throw new Error("PSSplitter.Core.Polyfill is required");
  }

  var VALID_ANCHORS = ["TL", "TC", "TR", "CL", "CC", "CR", "BL", "BC", "BR"];

  function isFiniteNum(v) {
    return typeof v === "number" && !isNaN(v) && isFinite(v);
  }

  function normZero(v) {
    return v === 0 ? 0 : v;
  }

  function isValidBounds(b, allowZeroArea) {
    var P = getPolyfill();
    if (!P.isArray(b) || b.length < 4) {
      return false;
    }
    if (!isFiniteNum(b[0]) || !isFiniteNum(b[1]) || !isFiniteNum(b[2]) || !isFiniteNum(b[3])) {
      return false;
    }
    if (allowZeroArea) {
      return b[2] >= b[0] && b[3] >= b[1];
    }
    return b[2] > b[0] && b[3] > b[1];
  }

  /**
   * 计算矩形包围盒沿垂直对称轴 axisX 水平镜像后的目标坐标与位移量
   * @param {Array<number>} bounds [left, top, right, bottom]
   * @param {number} axisX 对称轴 X 坐标
   * @returns {{targetCenterX:number, deltaX:number, targetBounds:Array<number>}} 镜像结果
   */
  function calcMirrorDelta(bounds, axisX) {
    if (!isValidBounds(bounds, true) || !isFiniteNum(axisX)) {
      throw new Error("AlignmentMath.calcMirrorDelta: invalid bounds or axisX");
    }
    var l = bounds[0];
    var t = bounds[1];
    var r = bounds[2];
    var b = bounds[3];
    var centerX = (l + r) / 2;
    var targetCenterX = normZero(2 * axisX - centerX);
    var deltaX = normZero(targetCenterX - centerX);
    var targetBounds = [
      normZero(2 * axisX - r),
      normZero(t),
      normZero(2 * axisX - l),
      normZero(b)
    ];

    return {
      targetCenterX: targetCenterX,
      deltaX: deltaX,
      targetBounds: targetBounds
    };
  }

  /**
   * 计算左右对称部件相对于中轴线 axisX 的偏差及对右侧部件的纠偏位移
   * @param {Array<number>} boundsL 左侧部件包围盒 [l,t,r,b]
   * @param {Array<number>} boundsR 右侧部件包围盒 [l,t,r,b]
   * @param {number} axisX 对称轴 X 坐标
   * @returns {{deltaX:number, deltaY:number, fixForR:{dx:number, dy:number}}} 偏差与纠偏向量
   */
  function calcSymmetryDeviation(boundsL, boundsR, axisX) {
    if (!isValidBounds(boundsL, true) || !isValidBounds(boundsR, true) || !isFiniteNum(axisX)) {
      throw new Error("AlignmentMath.calcSymmetryDeviation: invalid bounds or axisX");
    }
    var cxL = (boundsL[0] + boundsL[2]) / 2;
    var cyL = (boundsL[1] + boundsL[3]) / 2;
    var cxR = (boundsR[0] + boundsR[2]) / 2;
    var cyR = (boundsR[1] + boundsR[3]) / 2;

    var idealCxR = 2 * axisX - cxL;
    var deltaX = normZero(cxR - idealCxR);
    var deltaY = normZero(cyR - cyL);

    return {
      deltaX: deltaX,
      deltaY: deltaY,
      fixForR: {
        dx: normZero(-deltaX),
        dy: normZero(-deltaY)
      }
    };
  }

  /**
   * 获取包围盒指定 9 宫格锚点的二维坐标
   * @param {Array<number>} bounds [l,t,r,b]
   * @param {string} anchor 9 宫格锚点标识
   * @returns {{x:number, y:number}} 锚点坐标
   */
  function getAnchorPoint(bounds, anchor) {
    var l = bounds[0];
    var t = bounds[1];
    var r = bounds[2];
    var b = bounds[3];
    var cx = (l + r) / 2;
    var cy = (t + b) / 2;

    var vKey = anchor.charAt(0);
    var hKey = anchor.charAt(1);

    var x = hKey === "L" ? l : (hKey === "R" ? r : cx);
    var y = vKey === "T" ? t : (vKey === "B" ? b : cy);

    return { x: x, y: y };
  }

  /**
   * 计算 sourceBounds 按指定 9 宫格锚点对齐到 targetBounds 所需的平移向量
   * @param {Array<number>} sourceBounds 源图层包围盒
   * @param {Array<number>} targetBounds 基准图层包围盒
   * @param {string} [anchor="CC"] 9 宫格锚点（TL/TC/TR/CL/CC/CR/BL/BC/BR）
   * @returns {{dx:number, dy:number}} 平移偏移量
   */
  function calcNineGridOffset(sourceBounds, targetBounds, anchor) {
    var P = getPolyfill();
    if (!isValidBounds(sourceBounds, true) || !isValidBounds(targetBounds, true)) {
      throw new Error("AlignmentMath.calcNineGridOffset: invalid bounds");
    }

    var normAnchor = "CC";
    if (anchor !== undefined && anchor !== null) {
      var trimmed = P.trim(String(anchor));
      if (trimmed !== "") {
        normAnchor = trimmed.toUpperCase();
      }
    }
    if (P.indexOf(VALID_ANCHORS, normAnchor) === -1) {
      throw new Error("AlignmentMath.calcNineGridOffset: invalid anchor " + String(anchor));
    }

    var srcPt = getAnchorPoint(sourceBounds, normAnchor);
    var dstPt = getAnchorPoint(targetBounds, normAnchor);

    return {
      dx: normZero(dstPt.x - srcPt.x),
      dy: normZero(dstPt.y - srcPt.y)
    };
  }

  /**
   * 计算所有有效可见图层联合包围盒加上安全边距后的裁剪画布矩形
   * @param {number} docWidth 当前画布宽度
   * @param {number} docHeight 当前画布高度
   * @param {Array<Array<number>>} layerBoundsList 图层包围盒集合
   * @param {number} [padding=0] 安全边距（像素）
   * @returns {{bounds:Array<number>, changed:boolean}} 目标画布边界与是否发生收缩
   */
  function calcSafeCanvasBounds(docWidth, docHeight, layerBoundsList, padding) {
    var P = getPolyfill();
    if (!isFiniteNum(docWidth) || docWidth <= 0 || !isFiniteNum(docHeight) || docHeight <= 0) {
      throw new Error("AlignmentMath.calcSafeCanvasBounds: invalid document dimensions");
    }

    var pad = (isFiniteNum(padding) && padding > 0) ? Math.ceil(padding) : 0;
    var minL = Infinity;
    var minT = Infinity;
    var maxR = -Infinity;
    var maxB = -Infinity;
    var validCount = 0;

    if (P.isArray(layerBoundsList)) {
      var i;
      for (i = 0; i < layerBoundsList.length; i++) {
        var b = layerBoundsList[i];
        if (!isValidBounds(b, false)) {
          continue;
        }
        validCount++;
        if (b[0] < minL) { minL = b[0]; }
        if (b[1] < minT) { minT = b[1]; }
        if (b[2] > maxR) { maxR = b[2]; }
        if (b[3] > maxB) { maxB = b[3]; }
      }
    }

    if (validCount === 0) {
      return {
        bounds: [0, 0, docWidth, docHeight],
        changed: false
      };
    }

    var l = Math.max(0, Math.floor(minL) - pad);
    var t = Math.max(0, Math.floor(minT) - pad);
    var r = Math.min(docWidth, Math.ceil(maxR) + pad);
    var bVal = Math.min(docHeight, Math.ceil(maxB) + pad);

    if (l >= r || t >= bVal) {
      return {
        bounds: [0, 0, docWidth, docHeight],
        changed: false
      };
    }

    l = normZero(l);
    t = normZero(t);
    r = normZero(r);
    bVal = normZero(bVal);

    return {
      bounds: [l, t, r, bVal],
      changed: (l !== 0 || t !== 0 || r !== docWidth || bVal !== docHeight)
    };
  }

  PSSplitter.Core.AlignmentMath = {
    calcMirrorDelta: calcMirrorDelta,
    calcSymmetryDeviation: calcSymmetryDeviation,
    calcNineGridOffset: calcNineGridOffset,
    calcSafeCanvasBounds: calcSafeCanvasBounds
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = PSSplitter.Core.AlignmentMath;
  }
})();

// --- END core\alignment_math.js ---

// --- BEGIN core\clip_chain_resolver.js ---
/**
 * @fileoverview Photoshop 剪贴蒙版链条扫描与边界解析器（PSSplitter.Core.ClipChainResolver）
 * 遵循 PS 图层面板从上到下排序（index 0 为最顶层），向下方定位基底并向上连续收集 grouped===true 子层。
 */

(function () {
  var rootScope = (typeof $ !== "undefined" && $.global)
    ? $.global
    : (typeof global !== "undefined" ? global : (function () { return this; }()));
  rootScope.PSSplitter = rootScope.PSSplitter || {};
  rootScope.PSSplitter.Core = rootScope.PSSplitter.Core || {};
  var PSSplitter = rootScope.PSSplitter;

  function getPolyfill() {
    if (PSSplitter && PSSplitter.Core && PSSplitter.Core.Polyfill) {
      return PSSplitter.Core.Polyfill;
    }
    if (typeof require === "function") {
      return require("./polyfill_es3.js");
    }
    throw new Error("PSSplitter.Core.Polyfill is required");
  }

  function makeFailResult(errCode) {
    return {
      ok: false,
      baseIndex: -1,
      baseNode: null,
      clipIndices: [],
      clipNodes: [],
      topIndex: -1,
      bottomIndex: -1,
      hiddenIndices: [],
      error: errCode
    };
  }

  /**
   * 解析选中节点所在的完整剪贴蒙版链条（包含基底与所有附着于其上的剪贴子层）
   * @param {Array<Object>} siblingNodes 同一父层级下从上到下排序的兄弟节点列表
   * @param {number} selectedIndex 当前选中节点在 siblingNodes 中的索引
   * @returns {{ok:boolean, baseIndex:number, baseNode:Object|null, clipIndices:Array<number>, clipNodes:Array<Object>, topIndex:number, bottomIndex:number, hiddenIndices:Array<number>, error:string|null}}
   */
  function findClipChain(siblingNodes, selectedIndex) {
    var P = getPolyfill();

    if (!P.isArray(siblingNodes) || siblingNodes.length === 0) {
      return makeFailResult("EMPTY_SIBLINGS");
    }

    if (typeof selectedIndex !== "number" ||
      isNaN(selectedIndex) ||
      !isFinite(selectedIndex) ||
      Math.floor(selectedIndex) !== selectedIndex ||
      selectedIndex < 0 ||
      selectedIndex >= siblingNodes.length) {
      return makeFailResult("INDEX_OUT_OF_RANGE");
    }

    if (!siblingNodes[selectedIndex]) {
      return makeFailResult("INVALID_NODE");
    }

    // 1. 向下定位基底图层（grouped !== true）
    var cursor = selectedIndex;
    while (cursor < siblingNodes.length && siblingNodes[cursor] && siblingNodes[cursor].grouped === true) {
      cursor++;
    }

    if (cursor >= siblingNodes.length) {
      return makeFailResult("NO_BASE_LAYER");
    }
    if (!siblingNodes[cursor]) {
      return makeFailResult("INVALID_NODE");
    }

    var baseIndex = cursor;
    var baseNode = siblingNodes[baseIndex];

    // 2. 从基底上方连续向上收集 grouped === true 的剪贴层
    var revIndices = [];
    var i;
    for (i = baseIndex - 1; i >= 0; i--) {
      var candidate = siblingNodes[i];
      if (candidate && candidate.grouped === true) {
        revIndices.push(i);
      } else {
        break;
      }
    }

    // 反转为 index 升序（从上到下面板顺序）
    var clipIndices = [];
    var clipNodes = [];
    for (i = revIndices.length - 1; i >= 0; i--) {
      var idx = revIndices[i];
      clipIndices.push(idx);
      clipNodes.push(siblingNodes[idx]);
    }

    var topIndex = clipIndices.length > 0 ? clipIndices[0] : baseIndex;
    var bottomIndex = baseIndex;
    var hiddenIndices = [];
    for (i = topIndex; i <= bottomIndex; i++) {
      if (siblingNodes[i] && siblingNodes[i].visible === false) {
        hiddenIndices.push(i);
      }
    }

    return {
      ok: true,
      baseIndex: baseIndex,
      baseNode: baseNode,
      clipIndices: clipIndices,
      clipNodes: clipNodes,
      topIndex: topIndex,
      bottomIndex: bottomIndex,
      hiddenIndices: hiddenIndices,
      error: null
    };
  }

  PSSplitter.Core.ClipChainResolver = {
    findClipChain: findClipChain
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = PSSplitter.Core.ClipChainResolver;
  }
})();

// --- END core\clip_chain_resolver.js ---

// --- BEGIN core\preflight_validator.js ---
/**
 * @fileoverview 导出前全量合规性体检引擎（PSSplitter.Core.PreflightValidator）
 * 严格实现 10 条前置输入契约检查，对齐 PhotoshopToSpine.jsx v7.42 校验逻辑并补齐跨槽位大小写 PNG 碰撞、
 * [bone] 顶层空层原点污染、>=500 层未栅格化高危阻断等生产级检测规则。
 */

(function () {
  var rootScope = (typeof $ !== "undefined" && $.global)
    ? $.global
    : (typeof global !== "undefined" ? global : (function () { return this; }()));
  rootScope.PSSplitter = rootScope.PSSplitter || {};
  rootScope.PSSplitter.Core = rootScope.PSSplitter.Core || {};
  var PSSplitter = rootScope.PSSplitter;

  function getPolyfill() {
    if (PSSplitter && PSSplitter.Core && PSSplitter.Core.Polyfill) {
      return PSSplitter.Core.Polyfill;
    }
    if (typeof require === "function") {
      return require("./polyfill_es3.js");
    }
    throw new Error("PSSplitter.Core.Polyfill is required");
  }

  function getSpineTags() {
    if (PSSplitter && PSSplitter.Core && PSSplitter.Core.SpineTags) {
      return PSSplitter.Core.SpineTags;
    }
    if (typeof require === "function") {
      return require("./spine_tags.js");
    }
    throw new Error("PSSplitter.Core.SpineTags is required");
  }

  var ADJUSTMENT_KINDS = [
    "LEVELS",
    "CURVES",
    "COLORBALANCE",
    "BRIGHTNESSCONTRAST",
    "HUESATURATION",
    "SELECTIVECOLOR",
    "CHANNELMIXER",
    "GRADIENTMAP",
    "INVERSION",
    "INVERT",
    "THRESHOLD",
    "POSTERIZE",
    "EXPOSURE",
    "VIBRANCE",
    "PHOTOFILTER",
    "BLACKANDWHITE",
    "COLORLOOKUP",
    "ADJUSTMENT"
  ];

  var UNRASTERIZED_KINDS = [
    "SMARTOBJECT",
    "TEXT",
    "SOLIDFILL",
    "GRADIENTFILL",
    "PATTERNFILL",
    "VECTOR",
    "SHAPE"
  ];

  var SUPPORTED_EXPORT_BLENDS = [
    "NORMAL",
    "MULTIPLY",
    "SCREEN",
    "LINEARDODGE"
  ];

  var WINDOWS_RESERVED_RE = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
  var ILLEGAL_NAME_CHARS_RE = /[\\:"*?<>|\x00-\x1F]/g;
  var DOTS_ONLY_RE = /^\.+$/;
  var DRAG_ONLY_RE = /^__drag$/i;

  function normalizeBlend(blendMode) {
    if (!blendMode) {
      return "NORMAL";
    }
    return String(blendMode).toUpperCase().replace(/[\s_]/g, "");
  }

  function findTag(tags, key) {
    var i;
    for (i = 0; i < tags.length; i++) {
      if (tags[i].key === key) {
        return tags[i];
      }
    }
    return null;
  }

  function hasTag(tags, key) {
    return findTag(tags, key) !== null;
  }

  function isEmptyBounds(bounds) {
    var P = getPolyfill();
    if (!P.isArray(bounds) || bounds.length < 4) {
      return false;
    }
    return bounds[2] <= bounds[0] || bounds[3] <= bounds[1];
  }

  /**
   * 沿父链查找最近匹配指定标签的祖先或自身（模拟 PhotoshopToSpine.jsx findTagLayer）
   * @param {Object} wrap 包装节点
   * @param {string} key 标签键
   * @returns {Object|null} 匹配对象 { wrap, tag }
   */
  function findTagInAncestors(wrap, key) {
    var cur = wrap;
    while (cur) {
      var t = findTag(cur.parsed.tags, key);
      if (t !== null) {
        return { wrap: cur, tag: t };
      }
      cur = cur.parentWrap;
    }
    return null;
  }

  /**
   * 获取带有 [bone] 标签的节点的规范骨骼名
   * @param {Object} wrap 包装节点
   * @returns {string} 骨骼名称
   */
  function resolveBoneName(wrap) {
    var t = findTag(wrap.parsed.tags, "bone");
    if (t && t.value !== null && t.value !== "") {
      return t.value;
    }
    return wrap.parsed.cleanName;
  }

  /**
   * 沿父链向上计算所属 [folder]/[skin] 路径前缀（对齐 PhotoshopToSpine.jsx folders()）
   * @param {Object} startParentWrap 起始父包装节点
   * @returns {string} 规范化路径前缀（为空或以 "/" 结尾）
   */
  function computeFoldersPath(startParentWrap) {
    var P = getPolyfill();
    var segments = [];
    var cur = startParentWrap;

    while (cur) {
      var folderTag = findTag(cur.parsed.tags, "folder");
      var skinTag = findTag(cur.parsed.tags, "skin");
      var chosen = folderTag || skinTag;

      if (chosen) {
        if (chosen.key === "skin" && chosen.value && chosen.value.toLowerCase() === "default") {
          cur = cur.parentWrap;
          continue;
        }
        var segVal = (chosen.value !== null && chosen.value !== "") ? chosen.value : cur.parsed.cleanName;
        if (P.startsWith(segVal, "/")) {
          var rootSeg = segVal.slice(1);
          if (rootSeg !== "") {
            segments.unshift(rootSeg);
          }
          break;
        }
        if (segVal !== "") {
          segments.unshift(segVal);
        }
      }
      cur = cur.parentWrap;
    }

    if (segments.length === 0) {
      return "";
    }
    return segments.join("/") + "/";
  }

  /**
   * 对当前节点应用祖先组的 [name:pattern] 命名模板（由内向外）
   * @param {Object} wrap 包装节点
   * @param {string} baseName 清洗后基础名
   * @returns {string} 应用模板后的名称
   */
  function applyAncestorNamePatterns(wrap, baseName) {
    var name = baseName;
    var cur = wrap.parentWrap;
    while (cur) {
      var nt = findTag(cur.parsed.tags, "name");
      if (nt && nt.value && nt.value.indexOf("*") !== -1) {
        name = nt.value.replace(/\*/g, name);
      }
      cur = cur.parentWrap;
    }
    return name;
  }

  /**
   * 计算节点所属最近 [skin] 名称（含其上级 folder 前缀，若无则返回 "default"）
   * @param {Object} wrap 包装节点
   * @returns {string} 皮肤名
   */
  function resolveSkinName(wrap) {
    var P = getPolyfill();
    var found = findTagInAncestors(wrap, "skin");
    if (!found) {
      return "default";
    }
    var skinWrap = found.wrap;
    var skinTag = found.tag;
    var skinSeg = (skinTag.value !== null && skinTag.value !== "") ? skinTag.value : skinWrap.parsed.cleanName;

    if (P.startsWith(skinSeg, "/")) {
      return skinSeg.slice(1);
    }
    var parentFolders = computeFoldersPath(skinWrap.parentWrap);
    return parentFolders + skinSeg;
  }

  /**
   * 对全树节点执行导出前 10 条前置契约体检
   * @param {Object} virtualDoc VirtualDoc 文档快照
   * @param {Object} [options] 选项 {ignoreHiddenLayers?:boolean, ignoreBackground?:boolean, largeDocLayerThreshold?:number}
   * @returns {{passed:boolean, summary:{errors:number, warnings:number, infos:number}, issues:Array, exportStats:{attachmentCount:number, caseInsensitivePaths:Array}}}
   */
  function validateDocument(virtualDoc, options) {
    var P = getPolyfill();
    var T = getSpineTags();
    var opts = options || {};
    var ignoreHiddenLayers = !!opts.ignoreHiddenLayers;
    var ignoreBackground = opts.ignoreBackground !== false;
    var largeThreshold = (typeof opts.largeDocLayerThreshold === "number" && opts.largeDocLayerThreshold > 0)
      ? opts.largeDocLayerThreshold
      : 500;

    var doc = virtualDoc || {};
    var issues = [];
    var summary = { errors: 0, warnings: 0, infos: 0 };

    function addIssue(code, severity, node, nodePath, message, autoFixable, fixAction) {
      issues.push({
        code: code,
        severity: severity,
        layerId: node ? node.id : null,
        layerName: node ? node.name : null,
        path: nodePath || "",
        message: message,
        autoFixable: !!autoFixable,
        fixAction: fixAction || null
      });
      if (severity === "ERROR") {
        summary.errors++;
      } else if (severity === "WARNING") {
        summary.warnings++;
      } else {
        summary.infos++;
      }
    }

    // 1. 文档级契约检查
    if (doc.mode !== "RGB") {
      addIssue(
        "DOC_NOT_RGB",
        "ERROR",
        null,
        "",
        "文档颜色模式必须为 RGB（当前: " + String(doc.mode) + "）",
        true,
        "CONVERT_TO_RGB"
      );
    }
    if (doc.bitsPerChannel !== undefined && doc.bitsPerChannel !== 8) {
      addIssue(
        "DOC_NOT_8BIT",
        "WARNING",
        null,
        "",
        "建议文档位深度为 8-bit（当前: " + String(doc.bitsPerChannel) + "-bit）",
        true,
        "CONVERT_TO_8BIT"
      );
    }
    if (doc.saved !== true) {
      addIssue(
        "DOC_UNSAVED",
        "ERROR",
        null,
        "",
        "文档尚未保存至磁盘，PhotoshopToSpine.jsx 无法读取输出根目录",
        false,
        null
      );
    }
    if (doc.hasArtboards === true) {
      addIssue(
        "ARTBOARD_DETECTED",
        "ERROR",
        null,
        "",
        "检测到画板 (Artboard)，官方导出脚本在画板文档下会导致坐标与切片异常",
        false,
        null
      );
    }
    if (!doc.rulerOrigin || (doc.rulerOrigin.x === 0 && doc.rulerOrigin.y === 0)) {
      addIssue(
        "RULER_ORIGIN_DEFAULT",
        "INFO",
        null,
        "",
        "文档标尺原点仍为默认 (0, 0) 或未记录，请确认是否已对齐角色脚底中心原点",
        false,
        null
      );
    }

    var docWidth = (typeof doc.width === "number" && doc.width > 0) ? doc.width : 0;
    var docHeight = (typeof doc.height === "number" && doc.height > 0) ? doc.height : 0;

    // 2. 第一遍：构建带 parent 引用的包装树并统计层数
    var countedLayers = 0;

    function buildWraps(nodes, parentWrap, parentPath) {
      var list = [];
      if (!P.isArray(nodes)) {
        return list;
      }
      var i;
      for (i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (!n) {
          continue;
        }
        countedLayers++;
        var isGroup = n.type === "LayerSet";
        var parsed = T.parseLayerName(n.name, isGroup);
        var upperKind = n.kind ? String(n.kind).toUpperCase() : "NORMAL";
        var nodePath = parentPath ? (parentPath + "/" + n.name) : String(n.name || "");
        var isEmpty = isGroup
          ? (!P.isArray(n.children) || n.children.length === 0)
          : (n.isEmpty === true || isEmptyBounds(n.bounds));

        var wrap = {
          node: n,
          parentWrap: parentWrap,
          isGroup: isGroup,
          nodePath: nodePath,
          parsed: parsed,
          upperKind: upperKind,
          isAdjustment: !isGroup && P.indexOf(ADJUSTMENT_KINDS, upperKind) !== -1,
          isUnrasterizedKind: !isGroup && P.indexOf(UNRASTERIZED_KINDS, upperKind) !== -1,
          hasIgnoreTag: hasTag(parsed.tags, "ignore"),
          hasMergeTag: hasTag(parsed.tags, "merge"),
          hasOverlayTag: hasTag(parsed.tags, "overlay"),
          isEmptyNode: isEmpty,
          childrenWraps: []
        };
        if (isGroup && P.isArray(n.children)) {
          wrap.childrenWraps = buildWraps(n.children, wrap, nodePath);
        }
        list.push(wrap);
      }
      return list;
    }

    var rootWraps = buildWraps(doc.layers || [], null, "");
    var reportedTotal = (typeof doc.totalLayerCount === "number" && doc.totalLayerCount > 0) ? doc.totalLayerCount : 0;
    var effectiveTotalCount = Math.max(countedLayers, reportedTotal);

    var hasAnyUnrasterized = false;
    var exportRecords = [];
    var boneParentRegistry = {};
    var reportedBoneConflict = {};
    var boneTopEmptySeen = {};

    /**
     * 检查并记录标签层面的详细错误（对齐契约 2）
     * @param {Object} wrap 包装节点
     */
    function checkNodeTags(wrap) {
      var n = wrap.node;
      var parsed = wrap.parsed;
      var i;

      for (i = 0; i < parsed.invalidTags.length; i++) {
        var inv = parsed.invalidTags[i];
        var inner = P.trim(inv.slice(1, inv.length - 1));
        var colonIdx = inner.indexOf(":");
        var rawKey = colonIdx !== -1 ? P.trim(inner.slice(0, colonIdx)) : inner;
        var rawVal = colonIdx !== -1 ? P.trim(inner.slice(colonIdx + 1)) : null;
        var lowerKey = rawKey.toLowerCase();

        if (lowerKey === "notrim") {
          addIssue(
            "INVALID_TAG_NOTRIM",
            "ERROR",
            n,
            wrap.nodePath,
            "不支持非法标签 [notrim]，请替换为 [trim:false]",
            true,
            "REPLACE_NOTRIM_TAG"
          );
        } else if (colonIdx !== -1 && rawVal === "" && P.indexOf(T.OFFICIAL_TAGS, lowerKey) !== -1 && rawKey === lowerKey) {
          addIssue(
            "EMPTY_TAG_VALUE",
            "ERROR",
            n,
            wrap.nodePath,
            "标签参数不能为空: " + inv,
            false,
            null
          );
        } else if (rawKey === "name" && !wrap.isGroup) {
          addIssue(
            "GROUP_ONLY_TAG_ON_LAYER",
            "ERROR",
            n,
            wrap.nodePath,
            "标签 [name:pattern] 仅可用于图层组: " + inv,
            false,
            null
          );
        } else if (rawKey === "name" && wrap.isGroup && rawVal !== null && rawVal.indexOf("*") === -1) {
          addIssue(
            "INVALID_NAME_PATTERN",
            "ERROR",
            n,
            wrap.nodePath,
            "标签 [name:pattern] 必须包含 '*' 通配符: " + inv,
            false,
            null
          );
        } else if (rawKey === "scale" && colonIdx !== -1) {
          addIssue(
            "INVALID_SCALE_VALUE",
            "ERROR",
            n,
            wrap.nodePath,
            "标签 [scale] 参数必须为大于 0 的有限正数: " + inv,
            false,
            null
          );
        } else {
          addIssue(
            "INVALID_TAG",
            "ERROR",
            n,
            wrap.nodePath,
            "包含非法或大小写不合规标签: " + inv,
            false,
            null
          );
        }
      }

      if (wrap.isGroup && hasTag(parsed.tags, "path") && !wrap.hasMergeTag) {
        addIssue(
          "PATH_TAG_ON_NON_MERGE_GROUP",
          "ERROR",
          n,
          wrap.nodePath,
          "普通非 [merge] 图层组严禁使用 [path:]，否则所有子图层将继承同一路径并互相覆盖",
          false,
          null
        );
      }

      if (!wrap.isGroup && wrap.hasMergeTag) {
        addIssue(
          "REDUNDANT_MERGE_ON_LAYER",
          "INFO",
          n,
          wrap.nodePath,
          "普通图层上存在冗余 [merge] 标签",
          true,
          "REMOVE_MERGE_TAG"
        );
      }

      var skinTag = findTag(parsed.tags, "skin");
      if (skinTag && skinTag.value && skinTag.value.toLowerCase() === "default") {
        addIssue(
          "DEFAULT_SKIN_RESERVED",
          "ERROR",
          n,
          wrap.nodePath,
          "皮肤名禁止使用 Spine 保留字 default",
          false,
          null
        );
      }
    }

    /**
     * 记录所属骨骼链路父子一致性（契约 9）
     * @param {Object} wrap 包装节点
     */
    function checkBoneChainConsistency(wrap) {
      var cur = wrap;
      while (cur) {
        if (hasTag(cur.parsed.tags, "bone")) {
          var boneName = resolveBoneName(cur);
          var parentBoneWrap = findTagInAncestors(cur.parentWrap, "bone");
          var parentBoneName = parentBoneWrap ? resolveBoneName(parentBoneWrap.wrap) : "__root__";

          if (!P.hasOwn(boneParentRegistry, boneName)) {
            boneParentRegistry[boneName] = parentBoneName;
          } else if (boneParentRegistry[boneName] !== parentBoneName && !P.hasOwn(reportedBoneConflict, boneName)) {
            reportedBoneConflict[boneName] = true;
            addIssue(
              "INCONSISTENT_BONE_PARENT",
              "ERROR",
              cur.node,
              cur.nodePath,
              "同名骨骼 [" + boneName + "] 存在不一致的父骨骼关系（预期: " + boneParentRegistry[boneName] + "，实际: " + parentBoneName + "）",
              false,
              null
            );
          }
        }
        cur = cur.parentWrap;
      }
    }

    /**
     * 第二遍：递归体检全树
     * @param {Array} wraps 包装节点列表
     * @param {boolean} inMergeGroup 是否处于某个 [merge] 组内部
     */
    function inspectWraps(wraps, inMergeGroup) {
      var i;
      for (i = 0; i < wraps.length; i++) {
        var wrap = wraps[i];
        var n = wrap.node;

        // 契约 7：[ignore] 作用域优先隔离（早于标签检查，对齐官方 L1289）
        if (wrap.hasIgnoreTag) {
          continue;
        }

        // 背景层处理
        if (n.isBackground) {
          if (ignoreBackground) {
            continue;
          }
          addIssue(
            "BACKGROUND_LAYER_INCLUDED",
            "WARNING",
            n,
            wrap.nodePath,
            "背景层未被忽略，导出时可能作为整张底图输出",
            true,
            "UNLOCK_OR_IGNORE_BG"
          );
        }

        // 画板节点检查
        if (n.isArtboard && doc.hasArtboards !== true) {
          addIssue(
            "ARTBOARD_DETECTED",
            "ERROR",
            n,
            wrap.nodePath,
            "检测到画板组 (Artboard)",
            false,
            null
          );
        }

        // 隐藏层策略
        if (n.visible === false) {
          if (ignoreHiddenLayers) {
            addIssue(
              "HIDDEN_LAYER_SKIPPED",
              "INFO",
              n,
              wrap.nodePath,
              "隐藏图层/组已按 ignoreHiddenLayers 策略跳过导出",
              false,
              null
            );
            continue;
          }
          addIssue(
            "HIDDEN_LAYER_WILL_EXPORT",
            "WARNING",
            n,
            wrap.nodePath,
            "隐藏图层/组在默认导出配置下仍会被导出，建议添加 [ignore] 或清理",
            true,
            "TAG_IGNORE_HIDDEN_LAYERS"
          );
        }

        // 标签规范检查
        checkNodeTags(wrap);

        // 锁定检查（非 merge 组内部或组自身）
        if (n.allLocked === true && !inMergeGroup) {
          addIssue(
            "LOCKED_EXPORT_LAYER",
            "WARNING",
            n,
            wrap.nodePath,
            "图层或组处于完全锁定状态，可能阻塞栅格化、烘焙与清理操作",
            true,
            "UNLOCK_LAYERS"
          );
        }

        // 组处理
        if (wrap.isGroup && !wrap.hasMergeTag) {
          var groupBlend = normalizeBlend(n.blendMode);
          if (groupBlend !== "PASSTHROUGH" && P.indexOf(SUPPORTED_EXPORT_BLENDS, groupBlend) === -1) {
            addIssue(
              "UNSUPPORTED_BLEND_MODE",
              "WARNING",
              n,
              wrap.nodePath,
              "图层组使用了 Spine 不支持的混合模式: " + String(n.blendMode),
              true,
              "CONVERT_BLEND_MODE"
            );
          }

          if (wrap.isEmptyNode) {
            addIssue(
              "EMPTY_GROUP",
              "WARNING",
              n,
              wrap.nodePath,
              "存在空图层组（不含任何子图层）",
              true,
              "DELETE_EMPTY_LAYERS"
            );
            continue;
          }

          inspectWraps(wrap.childrenWraps, inMergeGroup);
          continue;
        }

        // [merge] 组内部只检查子层隐藏与标签；其作为整体合并导出
        var isMergeRoot = wrap.isGroup && wrap.hasMergeTag;
        if (isMergeRoot && wrap.isEmptyNode) {
          addIssue(
            "EMPTY_GROUP",
            "WARNING",
            n,
            wrap.nodePath,
            "空的 [merge] 图层组无法生成有效附件",
            true,
            "DELETE_EMPTY_LAYERS"
          );
          continue;
        }

        // 悬空调整层与悬空剪贴蒙版（仅在非 [merge] 组外阻断，对齐官方 L1293）
        if (!inMergeGroup && !isMergeRoot) {
          if (wrap.isAdjustment) {
            addIssue(
              "DANGLING_ADJUSTMENT_LAYER",
              "ERROR",
              n,
              wrap.nodePath,
              "组外调整图层在导出时会被官方脚本跳过且不隐藏，可能污染其他切图",
              true,
              "BAKE_ADJUSTMENTS"
            );
            continue;
          }
          if (n.grouped === true) {
            addIssue(
              "DANGLING_CLIPPING_MASK",
              "ERROR",
              n,
              wrap.nodePath,
              "非 [merge] 组内的剪贴蒙版子层在导出时会被跳过且不隐藏，请先合并剪贴链",
              true,
              "MERGE_CLIP_CHAINS"
            );
            continue;
          }
        }

        // [overlay] 仅检查基础混合/标签，不单独作为附件导出
        if (wrap.hasOverlayTag) {
          continue;
        }

        // 非 [merge] 内部时检查未栅格化、矢量蒙版、FX 与混合模式
        if (!inMergeGroup) {
          if (wrap.isUnrasterizedKind) {
            hasAnyUnrasterized = true;
            if (effectiveTotalCount >= largeThreshold) {
              addIssue(
                "UNRASTERIZED_LAYER_HIGH_RISK_500",
                "ERROR",
                n,
                wrap.nodePath,
                "文档图层总数 >= " + largeThreshold + "，官方 rasterizeAll() 将失效，必须提前栅格化该图层",
                true,
                "RASTERIZE_LAYERS"
              );
            } else {
              addIssue(
                "UNRASTERIZED_LAYER",
                "WARNING",
                n,
                wrap.nodePath,
                "存在未栅格化智能对象/文本/填充/矢量层，建议导出前先栅格化",
                true,
                "RASTERIZE_LAYERS"
              );
            }
          }

          if (n.hasVectorMask === true) {
            hasAnyUnrasterized = true;
            addIssue(
              "VECTOR_MASK_PRESENT",
              "WARNING",
              n,
              wrap.nodePath,
              "图层带有矢量蒙版，建议导出前栅格化固化",
              true,
              "RASTERIZE_LAYERS"
            );
          }

          if (n.hasLayerEffects === true) {
            addIssue(
              "LAYER_EFFECTS_PRESENT",
              "WARNING",
              n,
              wrap.nodePath,
              "图层带有图层样式 (FX)，建议通过 newLayerBelow+merge 烘焙后再导出",
              true,
              "BAKE_LAYER_EFFECTS"
            );
          }

          var leafBlend = normalizeBlend(n.blendMode);
          if (P.indexOf(SUPPORTED_EXPORT_BLENDS, leafBlend) === -1) {
            addIssue(
              "UNSUPPORTED_BLEND_MODE",
              "WARNING",
              n,
              wrap.nodePath,
              "图层使用了 Spine 不支持的混合模式: " + String(n.blendMode),
              true,
              "CONVERT_BLEND_MODE"
            );
          }
        }

        // 空像素层 & [bone] 顶层空层飞角检查
        if (!isMergeRoot && wrap.isEmptyNode) {
          var boneAnc = findTagInAncestors(wrap, "bone");
          var boneKey = boneAnc ? resolveBoneName(boneAnc.wrap) : null;
          if (boneKey !== null && !P.hasOwn(boneTopEmptySeen, boneKey)) {
            boneTopEmptySeen[boneKey] = true;
            addIssue(
              "EMPTY_LAYER_CORRUPTS_BONE_ORIGIN",
              "ERROR",
              n,
              wrap.nodePath,
              "骨骼 [" + boneKey + "] 组内最顶有效导出位置为空像素层，将导致官方脚本将骨骼原点错误覆写为画布角点",
              true,
              "DELETE_EMPTY_LAYERS"
            );
          } else {
            addIssue(
              "EMPTY_LAYER",
              "WARNING",
              n,
              wrap.nodePath,
              "存在无有效像素的空图层",
              true,
              "DELETE_EMPTY_LAYERS"
            );
          }
          // 标记所属骨骼已见过首个候选节点
          if (boneKey !== null) {
            boneTopEmptySeen[boneKey] = true;
          }
          continue;
        }

        // 非空节点也标记所属骨骼已见过最顶有效节点
        var activeBoneAnc = findTagInAncestors(wrap, "bone");
        if (activeBoneAnc) {
          boneTopEmptySeen[resolveBoneName(activeBoneAnc.wrap)] = true;
        }

        // 若是 [merge] 根，仍检查其子孙中是否有非法标签/隐藏提示（不再单独收集导出）
        if (isMergeRoot && wrap.childrenWraps.length > 0) {
          inspectWraps(wrap.childrenWraps, true);
        }

        if (inMergeGroup) {
          continue;
        }

        // 越界像素检查（契约 10）
        if (docWidth > 0 && docHeight > 0 && P.isArray(n.bounds) && n.bounds.length >= 4 && !isEmptyBounds(n.bounds)) {
          if (n.bounds[0] < 0 || n.bounds[1] < 0 || n.bounds[2] > docWidth || n.bounds[3] > docHeight) {
            addIssue(
              "LAYER_OUT_OF_BOUNDS",
              "WARNING",
              n,
              wrap.nodePath,
              "图层像素包围盒超出画布边界，建议按画布裁切避免导出尺寸异常",
              true,
              "CLIP_OUT_OF_BOUNDS"
            );
          }
        }

        // 骨骼一致性检查
        checkBoneChainConsistency(wrap);

        // 附件命名、路径、皮肤、槽位与 Mesh 元数据计算
        var strippedBase = P.trim(wrap.parsed.cleanName);
        var noPngBase = strippedBase.replace(/\.png$/i, "");
        var hadIllegalChars = ILLEGAL_NAME_CHARS_RE.test(noPngBase);
        ILLEGAL_NAME_CHARS_RE.lastIndex = 0;
        var cleanBase = noPngBase.replace(ILLEGAL_NAME_CHARS_RE, "");
        if (DOTS_ONLY_RE.test(cleanBase) || DRAG_ONLY_RE.test(cleanBase)) {
          cleanBase = "";
        }

        var appliedName = applyAncestorNamePatterns(wrap, cleanBase);
        if (hadIllegalChars && appliedName !== "") {
          addIssue(
            "NAME_CONTAINS_ILLEGAL_CHARS",
            "WARNING",
            n,
            wrap.nodePath,
            "图层名称包含非法文件系统字符，导出时将被静默剔除",
            true,
            "SANITIZE_LAYER_NAME"
          );
        }

        // 校验最终分段是否命中 Windows 保留名、空名或超 255 字符
        var invalidAttachReason = null;
        if (appliedName === "" || appliedName === "/") {
          invalidAttachReason = "清洗或套用 [name:] 后附件名为空";
        } else {
          var attSegs = appliedName.replace(/^\//, "").split("/");
          var si;
          for (si = 0; si < attSegs.length; si++) {
            var aseg = attSegs[si];
            if (aseg === "" || DOTS_ONLY_RE.test(aseg) || DRAG_ONLY_RE.test(aseg) || WINDOWS_RESERVED_RE.test(aseg)) {
              invalidAttachReason = "附件路径分段非法或命中 Windows 保留名: " + aseg;
              break;
            }
          }
          if (invalidAttachReason === null && (appliedName.length > 255 || P.utf8ByteLength(appliedName) > 255)) {
            invalidAttachReason = "附件名称超过 255 字符/字节限制";
          }
        }

        if (invalidAttachReason !== null) {
          addIssue(
            "INVALID_ATTACHMENT_NAME",
            "ERROR",
            n,
            wrap.nodePath,
            invalidAttachReason,
            true,
            "SANITIZE_LAYER_NAME"
          );
        }

        var foldersPath = computeFoldersPath(wrap.parentWrap);
        var attachmentName = P.startsWith(appliedName, "/")
          ? appliedName.slice(1)
          : (foldersPath + appliedName);

        var skinName = resolveSkinName(wrap);
        var placeholderName = attachmentName;
        if (skinName.toLowerCase() !== "default") {
          var expectedPrefix = skinName + "/";
          if (!P.startsWith(attachmentName, expectedPrefix)) {
            addIssue(
              "EXPECTED_ATTACHMENT_PREFIX",
              "ERROR",
              n,
              wrap.nodePath,
              "皮肤 [" + skinName + "] 内附件路径 '" + attachmentName + "' 必须以 '" + expectedPrefix + "' 开头（请检查子层或子组是否误加前导 '/'）",
              true,
              "REMOVE_LEADING_SLASH"
            );
          } else {
            placeholderName = attachmentName.slice(expectedPrefix.length);
          }
        }

        var pathFound = findTagInAncestors(wrap, "path");
        var attachmentPath = attachmentName;
        if (pathFound && pathFound.tag.value) {
          var pv = pathFound.tag.value;
          attachmentPath = P.startsWith(pv, "/") ? pv.slice(1) : (foldersPath + pv);
        }

        var slotFound = findTagInAncestors(wrap, "slot");
        var slotName = (slotFound && slotFound.tag.value)
          ? slotFound.tag.value
          : (slotFound ? slotFound.wrap.parsed.cleanName : appliedName.replace(/^\//, ""));

        var meshFound = findTagInAncestors(wrap, "mesh");
        var hasMesh = meshFound !== null;
        var meshSource = (meshFound && meshFound.tag.value) ? meshFound.tag.value : null;

        exportRecords.push({
          wrap: wrap,
          node: n,
          nodePath: wrap.nodePath,
          skinName: skinName,
          slotName: slotName,
          attachmentName: attachmentName,
          attachmentPath: attachmentPath,
          placeholderName: placeholderName,
          blendMode: normalizeBlend(n.blendMode),
          hasMesh: hasMesh,
          meshSource: meshSource
        });
      }
    }

    inspectWraps(rootWraps, false);

    // >=500 层总览告警
    if (effectiveTotalCount >= largeThreshold && hasAnyUnrasterized) {
      addIssue(
        "LARGE_DOC_RASTERIZE_RISK",
        "WARNING",
        null,
        "",
        "文档总图层数 (" + effectiveTotalCount + ") >= " + largeThreshold + "，存在未栅格化图层时官方脚本将无法自动栅格化",
        true,
        "RASTERIZE_LAYERS"
      );
    }

    // 3. 收集后交叉校验：重名、混合模式混用、磁盘 PNG 大小写碰撞、Mesh 引用与环检测
    var slotSkinPlaceholders = {}; // skin::slot::placeholder -> record
    var slotPlaceholderSkins = {}; // slot::placeholder -> { skinName: record }
    var slotBlends = {};           // slot -> { blendMode, reported }
    var pathCaseMap = {};          // lowerPath -> { paths: [], layerIds: [], nodes: [] }
    var slotAttachmentLookup = {}; // slot -> { attachmentName: record }

    var rIdx;
    for (rIdx = 0; rIdx < exportRecords.length; rIdx++) {
      var rec = exportRecords[rIdx];

      // 登记 slot 混合模式一致性
      if (!P.hasOwn(slotBlends, rec.slotName)) {
        slotBlends[rec.slotName] = { blend: rec.blendMode, reported: false };
      } else if (slotBlends[rec.slotName].blend !== rec.blendMode && !slotBlends[rec.slotName].reported) {
        slotBlends[rec.slotName].reported = true;
        addIssue(
          "SLOT_MIXED_BLEND_MODES",
          "INFO",
          rec.node,
          rec.nodePath,
          "槽位 [" + rec.slotName + "] 下存在不同混合模式的图层，导出时后遍历图层会覆盖槽位混合模式",
          false,
          null
        );
      }

      // 同皮肤同槽位重复 placeholderName
      var ssKey = rec.skinName + "::" + rec.slotName + "::" + rec.placeholderName;
      if (P.hasOwn(slotSkinPlaceholders, ssKey)) {
        addIssue(
          "DUPLICATE_SKIN_ATTACHMENT",
          "ERROR",
          rec.node,
          rec.nodePath,
          "皮肤 [" + rec.skinName + "] 的槽位 [" + rec.slotName + "] 下存在重复附件占位名: " + rec.placeholderName,
          false,
          null
        );
      } else {
        slotSkinPlaceholders[ssKey] = rec;
      }

      // default 与命名皮肤同槽位同占位名冲突（对齐官方 L510-537）
      var spKey = rec.slotName + "::" + rec.placeholderName;
      if (!P.hasOwn(slotPlaceholderSkins, spKey)) {
        slotPlaceholderSkins[spKey] = {};
      }
      var existingSkins = slotPlaceholderSkins[spKey];
      var isCurrentDefault = rec.skinName.toLowerCase() === "default";
      var skList = P.keys(existingSkins);
      var skIdx;
      for (skIdx = 0; skIdx < skList.length; skIdx++) {
        var prevSkin = skList[skIdx];
        var isPrevDefault = prevSkin.toLowerCase() === "default";
        if (isCurrentDefault !== isPrevDefault) {
          addIssue(
            "DUPLICATE_SLOT_ATTACHMENT",
            "ERROR",
            rec.node,
            rec.nodePath,
            "槽位 [" + rec.slotName + "] 下的附件 [" + rec.placeholderName + "] 同时出现在 default 皮肤与命名皮肤 [" + (isCurrentDefault ? prevSkin : rec.skinName) + "] 中",
            false,
            null
          );
          break;
        }
      }
      existingSkins[rec.skinName] = rec;

      // 记录 slot 内附件索引（用于 Mesh 查找）
      if (!P.hasOwn(slotAttachmentLookup, rec.slotName)) {
        slotAttachmentLookup[rec.slotName] = {};
      }
      slotAttachmentLookup[rec.slotName][rec.attachmentName] = rec;

      // 磁盘 PNG 路径大小写碰撞（仅针对实际写盘的非 linkedmesh 附件）
      if (!(rec.hasMesh && rec.meshSource !== null) && rec.attachmentPath !== "") {
        var lowerP = rec.attachmentPath.toLowerCase();
        if (!P.hasOwn(pathCaseMap, lowerP)) {
          pathCaseMap[lowerP] = {
            lowerPath: lowerP,
            paths: [rec.attachmentPath],
            layerIds: [rec.node.id],
            records: [rec]
          };
        } else {
          var entry = pathCaseMap[lowerP];
          if (P.indexOf(entry.paths, rec.attachmentPath) === -1) {
            entry.paths.push(rec.attachmentPath);
          }
          entry.layerIds.push(rec.node.id);
          entry.records.push(rec);
        }
      }
    }

    // 汇总跨槽位 / 不区分大小写 PNG 碰撞
    var caseInsensitivePaths = [];
    var pathKeys = P.keys(pathCaseMap);
    var pkIdx;
    for (pkIdx = 0; pkIdx < pathKeys.length; pkIdx++) {
      var bucket = pathCaseMap[pathKeys[pkIdx]];
      if (bucket.layerIds.length > 1) {
        caseInsensitivePaths.push({
          lowerPath: bucket.lowerPath,
          paths: bucket.paths,
          layerIds: bucket.layerIds
        });
        var firstConflictRec = bucket.records[1];
        addIssue(
          "PNG_PATH_COLLISION_CASE_INSENSITIVE",
          "ERROR",
          firstConflictRec.node,
          firstConflictRec.nodePath,
          "磁盘导出 PNG 路径发生碰撞（不区分大小写）: " + bucket.paths.join(" <-> "),
          false,
          null
        );
      }
    }

    // 4. Mesh 源存在性、类型与环检测（契约 10）
    for (rIdx = 0; rIdx < exportRecords.length; rIdx++) {
      var mRec = exportRecords[rIdx];
      if (!mRec.hasMesh || mRec.meshSource === null) {
        continue;
      }
      var slotMap = slotAttachmentLookup[mRec.slotName] || {};
      var targetRec = P.hasOwn(slotMap, mRec.meshSource) ? slotMap[mRec.meshSource] : null;
      if (!targetRec) {
        addIssue(
          "MESH_SOURCE_NOT_FOUND",
          "ERROR",
          mRec.node,
          mRec.nodePath,
          "同槽位 [" + mRec.slotName + "] 下找不到 [mesh:" + mRec.meshSource + "] 指向的源网格图层",
          false,
          null
        );
        continue;
      }
      if (!targetRec.hasMesh) {
        addIssue(
          "MESH_SOURCE_NOT_MESH",
          "ERROR",
          mRec.node,
          mRec.nodePath,
          "[mesh:" + mRec.meshSource + "] 指向的源图层 '" + targetRec.node.name + "' 自身未启用 [mesh] 标签",
          false,
          null
        );
        continue;
      }

      // 环检测
      var visited = [mRec];
      var cursor = targetRec;
      var hasCycle = false;
      while (cursor) {
        if (P.indexOf(visited, cursor) !== -1) {
          hasCycle = true;
          break;
        }
        visited.push(cursor);
        if (!cursor.hasMesh || cursor.meshSource === null) {
          break;
        }
        var cSlotMap = slotAttachmentLookup[cursor.slotName] || {};
        cursor = P.hasOwn(cSlotMap, cursor.meshSource) ? cSlotMap[cursor.meshSource] : null;
      }
      if (hasCycle) {
        addIssue(
          "MESH_CYCLE_DETECTED",
          "ERROR",
          mRec.node,
          mRec.nodePath,
          "检测到 [mesh] 跨图层链接循环引用: " + mRec.attachmentName + " -> " + mRec.meshSource,
          false,
          null
        );
      }
    }

    return {
      passed: summary.errors === 0,
      summary: summary,
      issues: issues,
      exportStats: {
        attachmentCount: exportRecords.length,
        caseInsensitivePaths: caseInsensitivePaths
      }
    };
  }

  PSSplitter.Core.PreflightValidator = {
    validateDocument: validateDocument
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = PSSplitter.Core.PreflightValidator;
  }
})();

// --- END core\preflight_validator.js ---

// --- BEGIN core\sanitize_planner.js ---
/**
 * @fileoverview 导出前安全净身动作计划生成器（PSSplitter.Core.SanitizePlanner）
 * 严格按拓扑顺序编排 15 步无冲突预处理操作，强制执行备份快照安全门控，
 * 并绝对隔离 [ignore]（含 SRC_BACKUP [ignore] 与 __REF__ [ignore]）保护区域。
 */

(function () {
  var rootScope = (typeof $ !== "undefined" && $.global)
    ? $.global
    : (typeof global !== "undefined" ? global : (function () { return this; }()));
  rootScope.PSSplitter = rootScope.PSSplitter || {};
  rootScope.PSSplitter.Core = rootScope.PSSplitter.Core || {};
  var PSSplitter = rootScope.PSSplitter;

  function getPolyfill() {
    if (PSSplitter && PSSplitter.Core && PSSplitter.Core.Polyfill) {
      return PSSplitter.Core.Polyfill;
    }
    if (typeof require === "function") {
      return require("./polyfill_es3.js");
    }
    throw new Error("PSSplitter.Core.Polyfill is required");
  }

  function getSpineTags() {
    if (PSSplitter && PSSplitter.Core && PSSplitter.Core.SpineTags) {
      return PSSplitter.Core.SpineTags;
    }
    if (typeof require === "function") {
      return require("./spine_tags.js");
    }
    throw new Error("PSSplitter.Core.SpineTags is required");
  }

  function getClipChainResolver() {
    if (PSSplitter && PSSplitter.Core && PSSplitter.Core.ClipChainResolver) {
      return PSSplitter.Core.ClipChainResolver;
    }
    if (typeof require === "function") {
      return require("./clip_chain_resolver.js");
    }
    throw new Error("PSSplitter.Core.ClipChainResolver is required");
  }

  function getAlignmentMath() {
    if (PSSplitter && PSSplitter.Core && PSSplitter.Core.AlignmentMath) {
      return PSSplitter.Core.AlignmentMath;
    }
    if (typeof require === "function") {
      return require("./alignment_math.js");
    }
    throw new Error("PSSplitter.Core.AlignmentMath is required");
  }

  function getPreflightValidator() {
    if (PSSplitter && PSSplitter.Core && PSSplitter.Core.PreflightValidator) {
      return PSSplitter.Core.PreflightValidator;
    }
    if (typeof require === "function") {
      return require("./preflight_validator.js");
    }
    throw new Error("PSSplitter.Core.PreflightValidator is required");
  }

  var ADJUSTMENT_KINDS = [
    "LEVELS",
    "CURVES",
    "COLORBALANCE",
    "BRIGHTNESSCONTRAST",
    "HUESATURATION",
    "SELECTIVECOLOR",
    "CHANNELMIXER",
    "GRADIENTMAP",
    "INVERSION",
    "INVERT",
    "THRESHOLD",
    "POSTERIZE",
    "EXPOSURE",
    "VIBRANCE",
    "PHOTOFILTER",
    "BLACKANDWHITE",
    "COLORLOOKUP",
    "ADJUSTMENT"
  ];

  var UNRASTERIZED_KINDS = [
    "SMARTOBJECT",
    "TEXT",
    "SOLIDFILL",
    "GRADIENTFILL",
    "PATTERNFILL",
    "VECTOR",
    "SHAPE"
  ];

  function hasTagKey(tags, key) {
    var i;
    for (i = 0; i < tags.length; i++) {
      if (tags[i].key === key) {
        return true;
      }
    }
    return false;
  }

  function pushUnique(arr, val) {
    var P = getPolyfill();
    if (val !== null && val !== undefined && P.indexOf(arr, val) === -1) {
      arr.push(val);
    }
  }

  /**
   * 检测文档顶层是否已存在 SRC_BACKUP [ignore] 快照备份组
   * @param {Object} virtualDoc VirtualDoc 文档快照
   * @returns {boolean} 是否已存在备份组
   */
  function hasBackupSnapshotGroup(virtualDoc) {
    var P = getPolyfill();
    var T = getSpineTags();
    if (!virtualDoc || !P.isArray(virtualDoc.layers)) {
      return false;
    }
    var i;
    for (i = 0; i < virtualDoc.layers.length; i++) {
      var n = virtualDoc.layers[i];
      if (!n || n.type !== "LayerSet") {
        continue;
      }
      var parsed = T.parseLayerName(n.name, true);
      if (parsed.cleanName === "SRC_BACKUP" && hasTagKey(parsed.tags, "ignore")) {
        return true;
      }
    }
    return false;
  }

  /**
   * 生成导出前安全净身步骤计划
   * @param {Object} virtualDoc VirtualDoc 文档快照
   * @param {Object} [preflightReport] PreflightValidator.validateDocument 输出报告（缺省时自动执行体检）
   * @param {Object} [policy] 清理策略配置
   * @returns {{requiresBackupSnapshot:boolean, steps:Array<{action:string, layerIds:Array<number>, params:Object, description:string}>}}
   */
  function buildSanitizePlan(virtualDoc, preflightReport, policy) {
    var P = getPolyfill();
    var T = getSpineTags();
    var ClipResolver = getClipChainResolver();
    var AlignMath = getAlignmentMath();
    var Validator = getPreflightValidator();

    var doc = virtualDoc || {};
    var pol = policy || {};

    var createBackupSnapshot = pol.createBackupSnapshot !== false;
    var convertToRgb8Bit = pol.convertToRgb8Bit !== false;
    var unlockLayers = pol.unlockLayers !== false;
    var fixAutoFixableTags = pol.fixAutoFixableTags !== false;
    var hiddenLayerPolicy = pol.hiddenLayerPolicy || "tag_ignore";
    var deleteEmptyLayers = pol.deleteEmptyLayers !== false;
    var rasterizeComplexLayers = pol.rasterizeComplexLayers !== false;
    var mergeClipChains = pol.mergeClipChains !== false;
    var flattenAdjustments = pol.flattenAdjustments !== false;
    var bakeLayerEffects = pol.bakeLayerEffects !== false;
    var unsupportedBlendPolicy = pol.unsupportedBlendPolicy || "keep";
    var deleteMicroFragments = !!pol.deleteMicroFragments;
    var clipOutOfBounds = pol.clipOutOfBounds !== false;
    var trimCanvas = !!pol.trimCanvas;
    var canvasPadding = (typeof pol.canvasPadding === "number" && pol.canvasPadding >= 0) ? pol.canvasPadding : 4;

    var report = preflightReport || Validator.validateDocument(doc, pol);
    var issues = (report && P.isArray(report.issues)) ? report.issues : [];

    var hasBackup = hasBackupSnapshotGroup(doc);

    // 收集全树非 [ignore] 节点索引、剪贴链与候选图层
    var nonIgnoreNodesById = {};
    var clipChainList = [];
    var clipParticipatingIds = [];
    var clipChildIds = [];
    var allExportBounds = [];
    var microFragmentIds = [];
    var lockedNodeIds = [];
    var hiddenNodeIds = [];
    var rasterizeNodeIds = [];
    var adjustmentNodeIds = [];
    var fxNodeIds = [];

    function scanSiblings(nodes, inMergeGroup) {
      if (!P.isArray(nodes)) {
        return;
      }

      // 优先扫描当前层级中的剪贴链条（仅在非 [merge] 作用域）
      var visitedClipIndices = [];
      var i;
      if (!inMergeGroup) {
        for (i = 0; i < nodes.length; i++) {
          var nodeC = nodes[i];
          if (!nodeC || nodeC.grouped !== true || P.indexOf(visitedClipIndices, i) !== -1) {
            continue;
          }
          var parsedC = T.parseLayerName(nodeC.name, nodeC.type === "LayerSet");
          if (hasTagKey(parsedC.tags, "ignore")) {
            continue;
          }
          var chainRes = ClipResolver.findClipChain(nodes, i);
          if (chainRes.ok && chainRes.clipIndices.length > 0 && chainRes.baseNode) {
            var baseParsed = T.parseLayerName(chainRes.baseNode.name, chainRes.baseNode.type === "LayerSet");
            if (!hasTagKey(baseParsed.tags, "ignore")) {
              var cIds = [];
              var k;
              for (k = 0; k < chainRes.clipNodes.length; k++) {
                var cn = chainRes.clipNodes[k];
                var cParsed = T.parseLayerName(cn.name, cn.type === "LayerSet");
                if (!hasTagKey(cParsed.tags, "ignore")) {
                  cIds.push(cn.id);
                  pushUnique(clipParticipatingIds, cn.id);
                  pushUnique(clipChildIds, cn.id);
                }
                pushUnique(visitedClipIndices, chainRes.clipIndices[k]);
              }
              if (cIds.length > 0) {
                pushUnique(clipParticipatingIds, chainRes.baseNode.id);
                clipChainList.push({
                  baseId: chainRes.baseNode.id,
                  clipIds: cIds
                });
              }
            }
          }
        }
      }

      for (i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (!n) {
          continue;
        }
        var isGroup = n.type === "LayerSet";
        var parsed = T.parseLayerName(n.name, isGroup);

        // 绝对保护 [ignore] 节点与子树
        if (hasTagKey(parsed.tags, "ignore")) {
          continue;
        }

        nonIgnoreNodesById[String(n.id)] = n;

        if (n.isBackground && pol.ignoreBackground !== false) {
          continue;
        }

        if (n.allLocked === true) {
          pushUnique(lockedNodeIds, n.id);
        }

        if (n.visible === false && !pol.ignoreHiddenLayers) {
          pushUnique(hiddenNodeIds, n.id);
        }

        var isMergeRoot = isGroup && hasTagKey(parsed.tags, "merge");
        if (isGroup) {
          if (P.isArray(n.children) && n.children.length > 0) {
            scanSiblings(n.children, inMergeGroup || isMergeRoot);
          }
          if (!isMergeRoot) {
            continue;
          }
        }

        if (inMergeGroup) {
          continue;
        }

        var upperKind = n.kind ? String(n.kind).toUpperCase() : "NORMAL";
        if (!isGroup && P.indexOf(ADJUSTMENT_KINDS, upperKind) !== -1) {
          pushUnique(adjustmentNodeIds, n.id);
        } else if (!isGroup && (P.indexOf(UNRASTERIZED_KINDS, upperKind) !== -1 || n.hasVectorMask === true)) {
          pushUnique(rasterizeNodeIds, n.id);
        }

        if (!isGroup && n.hasLayerEffects === true) {
          pushUnique(fxNodeIds, n.id);
        }

        if (!isGroup && P.isArray(n.bounds) && n.bounds.length >= 4) {
          var w = n.bounds[2] - n.bounds[0];
          var h = n.bounds[3] - n.bounds[1];
          if (w > 0 && h > 0) {
            allExportBounds.push(n.bounds);
            if (w <= 4 && h <= 4 && !hasTagKey(parsed.tags, "overlay")) {
              pushUnique(microFragmentIds, n.id);
            }
          }
        }
      }
    }

    scanSiblings(doc.layers || [], false);

    // 汇总来自 preflightReport 的目标图层 ID
    var fixTagIds = [];
    var fixTagActions = [];
    var emptyIds = [];
    var unsupportedBlendIds = [];
    var outOfBoundsIds = [];
    var bgUnlockIds = [];

    var idx;
    for (idx = 0; idx < issues.length; idx++) {
      var iss = issues[idx];
      if (!iss) {
        continue;
      }
      if (iss.layerId !== null && iss.layerId !== undefined && !P.hasOwn(nonIgnoreNodesById, String(iss.layerId))) {
        continue;
      }
      if (iss.fixAction === "REPLACE_NOTRIM_TAG" ||
        iss.fixAction === "REMOVE_LEADING_SLASH" ||
        iss.fixAction === "REMOVE_MERGE_TAG" ||
        iss.fixAction === "SANITIZE_LAYER_NAME") {
        pushUnique(fixTagIds, iss.layerId);
        fixTagActions.push({
          layerId: iss.layerId,
          code: iss.code,
          fixAction: iss.fixAction
        });
      } else if (iss.fixAction === "DELETE_EMPTY_LAYERS") {
        // 不直接删除正在参与非空剪贴链的节点
        if (P.indexOf(clipParticipatingIds, iss.layerId) === -1) {
          pushUnique(emptyIds, iss.layerId);
        }
      } else if (iss.fixAction === "CONVERT_BLEND_MODE") {
        pushUnique(unsupportedBlendIds, iss.layerId);
      } else if (iss.fixAction === "CLIP_OUT_OF_BOUNDS") {
        pushUnique(outOfBoundsIds, iss.layerId);
      } else if (iss.fixAction === "UNLOCK_OR_IGNORE_BG") {
        pushUnique(bgUnlockIds, iss.layerId);
      } else if (iss.fixAction === "UNLOCK_LAYERS") {
        pushUnique(lockedNodeIds, iss.layerId);
      }
    }

    for (idx = 0; idx < bgUnlockIds.length; idx++) {
      pushUnique(lockedNodeIds, bgUnlockIds[idx]);
    }

    // 预判被删除的节点（避免对已删除层再执行后续操作）
    var scheduledDeleteIds = [];
    var hiddenAction = null;
    if (hiddenNodeIds.length > 0) {
      if (hiddenLayerPolicy === "delete") {
        hiddenAction = "DELETE_HIDDEN_LAYERS";
        for (idx = 0; idx < hiddenNodeIds.length; idx++) {
          pushUnique(scheduledDeleteIds, hiddenNodeIds[idx]);
        }
      } else if (hiddenLayerPolicy === "tag_ignore") {
        hiddenAction = "TAG_IGNORE_HIDDEN_LAYERS";
      }
    }

    var filteredEmptyIds = P.filter(emptyIds, function (id) {
      return P.indexOf(scheduledDeleteIds, id) === -1;
    });
    if (deleteEmptyLayers) {
      for (idx = 0; idx < filteredEmptyIds.length; idx++) {
        pushUnique(scheduledDeleteIds, filteredEmptyIds[idx]);
      }
    }

    var steps = [];

    // 步骤 2: 转 RGB
    if (convertToRgb8Bit && doc.mode && doc.mode !== "RGB") {
      steps.push({
        action: "CONVERT_TO_RGB",
        layerIds: [],
        params: { targetMode: "RGB" },
        description: "将文档颜色模式转换为 RGB"
      });
    }

    // 步骤 3: 转 8-bit
    if (convertToRgb8Bit && doc.bitsPerChannel !== undefined && doc.bitsPerChannel !== 8) {
      steps.push({
        action: "CONVERT_TO_8BIT",
        layerIds: [],
        params: { targetBitsPerChannel: 8 },
        description: "将文档位深度转换为 8-bit"
      });
    }

    // 步骤 4: 解锁非 [ignore] 锁定层
    if (unlockLayers && lockedNodeIds.length > 0) {
      steps.push({
        action: "UNLOCK_LAYERS",
        layerIds: lockedNodeIds,
        params: {},
        description: "解锁需要参与预处理的锁定图层或组"
      });
    }

    // 步骤 5: 自动修复可修复标签与命名问题
    if (fixAutoFixableTags && fixTagIds.length > 0) {
      steps.push({
        action: "FIX_TAG_SYNTAX",
        layerIds: fixTagIds,
        params: { fixes: fixTagActions },
        description: "修复 [notrim]、前导 '/'、冗余 [merge] 或非法命名字符"
      });
    }

    // 步骤 6: 处理非 [ignore] 隐藏图层
    if (hiddenAction !== null && hiddenNodeIds.length > 0) {
      steps.push({
        action: hiddenAction,
        layerIds: hiddenNodeIds,
        params: { policy: hiddenLayerPolicy },
        description: hiddenAction === "DELETE_HIDDEN_LAYERS"
          ? "删除非 [ignore] 隐藏废层"
          : "为非 [ignore] 隐藏图层注入 [ignore] 标签隔离导出"
      });
    }

    // 步骤 7: 清理空层与空组
    if (deleteEmptyLayers && filteredEmptyIds.length > 0) {
      steps.push({
        action: "DELETE_EMPTY_LAYERS",
        layerIds: filteredEmptyIds,
        params: {},
        description: "清理无有效像素的空图层与空组（含 [bone] 顶层空层）"
      });
    }

    // 步骤 8: 栅格化智能对象、文本、填充与矢量蒙版
    var liveRasterizeIds = P.filter(rasterizeNodeIds, function (id) {
      return P.indexOf(scheduledDeleteIds, id) === -1;
    });
    if (rasterizeComplexLayers && liveRasterizeIds.length > 0) {
      steps.push({
        action: "RASTERIZE_LAYERS",
        layerIds: liveRasterizeIds,
        params: { perLayerMode: true },
        description: "逐层安全栅格化智能对象、文本、填充与矢量蒙版"
      });
    }

    // 步骤 9: 合并悬空剪贴蒙版链条
    var liveClipChains = [];
    var liveClipIds = [];
    for (idx = 0; idx < clipChainList.length; idx++) {
      var ch = clipChainList[idx];
      if (P.indexOf(scheduledDeleteIds, ch.baseId) !== -1) {
        continue;
      }
      var keptClips = P.filter(ch.clipIds, function (cid) {
        return P.indexOf(scheduledDeleteIds, cid) === -1;
      });
      if (keptClips.length > 0) {
        liveClipChains.push({ baseId: ch.baseId, clipIds: keptClips });
        pushUnique(liveClipIds, ch.baseId);
        var ci;
        for (ci = 0; ci < keptClips.length; ci++) {
          pushUnique(liveClipIds, keptClips[ci]);
        }
      }
    }
    if (mergeClipChains && liveClipChains.length > 0) {
      steps.push({
        action: "MERGE_CLIP_CHAINS",
        layerIds: liveClipIds,
        params: { chains: liveClipChains },
        description: "将悬空剪贴蒙版链条合并至对应基底图层"
      });
    }

    // 步骤 10: 烘焙剩余悬空调整图层（排除已随剪贴链合并的层）
    var liveAdjIds = P.filter(adjustmentNodeIds, function (id) {
      if (P.indexOf(scheduledDeleteIds, id) !== -1) {
        return false;
      }
      if (mergeClipChains && P.indexOf(clipChildIds, id) !== -1) {
        return false;
      }
      return true;
    });
    if (flattenAdjustments && liveAdjIds.length > 0) {
      steps.push({
        action: "BAKE_ADJUSTMENT_LAYERS",
        layerIds: liveAdjIds,
        params: {},
        description: "向下烘焙组外悬空调整图层"
      });
    }

    // 步骤 11: 烘焙图层样式 (FX)
    var liveFxIds = P.filter(fxNodeIds, function (id) {
      return P.indexOf(scheduledDeleteIds, id) === -1;
    });
    if (bakeLayerEffects && liveFxIds.length > 0) {
      steps.push({
        action: "BAKE_LAYER_EFFECTS",
        layerIds: liveFxIds,
        params: { method: "newLayerBelow_merge" },
        description: "使用 newLayerBelow + merge 安全烘焙图层样式 (FX)"
      });
    }

    // 步骤 12: 混合模式转换（可选）
    var liveBlendIds = P.filter(unsupportedBlendIds, function (id) {
      return P.indexOf(scheduledDeleteIds, id) === -1;
    });
    if (unsupportedBlendPolicy === "convert_normal" && liveBlendIds.length > 0) {
      steps.push({
        action: "CONVERT_BLEND_MODES",
        layerIds: liveBlendIds,
        params: { targetBlendMode: "NORMAL" },
        description: "将不支持的混合模式转为 NORMAL"
      });
    }

    // 步骤 13: 清理 <=4x4 微小碎屑（仅显式开启时）
    var liveMicroIds = P.filter(microFragmentIds, function (id) {
      return P.indexOf(scheduledDeleteIds, id) === -1;
    });
    if (deleteMicroFragments && liveMicroIds.length > 0) {
      steps.push({
        action: "DELETE_MICRO_FRAGMENTS",
        layerIds: liveMicroIds,
        params: { maxSizePx: 4 },
        description: "清理已确认的 <=4x4px 微小碎屑图层"
      });
      for (idx = 0; idx < liveMicroIds.length; idx++) {
        pushUnique(scheduledDeleteIds, liveMicroIds[idx]);
      }
    }

    // 步骤 14: 越界像素按画布裁切
    var liveOobIds = P.filter(outOfBoundsIds, function (id) {
      return P.indexOf(scheduledDeleteIds, id) === -1;
    });
    if (clipOutOfBounds && liveOobIds.length > 0) {
      steps.push({
        action: "CLIP_OUT_OF_BOUNDS",
        layerIds: liveOobIds,
        params: {
          docWidth: doc.width,
          docHeight: doc.height
        },
        description: "裁切超出文档画布范围的冗余边缘像素"
      });
    }

    // 步骤 15: 画布安全收缩（在所有像素处理落定之后执行）
    if (trimCanvas && typeof doc.width === "number" && doc.width > 0 && typeof doc.height === "number" && doc.height > 0) {
      var canvasRes = AlignMath.calcSafeCanvasBounds(doc.width, doc.height, allExportBounds, canvasPadding);
      if (canvasRes.changed) {
        steps.push({
          action: "TRIM_CANVAS",
          layerIds: [],
          params: {
            targetBounds: canvasRes.bounds,
            padding: canvasPadding
          },
          description: "收缩画布四周冗余透明留白并保留安全边距"
        });
      }
    }

    // 步骤 1: 强制快照安全门控（有实质修复步骤且无备份时前置插入 CREATE_BACKUP_SNAPSHOT）
    var hasSubstantiveChanges = steps.length > 0;
    var requiresBackupSnapshot = hasSubstantiveChanges;

    if (hasSubstantiveChanges && !hasBackup && createBackupSnapshot) {
      steps.unshift({
        action: "CREATE_BACKUP_SNAPSHOT",
        layerIds: [],
        params: { groupName: "SRC_BACKUP [ignore]" },
        description: "在执行任何净身修改前创建只读原稿保护备份组 SRC_BACKUP [ignore]"
      });
    }

    return {
      requiresBackupSnapshot: requiresBackupSnapshot,
      steps: steps
    };
  }

  PSSplitter.Core.SanitizePlanner = {
    buildSanitizePlan: buildSanitizePlan
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = PSSplitter.Core.SanitizePlanner;
  }
})();

// --- END core\sanitize_planner.js ---

// --- BEGIN host\ps_am.js ---
/**
 * @fileoverview Photoshop 语言无关 ActionManager 原语封装（PSSplitter.Host.AM）
 * 严格使用 charIDToTypeID / stringIDToTypeID，确保在中/英/日等所有语言版 Photoshop CS6 ~ CC 2025+ 下稳定运行。
 */

(function () {
  var rootScope = (typeof $ !== "undefined" && $.global)
    ? $.global
    : (typeof global !== "undefined" ? global : (function () { return this; }()));
  rootScope.PSSplitter = rootScope.PSSplitter || {};
  rootScope.PSSplitter.Host = rootScope.PSSplitter.Host || {};
  var PSSplitter = rootScope.PSSplitter;

  /**
   * 4 字符 CharID 转 TypeID
   * @param {string} c4 4 字符标识
   * @returns {number} TypeID
   */
  function c2t(c4) {
    return charIDToTypeID(c4);
  }

  /**
   * StringID 转 TypeID
   * @param {string} str 字符串标识
   * @returns {number} TypeID
   */
  function s2t(str) {
    return stringIDToTypeID(str);
  }

  /**
   * 安全转换 UnitValue 或数值为像素数
   * @param {*} val UnitValue 或数字
   * @returns {number} 像素数值
   */
  function toPx(val) {
    if (val === null || val === undefined) {
      return 0;
    }
    if (typeof val === "number") {
      return val;
    }
    if (typeof val.as === "function") {
      try {
        return val.as("px");
      } catch (e) {
        // 降级读取 value
      }
    }
    if (typeof val.value === "number") {
      return val.value;
    }
    var n = parseFloat(String(val));
    return isNaN(n) ? 0 : n;
  }

  /**
   * 安全读取图层边界数组 [left, top, right, bottom]（单位：像素）
   * @param {Object} layer Photoshop Layer 对象
   * @returns {Array<number>} 像素边界
   */
  function getLayerBoundsPx(layer) {
    if (!layer || !layer.bounds) {
      return [0, 0, 0, 0];
    }
    var b = layer.bounds;
    if (b.length < 4) {
      return [0, 0, 0, 0];
    }
    return [toPx(b[0]), toPx(b[1]), toPx(b[2]), toPx(b[3])];
  }

  /**
   * 判断普通图层是否无有效像素（包围盒宽高 <= 0）
   * @param {Object} layer Photoshop ArtLayer
   * @returns {boolean} 是否为空图层
   */
  function isLayerEmpty(layer) {
    var b = getLayerBoundsPx(layer);
    return (b[2] - b[0] <= 0) || (b[3] - b[1] <= 0);
  }

  /**
   * 检测当前文档是否存在有效选区（绝不抛出无选区 Error 1302）
   * @param {Object} [doc] Photoshop Document
   * @returns {boolean} 是否存在选区
   */
  function hasSelection(doc) {
    if (typeof ActionReference !== "undefined" && typeof executeActionGet === "function") {
      try {
        var ref = new ActionReference();
        ref.putProperty(c2t("Prpr"), s2t("selection"));
        ref.putEnumerated(c2t("Dcmn"), c2t("Ordn"), c2t("Trgt"));
        var desc = executeActionGet(ref);
        return desc.hasKey(s2t("selection"));
      } catch (e) {
        // 回退至 DOM 检测
      }
    }
    var targetDoc = doc || (typeof app !== "undefined" ? app.activeDocument : null);
    if (!targetDoc || !targetDoc.selection) {
      return false;
    }
    try {
      var sb = targetDoc.selection.bounds;
      if (!sb || sb.length < 4) {
        return false;
      }
      return (toPx(sb[2]) - toPx(sb[0]) > 0) && (toPx(sb[3]) - toPx(sb[1]) > 0);
    } catch (e2) {
      return false;
    }
  }

  /**
   * 安全获取当前文档选区边界 [left, top, right, bottom]，无选区返回 null
   * @param {Object} doc Photoshop Document
   * @returns {Array<number>|null} 选区像素边界
   */
  function getSelectionBounds(doc) {
    if (!hasSelection(doc)) {
      return null;
    }
    try {
      var sb = doc.selection.bounds;
      return [toPx(sb[0]), toPx(sb[1]), toPx(sb[2]), toPx(sb[3])];
    } catch (e) {
      return null;
    }
  }

  /**
   * 判断两个像素包围盒是否存在非空交集
   * @param {Array<number>} a [l, t, r, b]
   * @param {Array<number>} b [l, t, r, b]
   * @returns {boolean} 是否相交
   */
  function boundsIntersect(a, b) {
    if (!a || !b) {
      return false;
    }
    var l = a[0] > b[0] ? a[0] : b[0];
    var t = a[1] > b[1] ? a[1] : b[1];
    var r = a[2] < b[2] ? a[2] : b[2];
    var bt = a[3] < b[3] ? a[3] : b[3];
    return (r - l > 0) && (bt - t > 0);
  }

  /**
   * 取消当前选区
   * @param {Object} doc Photoshop Document
   */
  function deselect(doc) {
    try {
      if (doc && doc.selection && typeof doc.selection.deselect === "function") {
        doc.selection.deselect();
      }
    } catch (e) {
      // 忽略无选区取消异常
    }
  }

  /**
   * 执行「通过拷贝的图层」（等价 Ctrl+J，语言无关）
   */
  function copyToLayer() {
    executeAction(c2t("CpTL"), undefined, DialogModes.NO);
  }

  /**
   * 执行「通过剪切的图层」（等价 Ctrl+Shift+J，语言无关）
   */
  function cutToLayer() {
    executeAction(c2t("CtTL"), undefined, DialogModes.NO);
  }

  /**
   * 合并当前选定的图层（或向下合并，等价 Ctrl+E）
   */
  function mergeLayers() {
    executeAction(c2t("Mrg2"), undefined, DialogModes.NO);
  }

  /**
   * 设置或释放当前选中图层的剪贴蒙版状态
   * @param {boolean} enable true=创建剪贴蒙版；false=释放剪贴蒙版
   */
  function setClippingMask(enable) {
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Trgt"));
    desc.putReference(c2t("null"), ref);
    executeAction(enable ? c2t("GrpL") : c2t("Ungr"), desc, DialogModes.NO);
  }

  /**
   * 按 layerId 精确选中图层（不改变可见性）
   * @param {number} layerId Photoshop 内部图层 ID
   * @param {boolean} [addToSelection] 是否追加到当前多选
   */
  function selectLayerById(layerId, addToSelection) {
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putIdentifier(c2t("Lyr "), layerId);
    desc.putReference(c2t("null"), ref);
    if (addToSelection) {
      desc.putEnumerated(
        s2t("selectionModifier"),
        s2t("selectionModifierType"),
        s2t("addToSelection")
      );
    }
    desc.putBoolean(c2t("MkVs"), false);
    executeAction(c2t("slct"), desc, DialogModes.NO);
  }

  /**
   * 批量选中多个指定 layerId
   * @param {Array<number>} layerIds 图层 ID 列表
   */
  function selectLayersByIds(layerIds) {
    if (!layerIds || layerIds.length === 0) {
      return;
    }
    var i;
    for (i = 0; i < layerIds.length; i++) {
      selectLayerById(layerIds[i], i > 0);
    }
  }

  /**
   * 获取当前文档中用户多选的所有图层 ID（兼容 CS6 ~ CC 2025+）
   * @param {Object} doc Photoshop Document
   * @returns {Array<number>} 选中的图层 ID 列表
   */
  function getSelectedLayerIds(doc) {
    var ids = [];
    if (typeof ActionReference !== "undefined" && typeof executeActionGet === "function") {
      try {
        var docRef = new ActionReference();
        docRef.putProperty(c2t("Prpr"), s2t("targetLayersIDs"));
        docRef.putEnumerated(c2t("Dcmn"), c2t("Ordn"), c2t("Trgt"));
        var docDesc = executeActionGet(docRef);
        if (docDesc.hasKey(s2t("targetLayersIDs"))) {
          var idList = docDesc.getList(s2t("targetLayersIDs"));
          var i;
          for (i = 0; i < idList.count; i++) {
            ids.push(idList.getReference(i).getIdentifier());
          }
          if (ids.length > 0) {
            return ids;
          }
        }
      } catch (e1) {
        // 回退至 targetLayers 索引读取（CS6 / CC 2014）
      }

      try {
        var legacyRef = new ActionReference();
        legacyRef.putProperty(c2t("Prpr"), s2t("targetLayers"));
        legacyRef.putEnumerated(c2t("Dcmn"), c2t("Ordn"), c2t("Trgt"));
        var legacyDesc = executeActionGet(legacyRef);
        if (legacyDesc.hasKey(s2t("targetLayers"))) {
          var idxList = legacyDesc.getList(s2t("targetLayers"));
          var hasBg = false;
          try {
            var bg = doc.backgroundLayer;
            hasBg = !!bg;
          } catch (eBg) {
            hasBg = false;
          }
          var offset = hasBg ? 0 : 1;
          var j;
          for (j = 0; j < idxList.count; j++) {
            var itemIdx = idxList.getReference(j).getIndex() + offset;
            var lRef = new ActionReference();
            lRef.putProperty(c2t("Prpr"), s2t("layerID"));
            lRef.putIndex(c2t("Lyr "), itemIdx);
            var lDesc = executeActionGet(lRef);
            if (lDesc.hasKey(s2t("layerID"))) {
              ids.push(lDesc.getInteger(s2t("layerID")));
            }
          }
          if (ids.length > 0) {
            return ids;
          }
        }
      } catch (e2) {
        // 回退至 activeLayer
      }
    }

    if (doc && doc.activeLayer && typeof doc.activeLayer.id === "number") {
      ids.push(doc.activeLayer.id);
    }
    return ids;
  }

  /**
   * 载入当前选中图层的不透明通道为选区（等价 Ctrl+点击图层缩略图）
   */
  function loadLayerTransparencyAsSelection() {
    var desc = new ActionDescriptor();
    var refSel = new ActionReference();
    refSel.putProperty(c2t("Chnl"), c2t("fsel"));
    desc.putReference(c2t("null"), refSel);
    var refTrsp = new ActionReference();
    refTrsp.putEnumerated(c2t("Chnl"), c2t("Chnl"), c2t("Trsp"));
    desc.putReference(c2t("T   "), refTrsp);
    executeAction(c2t("setd"), desc, DialogModes.NO);
  }

  /**
   * 从当前选区中减去指定图层的透明选区（用于只填充关节外扩环带）
   */
  function subtractLayerTransparencyFromSelection() {
    var desc = new ActionDescriptor();
    var refTrsp = new ActionReference();
    refTrsp.putEnumerated(c2t("Chnl"), c2t("Chnl"), c2t("Trsp"));
    desc.putReference(c2t("null"), refTrsp);
    var refSel = new ActionReference();
    refSel.putProperty(c2t("Chnl"), c2t("fsel"));
    desc.putReference(c2t("From"), refSel);
    executeAction(c2t("Sbtr"), desc, DialogModes.NO);
  }

  /**
   * 将当前选区向外扩展指定像素
   * @param {Object} doc Photoshop Document
   * @param {number} px 扩展像素值
   */
  function expandSelection(doc, px) {
    if (px <= 0) {
      return;
    }
    if (typeof UnitValue !== "undefined") {
      doc.selection.expand(new UnitValue(px, "px"));
    } else {
      doc.selection.expand(px);
    }
  }

  /**
   * 将当前选区向内收缩指定像素
   * @param {Object} doc Photoshop Document
   * @param {number} px 收缩像素值
   */
  function contractSelection(doc, px) {
    if (px <= 0) {
      return;
    }
    if (typeof UnitValue !== "undefined") {
      doc.selection.contract(new UnitValue(px, "px"));
    } else {
      doc.selection.contract(px);
    }
  }

  /**
   * 执行内容识别填充（Content-Aware Fill）
   */
  function contentAwareFill() {
    var desc = new ActionDescriptor();
    desc.putEnumerated(c2t("Usng"), c2t("FlCn"), s2t("contentAware"));
    desc.putUnitDouble(c2t("Opct"), c2t("#Prc"), 100.0);
    desc.putEnumerated(c2t("Md  "), c2t("BlnM"), c2t("Nrml"));
    executeAction(c2t("Fl  "), desc, DialogModes.NO);
  }

  /**
   * 移去黑色杂边（Remove Black Matte）
   */
  function removeBlackMatte() {
    executeAction(c2t("RmvB"), undefined, DialogModes.NO);
  }

  /**
   * 移去白色杂边（Remove White Matte）
   */
  function removeWhiteMatte() {
    executeAction(c2t("RmvW"), undefined, DialogModes.NO);
  }

  /**
   * 去边（Defringe）
   * @param {number} widthPx 去边宽度（1 ~ 200 px）
   */
  function defringe(widthPx) {
    var w = widthPx > 0 ? Math.round(widthPx) : 1;
    var desc = new ActionDescriptor();
    desc.putInteger(c2t("Wdth"), w);
    executeAction(c2t("Dfrg"), desc, DialogModes.NO);
  }

  /**
   * 为当前选中图层或组设置图层面板标签颜色（如 "Rd  "=红、"Bl  "=蓝、"Grn "=绿、"None"=无）
   * @param {string} colorChar4 4 字符颜色代码
   */
  function setLayerColorLabel(colorChar4) {
    try {
      var desc = new ActionDescriptor();
      var ref = new ActionReference();
      ref.putEnumerated(c2t("Lyr "), c2t("Ordn"), c2t("Trgt"));
      desc.putReference(c2t("null"), ref);
      var setDesc = new ActionDescriptor();
      setDesc.putEnumerated(c2t("Clr "), c2t("Clr "), c2t(colorChar4));
      desc.putObject(c2t("T   "), c2t("Lyr "), setDesc);
      executeAction(c2t("setd"), desc, DialogModes.NO);
    } catch (e) {
      // 非关键视觉装饰，失败时静默忽略
    }
  }

  PSSplitter.Host.AM = {
    c2t: c2t,
    s2t: s2t,
    toPx: toPx,
    getLayerBoundsPx: getLayerBoundsPx,
    isLayerEmpty: isLayerEmpty,
    hasSelection: hasSelection,
    getSelectionBounds: getSelectionBounds,
    boundsIntersect: boundsIntersect,
    deselect: deselect,
    copyToLayer: copyToLayer,
    cutToLayer: cutToLayer,
    mergeLayers: mergeLayers,
    setClippingMask: setClippingMask,
    selectLayerById: selectLayerById,
    selectLayersByIds: selectLayersByIds,
    getSelectedLayerIds: getSelectedLayerIds,
    loadLayerTransparencyAsSelection: loadLayerTransparencyAsSelection,
    subtractLayerTransparencyFromSelection: subtractLayerTransparencyFromSelection,
    expandSelection: expandSelection,
    contractSelection: contractSelection,
    contentAwareFill: contentAwareFill,
    removeBlackMatte: removeBlackMatte,
    removeWhiteMatte: removeWhiteMatte,
    defringe: defringe,
    setLayerColorLabel: setLayerColorLabel
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = PSSplitter.Host.AM;
  }
})();

// --- END host\ps_am.js ---

// --- BEGIN host\ps_safety.js ---
/**
 * @fileoverview Photoshop 安全事务、保护快照组与文档快照捕获模块（PSSplitter.Host.Safety）
 * 负责文档守卫、像素单位保护、单步 suspendHistory 事务、SRC_BACKUP/__REF__ [ignore] 保护区管理与会话状态记忆。
 */

(function () {
  var rootScope = (typeof $ !== "undefined" && $.global)
    ? $.global
    : (typeof global !== "undefined" ? global : (function () { return this; }()));
  rootScope.PSSplitter = rootScope.PSSplitter || {};
  rootScope.PSSplitter.Host = rootScope.PSSplitter.Host || {};
  var PSSplitter = rootScope.PSSplitter;

  var BACKUP_GROUP_NAME = "SRC_BACKUP [ignore]";
  var REF_GROUP_NAME = "__REF__ [ignore]";

  function getPolyfill() {
    if (PSSplitter && PSSplitter.Core && PSSplitter.Core.Polyfill) {
      return PSSplitter.Core.Polyfill;
    }
    if (typeof require === "function") {
      return require("../core/polyfill_es3.js");
    }
    throw new Error("PSSplitter.Core.Polyfill 未加载");
  }

  function getAM() {
    if (PSSplitter && PSSplitter.Host && PSSplitter.Host.AM) {
      return PSSplitter.Host.AM;
    }
    if (typeof require === "function") {
      return require("./ps_am.js");
    }
    throw new Error("PSSplitter.Host.AM 未加载");
  }

  /**
   * 获取或初始化当前会话状态（同一 PS 会话内跨脚本共享）
   * @returns {Object} 会话状态对象
   */
  function getSessionState() {
    if (!rootScope.__PSSplitterSessionState) {
      rootScope.__PSSplitterSessionState = {
        lastTargetGroupPath: "",
        lastBaseName: "part",
        splitCounter: 1,
        returnToSource: true,
        lastJointExpandPx: 10,
        lastJointMode: "caf",
        lastXRayOpacity: 35,
        xraySavedOpacity: {}
      };
    }
    return rootScope.__PSSplitterSessionState;
  }

  /**
   * 校验并返回当前活动文档
   * @returns {Object} Photoshop activeDocument
   */
  function ensureActiveDocument() {
    if (typeof app === "undefined" || !app.documents || app.documents.length === 0) {
      throw new Error("当前没有打开的 Photoshop 文档，请先打开角色原画 PSD 文件。");
    }
    return app.activeDocument;
  }

  /**
   * 判断节点是否为图层组（LayerSet）
   * @param {Object} layer Photoshop Layer
   * @returns {boolean} 是否为图层组
   */
  function isLayerSet(layer) {
    if (!layer) {
      return false;
    }
    if (layer.typename === "LayerSet") {
      return true;
    }
    if (typeof LayerSet !== "undefined" && layer instanceof LayerSet) {
      return true;
    }
    return false;
  }

  /**
   * 生成 HHMMSS 时间戳字符串（ES3 兼容）
   * @returns {string} 例如 "183045"
   */
  function formatTimeStamp() {
    var d = new Date();
    function pad2(n) {
      return n < 10 ? "0" + String(n) : String(n);
    }
    return pad2(d.getHours()) + pad2(d.getMinutes()) + pad2(d.getSeconds());
  }

  /**
   * 检查给定图层是否位于指定名称的祖先组内（忽略大小写）
   * @param {Object} layer 目标图层或组
   * @param {string} targetGroupName 目标祖先组名
   * @returns {boolean} 是否位于该组内
   */
  function isInsideGroupByName(layer, targetGroupName) {
    var P = getPolyfill();
    if (!layer || !targetGroupName) {
      return false;
    }
    var targetLower = P.trim(String(targetGroupName)).toLowerCase();
    var cursor = layer;
    var guard = 0;
    while (cursor && guard < 128) {
      guard++;
      var curName = cursor.name ? P.trim(String(cursor.name)).toLowerCase() : "";
      if (isLayerSet(cursor) && curName === targetLower) {
        return true;
      }
      if (!cursor.parent || cursor.parent.typename === "Document") {
        break;
      }
      cursor = cursor.parent;
    }
    return false;
  }

  /**
   * 检查图层是否处于任意层级锁定状态（自身或父组锁定）
   * @param {Object} layer 目标图层
   * @returns {boolean} 是否被锁定
   */
  function isEffectivelyLocked(layer) {
    var cursor = layer;
    var guard = 0;
    while (cursor && guard < 128) {
      guard++;
      if (cursor.allLocked === true || cursor.pixelsLocked === true) {
        return true;
      }
      if (!cursor.parent || cursor.parent.typename === "Document") {
        break;
      }
      cursor = cursor.parent;
    }
    return false;
  }

  /**
   * 在文档顶层查找指定名称的图层组（大小写不敏感）
   * @param {Object} doc Photoshop Document
   * @param {string} groupName 组名
   * @returns {Object|null} 找到的 LayerSet 或 null
   */
  function findTopLevelGroup(doc, groupName) {
    var P = getPolyfill();
    if (!doc || !doc.layerSets) {
      return null;
    }
    var targetLower = P.trim(String(groupName)).toLowerCase();
    var i;
    for (i = 0; i < doc.layerSets.length; i++) {
      var g = doc.layerSets[i];
      if (g && P.trim(String(g.name)).toLowerCase() === targetLower) {
        return g;
      }
    }
    return null;
  }

  /**
   * 按斜杠路径（如 "head [bone]/eyes [slot]"）查找已有图层组
   * @param {Object} doc Photoshop Document
   * @param {string} pathStr 组路径
   * @returns {Object|null} LayerSet 或 null
   */
  function findGroupByPath(doc, pathStr) {
    var P = getPolyfill();
    if (!doc || !pathStr) {
      return null;
    }
    var trimmed = P.trim(String(pathStr));
    if (trimmed === "") {
      return null;
    }
    var segs = trimmed.split("/");
    var container = doc;
    var i;
    for (i = 0; i < segs.length; i++) {
      var seg = P.trim(segs[i]);
      if (seg === "") {
        continue;
      }
      var segLower = seg.toLowerCase();
      var found = null;
      var j;
      for (j = 0; j < container.layerSets.length; j++) {
        var childGroup = container.layerSets[j];
        if (childGroup && P.trim(String(childGroup.name)).toLowerCase() === segLower) {
          found = childGroup;
          break;
        }
      }
      if (!found) {
        return null;
      }
      container = found;
    }
    return container === doc ? null : container;
  }

  /**
   * 递归按路径查找或自动创建目标图层组
   * @param {Object} doc Photoshop Document
   * @param {string} pathStr 组路径（如 "arm_front [bone:arm_L]/hand_L"）
   * @returns {Object|null} 目标 LayerSet
   */
  function ensureGroupByPath(doc, pathStr) {
    var P = getPolyfill();
    if (!doc || !pathStr) {
      return null;
    }
    var trimmed = P.trim(String(pathStr));
    if (trimmed === "") {
      return null;
    }
    var segs = trimmed.split("/");
    var container = doc;
    var i;
    for (i = 0; i < segs.length; i++) {
      var seg = P.trim(segs[i]);
      if (seg === "") {
        continue;
      }
      var segLower = seg.toLowerCase();
      var found = null;
      var j;
      for (j = 0; j < container.layerSets.length; j++) {
        var childGroup = container.layerSets[j];
        if (childGroup && P.trim(String(childGroup.name)).toLowerCase() === segLower) {
          found = childGroup;
          break;
        }
      }
      if (!found) {
        found = container.layerSets.add();
        found.name = seg;
      }
      container = found;
    }
    return container === doc ? null : container;
  }

  /**
   * 枚举文档中所有非保护区图层组路径（供主面板目标归组下拉列表使用）
   * @param {Object} doc Photoshop Document
   * @param {boolean} [includeProtected] 是否包含 SRC_BACKUP / __REF__
   * @returns {Array<string>} 组路径列表
   */
  function listAllGroupPaths(doc, includeProtected) {
    var P = getPolyfill();
    var out = [];
    if (!doc || !doc.layers) {
      return out;
    }
    var bakLower = BACKUP_GROUP_NAME.toLowerCase();
    var refLower = REF_GROUP_NAME.toLowerCase();

    function walk(layers, prefix) {
      var i;
      for (i = 0; i < layers.length; i++) {
        var lyr = layers[i];
        if (!isLayerSet(lyr)) {
          continue;
        }
        var lower = P.trim(String(lyr.name)).toLowerCase();
        if (!includeProtected && (lower === bakLower || lower === refLower)) {
          continue;
        }
        var curPath = prefix ? (prefix + "/" + lyr.name) : lyr.name;
        out.push(curPath);
        if (lyr.layers && lyr.layers.length > 0) {
          walk(lyr.layers, curPath);
        }
      }
    }

    walk(doc.layers, "");
    return out;
  }

  /**
   * 规范化 Photoshop BlendMode 枚举为标准大写字符串
   * @param {*} mode BlendMode 对象或字符串
   * @returns {string} 例如 "NORMAL", "LINEARDODGE", "PASSTHROUGH"
   */
  function normalizeBlendMode(mode) {
    if (!mode) {
      return "NORMAL";
    }
    var raw = String(mode);
    var dotIdx = raw.lastIndexOf(".");
    if (dotIdx !== -1) {
      raw = raw.slice(dotIdx + 1);
    }
    return raw.toUpperCase();
  }

  /**
   * 捕获当前 Photoshop 文档的轻量虚拟快照树与 ID 映射索引
   * @param {Object} doc Photoshop Document
   * @returns {{virtualDoc:Object, idMap:Object, parentMap:Object, pathMap:Object}} 快照包
   */
  function captureVirtualDoc(doc) {
    var AM = getAM();
    var idMap = {};
    var parentMap = {};
    var pathMap = {};
    var totalCount = 0;

    function walkLayers(layerCollection, parentId, pathPrefix) {
      var arr = [];
      var i;
      for (i = 0; i < layerCollection.length; i++) {
        var lyr = layerCollection[i];
        totalCount++;
        var lyrId = typeof lyr.id === "number" ? lyr.id : totalCount;
        var isGrp = isLayerSet(lyr);
        var curPath = pathPrefix ? (pathPrefix + "/" + lyr.name) : lyr.name;
        idMap[String(lyrId)] = lyr;
        parentMap[String(lyrId)] = parentId;
        pathMap[String(lyrId)] = curPath;

        var node = {
          id: lyrId,
          name: String(lyr.name),
          type: isGrp ? "LayerSet" : "ArtLayer",
          isGroup: isGrp,
          parentId: parentId,
          visible: lyr.visible !== false,
          allLocked: lyr.allLocked === true,
          grouped: !isGrp && lyr.grouped === true,
          blendMode: normalizeBlendMode(lyr.blendMode),
          opacity: typeof lyr.opacity === "number" ? lyr.opacity : 100,
          bounds: isGrp ? [0, 0, 0, 0] : AM.getLayerBoundsPx(lyr),
          isEmpty: isGrp ? false : AM.isLayerEmpty(lyr)
        };
        if (isGrp) {
          node.children = walkLayers(lyr.layers, lyrId, curPath);
        }
        arr.push(node);
      }
      return arr;
    }

    var layersTree = walkLayers(doc.layers, null, "");
    var virtualDoc = {
      name: String(doc.name || "Untitled.psd"),
      width: AM.toPx(doc.width),
      height: AM.toPx(doc.height),
      totalLayerCount: totalCount,
      layers: layersTree
    };

    return {
      virtualDoc: virtualDoc,
      idMap: idMap,
      parentMap: parentMap,
      pathMap: pathMap
    };
  }

  // suspendHistory 同步事务内部槽位
  var _txState = {
    fn: null,
    result: null,
    error: null
  };

  /**
   * 供 doc.suspendHistory 字符串回调执行的内部入口
   */
  function _runPendingTransaction() {
    try {
      if (typeof _txState.fn === "function") {
        _txState.result = _txState.fn();
      }
    } catch (e) {
      _txState.error = e;
    }
  }

  /**
   * 以像素标尺保护 + 单步 suspendHistory 事务执行 Photoshop 修改操作（支持一次 Ctrl+Z 撤回）
   * @param {Object} doc Photoshop Document
   * @param {string} historyTitle 显示在 Photoshop 历史记录面板的操作名称
   * @param {Function} fn 事务体函数
   * @returns {*} 事务体返回值
   */
  function runTransaction(doc, historyTitle, fn) {
    var prevUnits = null;
    var prevDialogs = null;
    var hasApp = typeof app !== "undefined";

    if (hasApp && app.preferences) {
      prevUnits = app.preferences.rulerUnits;
      if (typeof Units !== "undefined" && Units.PIXELS) {
        app.preferences.rulerUnits = Units.PIXELS;
      }
    }
    if (hasApp && typeof DialogModes !== "undefined") {
      prevDialogs = app.displayDialogs;
      app.displayDialogs = DialogModes.NO;
    }

    _txState.fn = fn;
    _txState.result = null;
    _txState.error = null;

    try {
      if (doc && typeof doc.suspendHistory === "function") {
        doc.suspendHistory(
          String(historyTitle || "SpineSplitter 操作"),
          "PSSplitter.Host.Safety._runPendingTransaction()"
        );
      } else {
        _runPendingTransaction();
      }
      if (_txState.error !== null) {
        throw _txState.error;
      }
      return _txState.result;
    } finally {
      _txState.fn = null;
      _txState.error = null;
      if (hasApp && app.preferences && prevUnits !== null) {
        app.preferences.rulerUnits = prevUnits;
      }
      if (hasApp && prevDialogs !== null) {
        app.displayDialogs = prevDialogs;
      }
    }
  }

  /**
   * 确保文档顶部存在参考隔离区 __REF__ [ignore]
   * @param {Object} doc Photoshop Document
   * @returns {{group:Object, created:boolean}} 组引用与是否新建
   */
  function ensureRefGroup(doc) {
    var AM = getAM();
    var existing = findTopLevelGroup(doc, REF_GROUP_NAME);
    if (existing) {
      return { group: existing, created: false };
    }
    var refGroup = doc.layerSets.add();
    refGroup.name = REF_GROUP_NAME;
    try {
      if (doc.layers.length > 1 && typeof ElementPlacement !== "undefined") {
        refGroup.move(doc.layers[0], ElementPlacement.PLACEBEFORE);
      }
    } catch (eMove) {
      // 已在顶层则忽略
    }
    try {
      doc.activeLayer = refGroup;
      AM.setLayerColorLabel("Bl  ");
    } catch (eClr) {
      // 忽略颜色标签失败
    }
    return { group: refGroup, created: true };
  }

  /**
   * 确保文档底部存在原稿只读保护组 SRC_BACKUP [ignore]，并可安全追加带时间戳的备份副本（绝不覆盖旧备份）
   * @param {Object} doc Photoshop Document
   * @param {Object} [options] { createSnapshot?:boolean, snapshotSourceLayer?:Object }
   * @returns {{group:Object, createdGroup:boolean, snapshotName:string|null}} 操作摘要
   */
  function ensureBackupGroup(doc, options) {
    var AM = getAM();
    var opts = options || {};
    var createSnapshot = opts.createSnapshot !== false;
    var bakGroup = findTopLevelGroup(doc, BACKUP_GROUP_NAME);
    var createdGroup = false;
    var wasLocked = false;

    if (!bakGroup) {
      bakGroup = doc.layerSets.add();
      bakGroup.name = BACKUP_GROUP_NAME;
      createdGroup = true;
      try {
        var bottomLayer = doc.layers[doc.layers.length - 1];
        if (bottomLayer && bottomLayer !== bakGroup && typeof ElementPlacement !== "undefined") {
          if (bottomLayer.isBackgroundLayer) {
            bakGroup.move(bottomLayer, ElementPlacement.PLACEBEFORE);
          } else {
            bakGroup.move(bottomLayer, ElementPlacement.PLACEAFTER);
          }
        }
      } catch (eMove) {
        // 忽略移动限制
      }
      try {
        doc.activeLayer = bakGroup;
        AM.setLayerColorLabel("Rd  ");
      } catch (eClr) {
        // 忽略颜色标签异常
      }
    } else if (bakGroup.allLocked) {
      wasLocked = true;
      bakGroup.allLocked = false;
    }

    var snapshotName = null;
    if (createSnapshot) {
      var source = opts.snapshotSourceLayer || doc.activeLayer;
      // 如果当前选中的正好是保护组自身，则从第一个非保护可见层中寻找源层
      if (!source || isInsideGroupByName(source, BACKUP_GROUP_NAME) || isInsideGroupByName(source, REF_GROUP_NAME)) {
        source = null;
        var k;
        for (k = 0; k < doc.layers.length; k++) {
          var cand = doc.layers[k];
          if (cand !== bakGroup && !isInsideGroupByName(cand, REF_GROUP_NAME) && cand.visible) {
            source = cand;
            break;
          }
        }
      }

      if (source) {
        var prevSourceLocked = source.allLocked;
        if (prevSourceLocked) {
          source.allLocked = false;
        }
        try {
          var dup;
          if (typeof ElementPlacement !== "undefined") {
            dup = source.duplicate(bakGroup, ElementPlacement.INSIDE);
          } else {
            dup = source.duplicate();
          }
          snapshotName = "backup_" + formatTimeStamp() + "_" + source.name;
          dup.name = snapshotName;
          dup.visible = true;
          dup.allLocked = true;
        } finally {
          if (prevSourceLocked) {
            source.allLocked = true;
          }
        }
      }
    }

    bakGroup.visible = false;
    bakGroup.allLocked = true;

    return {
      group: bakGroup,
      createdGroup: createdGroup,
      wasLocked: wasLocked,
      snapshotName: snapshotName
    };
  }

  /**
   * 一键初始化拆图安全工作区（创建/检查 SRC_BACKUP [ignore] 原稿快照与 __REF__ [ignore] 隔离区）
   * @param {Object} [options] { createSnapshot?:boolean }
   * @returns {{ok:boolean, backupCreated:boolean, refCreated:boolean, snapshotName:string|null, message:string}} 初始化结果
   */
  function initWorkspace(options) {
    var doc = ensureActiveDocument();
    var opts = options || {};
    var prevActive = doc.activeLayer;
    return runTransaction(doc, "SpineSplitter: 初始化拆图安全工作区", function () {
      var bakRes = ensureBackupGroup(doc, {
        createSnapshot: opts.createSnapshot !== false,
        snapshotSourceLayer: prevActive
      });
      var refRes = ensureRefGroup(doc);
      // 尽量恢复原先正在编辑的工作图层
      try {
        if (prevActive && !isInsideGroupByName(prevActive, BACKUP_GROUP_NAME)) {
          doc.activeLayer = prevActive;
        }
      } catch (eSel) {
        // 忽略恢复选中异常
      }
      var msg = "工作区已就绪：";
      msg += bakRes.snapshotName
        ? ("已追加只读原稿备份「" + bakRes.snapshotName + "」至 " + BACKUP_GROUP_NAME)
        : ("已确认保护组 " + BACKUP_GROUP_NAME);
      msg += "；参考隔离区 " + REF_GROUP_NAME + (refRes.created ? " 已新建。" : " 已存在。");
      return {
        ok: true,
        backupCreated: bakRes.createdGroup,
        refCreated: refRes.created,
        snapshotName: bakRes.snapshotName,
        message: msg
      };
    });
  }

  PSSplitter.Host.Safety = {
    BACKUP_GROUP_NAME: BACKUP_GROUP_NAME,
    REF_GROUP_NAME: REF_GROUP_NAME,
    getSessionState: getSessionState,
    ensureActiveDocument: ensureActiveDocument,
    isLayerSet: isLayerSet,
    isInsideGroupByName: isInsideGroupByName,
    isEffectivelyLocked: isEffectivelyLocked,
    findTopLevelGroup: findTopLevelGroup,
    findGroupByPath: findGroupByPath,
    ensureGroupByPath: ensureGroupByPath,
    listAllGroupPaths: listAllGroupPaths,
    normalizeBlendMode: normalizeBlendMode,
    captureVirtualDoc: captureVirtualDoc,
    runTransaction: runTransaction,
    _runPendingTransaction: _runPendingTransaction,
    ensureRefGroup: ensureRefGroup,
    ensureBackupGroup: ensureBackupGroup,
    initWorkspace: initWorkspace
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = PSSplitter.Host.Safety;
  }
})();

// --- END host\ps_safety.js ---

// --- BEGIN host\ps_split_joint_ops.js ---
/**
 * @fileoverview Photoshop 核心「拆」与「补」实战操作模块（PSSplitter.Host.SplitJointOps）
 * 深度聚焦 Photoshop 内角色拆图与被遮挡区/关节断口补图核心痛点：
 *  1. 漏拆像素雷达检测（原稿 vs 已拆图层选区布尔差集 + 荧光红高亮雷达层）
 *  2. 拆出并原位挖空留待补咬合选区（拆+补无缝衔接）
 *  3. 跨多层 / 复合剪贴蒙版链同选区一键拆出
 *  4. 真正 100% 肉眼见效的轮廓内缩削毛边（选区内缩 + 羽化 + 反选削边）
 *  5. 遮挡缺口咬合封口补底 & 一键新建补画夹层
 *  6. 5 方向（上/下/左/右/全向）关节断口定向像素延展补底 & 关节旋转参考圆环
 *  7. 原稿基准快照 & 局部选区无损后悔药恢复
 */

(function () {
  var rootScope = (typeof $ !== "undefined" && $.global)
    ? $.global
    : (typeof global !== "undefined" ? global : (function () { return this; }()));
  rootScope.PSSplitter = rootScope.PSSplitter || {};
  rootScope.PSSplitter.Host = rootScope.PSSplitter.Host || {};
  var PSSplitter = rootScope.PSSplitter;

  var RADAR_LAYER_NAME = "【漏拆高亮雷达_检查完即删】";
  var ARC_GUIDE_LAYER_NAME = "【关节旋转参考环_辅助】";

  function getPolyfill() {
    if (PSSplitter && PSSplitter.Core && PSSplitter.Core.Polyfill) {
      return PSSplitter.Core.Polyfill;
    }
    if (typeof require === "function") {
      return require("../core/polyfill_es3.js");
    }
    throw new Error("PSSplitter.Core.Polyfill 未加载");
  }

  function getNaming() {
    if (PSSplitter && PSSplitter.Core && PSSplitter.Core.NamingEngine) {
      return PSSplitter.Core.NamingEngine;
    }
    if (typeof require === "function") {
      return require("../core/naming_engine.js");
    }
    throw new Error("PSSplitter.Core.NamingEngine 未加载");
  }

  function getClipResolver() {
    if (PSSplitter && PSSplitter.Core && PSSplitter.Core.ClipChainResolver) {
      return PSSplitter.Core.ClipChainResolver;
    }
    if (typeof require === "function") {
      return require("../core/clip_chain_resolver.js");
    }
    throw new Error("PSSplitter.Core.ClipChainResolver 未加载");
  }

  function getAM() {
    if (PSSplitter && PSSplitter.Host && PSSplitter.Host.AM) {
      return PSSplitter.Host.AM;
    }
    if (typeof require === "function") {
      return require("./ps_am.js");
    }
    throw new Error("PSSplitter.Host.AM 未加载");
  }

  function getSafety() {
    if (PSSplitter && PSSplitter.Host && PSSplitter.Host.Safety) {
      return PSSplitter.Host.Safety;
    }
    if (typeof require === "function") {
      return require("./ps_safety.js");
    }
    throw new Error("PSSplitter.Host.Safety 未加载");
  }

  var GLOW_BLEND_MODES = {
    "LINEARDODGE": true,
    "SCREEN": true,
    "COLORDODGE": true,
    "LIGHTEN": true
  };

  function pad2(num) {
    var n = Math.floor(num);
    return n < 10 ? "0" + String(n) : String(n);
  }

  function resolveUniqueLayerName(container, baseName, autoNumber) {
    var P = getPolyfill();
    var existing = {};
    var i;
    if (container && container.layers) {
      for (i = 0; i < container.layers.length; i++) {
        existing[String(container.layers[i].name).toLowerCase()] = true;
      }
    }
    var clean = P.trim(String(baseName || "part"));
    if (clean === "") {
      clean = "part";
    }
    if (!autoNumber && !P.hasOwn(existing, clean.toLowerCase())) {
      return clean;
    }
    var idx = 1;
    var candidate;
    while (idx < 9999) {
      candidate = clean + "_" + pad2(idx);
      if (!P.hasOwn(existing, candidate.toLowerCase())) {
        return candidate;
      }
      idx++;
    }
    return clean + "_" + String(new Date().getTime());
  }

  function isNonRasterArtLayer(layer) {
    if (!layer || typeof LayerKind === "undefined") {
      return false;
    }
    try {
      return layer.kind !== LayerKind.NORMAL;
    } catch (e) {
      return false;
    }
  }

  /**
   * 辅助：将指定 layerId 的不透明像素从当前选区中减去（ActionManager Sbtr）
   */
  function subtractLayerIdTransparencyFromSelection(layerId) {
    var AM = getAM();
    var desc = new ActionDescriptor();
    var refTrsp = new ActionReference();
    refTrsp.putEnumerated(AM.c2t("Chnl"), AM.c2t("Chnl"), AM.c2t("Trsp"));
    refTrsp.putIdentifier(AM.c2t("Lyr "), layerId);
    desc.putReference(AM.c2t("null"), refTrsp);
    var refSel = new ActionReference();
    refSel.putProperty(AM.c2t("Chnl"), AM.c2t("fsel"));
    desc.putReference(AM.c2t("From"), refSel);
    executeAction(AM.c2t("Sbtr"), desc, DialogModes.NO);
  }

  /**
   * 辅助：载入指定 layerId 的不透明通道为当前选区
   */
  function loadLayerIdTransparencyAsSelection(layerId) {
    var AM = getAM();
    var desc = new ActionDescriptor();
    var refSel = new ActionReference();
    refSel.putProperty(AM.c2t("Chnl"), AM.c2t("fsel"));
    desc.putReference(AM.c2t("null"), refSel);
    var refTrsp = new ActionReference();
    refTrsp.putEnumerated(AM.c2t("Chnl"), AM.c2t("Chnl"), AM.c2t("Trsp"));
    refTrsp.putIdentifier(AM.c2t("Lyr "), layerId);
    desc.putReference(AM.c2t("T   "), refTrsp);
    executeAction(AM.c2t("setd"), desc, DialogModes.NO);
  }

  /**
   * 辅助：使用 ActionManager 按指定 RGB 颜色填充当前选区（不污染画师前景色）
   */
  function fillSelectionRgb(doc, r, g, b) {
    var AM = getAM();
    try {
      var c2t = AM.c2t;
      var desc = new ActionDescriptor();
      desc.putEnumerated(c2t("Usng"), c2t("FlCn"), c2t("Clr "));
      var clrDesc = new ActionDescriptor();
      clrDesc.putDouble(c2t("Rd  "), r);
      clrDesc.putDouble(c2t("Grn "), g);
      clrDesc.putDouble(c2t("Bl  "), b);
      desc.putObject(c2t("Clr "), c2t("RGBC"), clrDesc);
      desc.putUnitDouble(c2t("Opct"), c2t("#Prc"), 100.0);
      desc.putEnumerated(c2t("Md  "), c2t("BlnM"), c2t("Nrml"));
      executeAction(c2t("Fl  "), desc, DialogModes.NO);
    } catch (e) {
      // 忽略填充异常
    }
  }

  // ===========================================================================
  // 1. 漏拆像素雷达检测（对比原稿基准 vs 全部已拆图层）
  // ===========================================================================

  /**
   * 查找文档中的原稿基准层（优先从 SRC_BACKUP [ignore] 中取最新备份层）
   */
  function findOriginalReferenceLayer(doc) {
    var Safety = getSafety();
    var bakGroup = Safety.findTopLevelGroup(doc, Safety.BACKUP_GROUP_NAME);
    if (bakGroup && bakGroup.layers && bakGroup.layers.length > 0) {
      var i;
      for (i = 0; i < bakGroup.layers.length; i++) {
        if (!Safety.isLayerSet(bakGroup.layers[i])) {
          return { layer: bakGroup.layers[i], group: bakGroup, isFromBackup: true };
        }
      }
    }
    return null;
  }

  /**
   * 一键清理顶部的漏拆高亮雷达检查层
   */
  function clearUnsplitRadar() {
    var Safety = getSafety();
    var doc = Safety.ensureActiveDocument();
    return Safety.runTransaction(doc, "SpineSplitter: 清除漏拆雷达层", function () {
      var removed = 0;
      var i;
      for (i = doc.layers.length - 1; i >= 0; i--) {
        if (String(doc.layers[i].name) === RADAR_LAYER_NAME) {
          doc.layers[i].allLocked = false;
          doc.layers[i].remove();
          removed++;
        }
      }
      return {
        ok: true,
        removedCount: removed,
        message: removed > 0 ? "已清除漏拆高亮雷达检查层。" : "当前没有开启中的漏拆雷达检查层。"
      };
    });
  }

  /**
   * 漏拆像素雷达检测：对比原稿快照与所有已拆可见图层，自动生成荧光红高亮层标出尚未拆出的遗漏像素
   */
  function runUnsplitRadar(options) {
    var AM = getAM();
    var Safety = getSafety();
    var doc = Safety.ensureActiveDocument();
    var opts = options || {};

    var refInfo = findOriginalReferenceLayer(doc);
    if (!refInfo) {
      return {
        ok: false,
        hasUnsplit: false,
        message: "尚未建立原稿基准快照：请先选中完整原画图层，点击上方「锁定原稿基准快照」，拆图过程中即可随时扫描漏拆区域！"
      };
    }

    return Safety.runTransaction(doc, "SpineSplitter: 扫描漏拆像素雷达", function () {
      // 1. 先清理旧的雷达层
      var i;
      for (i = doc.layers.length - 1; i >= 0; i--) {
        if (String(doc.layers[i].name) === RADAR_LAYER_NAME || String(doc.layers[i].name) === ARC_GUIDE_LAYER_NAME) {
          try {
            doc.layers[i].allLocked = false;
            doc.layers[i].remove();
          } catch (eRmOld) {}
        }
      }

      // 2. 收集所有已拆分的普通工作图层（排除 SRC_BACKUP、__REF__ 以及当前原画底稿层自身）
      var splitLayers = [];
      function collectWorkLayers(container) {
        var k;
        for (k = 0; k < container.layers.length; k++) {
          var lyr = container.layers[k];
          if (Safety.isInsideGroupByName(lyr, Safety.BACKUP_GROUP_NAME) ||
              Safety.isInsideGroupByName(lyr, Safety.REF_GROUP_NAME)) {
            continue;
          }
          if (String(lyr.name) === RADAR_LAYER_NAME || String(lyr.name) === ARC_GUIDE_LAYER_NAME) {
            continue;
          }
          if (Safety.isLayerSet(lyr)) {
            if (lyr.visible !== false) {
              collectWorkLayers(lyr);
            }
          } else if (lyr.visible !== false && !AM.isLayerEmpty(lyr)) {
            splitLayers.push(lyr);
          }
        }
      }
      collectWorkLayers(doc);

      if (splitLayers.length === 0) {
        return {
          ok: false,
          hasUnsplit: true,
          message: "当前工作区尚未检测到任何已拆出的可见部件图层。"
        };
      }

      // 3. 载入原稿基准层的不透明像素作为初始总选区
      var baseLayer = refInfo.layer;
      try {
        loadLayerIdTransparencyAsSelection(baseLayer.id);
      } catch (eLoadBase) {
        var prevGVis = refInfo.group.visible;
        var prevGLock = refInfo.group.allLocked;
        refInfo.group.allLocked = false;
        refInfo.group.visible = true;
        doc.activeLayer = baseLayer;
        AM.loadLayerTransparencyAsSelection();
        refInfo.group.visible = prevGVis;
        refInfo.group.allLocked = prevGLock;
      }

      // 4. 逐层减去所有已拆出图层的非透明像素区域
      var s;
      for (s = 0; s < splitLayers.length; s++) {
        try {
          subtractLayerIdTransparencyFromSelection(splitLayers[s].id);
        } catch (eSub) {}
      }

      // 5. 若收缩 1px 过滤掉抗锯齿极细亚像素边缘后仍有选区，说明存在真实漏拆部位！
      var filterEdgePx = typeof opts.filterEdgePx === "number" ? opts.filterEdgePx : 1;
      if (filterEdgePx > 0 && AM.hasSelection(doc)) {
        try {
          AM.contractSelection(doc, filterEdgePx);
        } catch (eCon) {}
      }

      if (!AM.hasSelection(doc)) {
        AM.deselect(doc);
        return {
          ok: true,
          hasUnsplit: false,
          splitCount: splitLayers.length,
          message: "太棒了！已对比原稿与 " + String(splitLayers.length) + " 个已拆图层，未发现任何漏拆像素区域（100% 拆解完毕）。"
        };
      }

      // 6. 将漏拆选区向外扩回 2px 使其更醒目，并在最顶层创建荧光洋红高亮提示层
      try {
        AM.expandSelection(doc, filterEdgePx + 2);
      } catch (eExp) {}

      var unsplitBounds = AM.getSelectionBounds(doc);
      var radarLayer = doc.artLayers.add();
      radarLayer.name = RADAR_LAYER_NAME;
      if (doc.layers.length > 1 && typeof ElementPlacement !== "undefined") {
        try {
          radarLayer.move(doc.layers[0], ElementPlacement.PLACEBEFORE);
        } catch (eMvTop) {}
      }
      doc.activeLayer = radarLayer;
      fillSelectionRgb(doc, 255, 38, 102);
      radarLayer.opacity = 82;
      try {
        AM.setLayerColorLabel("Rd  ");
      } catch (eLbl) {}

      var boxInfo = unsplitBounds
        ? ("（漏拆范围约 " + String(Math.round(unsplitBounds[2] - unsplitBounds[0])) + "x" + String(Math.round(unsplitBounds[3] - unsplitBounds[1])) + " px）")
        : "";

      return {
        ok: true,
        hasUnsplit: true,
        splitCount: splitLayers.length,
        bounds: unsplitBounds,
        message: "检测到尚未拆出的遗漏像素区域" + boxInfo + "！已在顶层生成红色高亮层「" + RADAR_LAYER_NAME + "」并保留选区。"
      };
    });
  }

  // ===========================================================================
  // 2. 「拆 + 补」一体动作：拆出部件并原位挖空留待补咬合选区
  // ===========================================================================

  /**
   * 拆出当前选区部件到上方新图层，同时在原底层挖空被拆区域，并自动切回原底层保留外扩 2px 的待补选区！
   */
  function splitAndPreparePatch(options) {
    var AM = getAM();
    var Safety = getSafety();
    var doc = Safety.ensureActiveDocument();
    var opts = options || {};
    var overlapPx = typeof opts.overlapPx === "number" ? Math.max(1, Math.min(12, Math.round(opts.overlapPx))) : 2;

    if (!AM.hasSelection(doc)) {
      return {
        ok: false,
        message: "请先在画布上用套索或钢笔框选需要拆出的部位。"
      };
    }

    var sourceLayer = doc.activeLayer;
    if (!sourceLayer || Safety.isLayerSet(sourceLayer)) {
      return {
        ok: false,
        message: "请先在图层面板选中需要拆分的普通像素图层。"
      };
    }

    if (Safety.isInsideGroupByName(sourceLayer, Safety.BACKUP_GROUP_NAME) || Safety.isEffectivelyLocked(sourceLayer)) {
      return {
        ok: false,
        message: "当前图层已锁定或位于原稿备份组内，无法原位挖空待补。"
      };
    }

    return Safety.runTransaction(doc, "SpineSplitter: 拆出部件并原位留待补选区", function () {
      // 1. 将选区先存入临时通道以便挖空后在原图层恢复待补选区
      var tmpChannel = null;
      if (doc.channels && typeof doc.channels.add === "function" && doc.selection && typeof doc.selection.store === "function") {
        tmpChannel = doc.channels.add();
        tmpChannel.name = "__ps_splitter_patch_hole__";
        doc.selection.store(tmpChannel);
      }

      var newLayer = null;
      try {
        // 2. 执行通过剪切的图层 (CtTL)：自动把选区拆到新层并把原层对应位置挖空
        AM.cutToLayer();
        newLayer = doc.activeLayer;
        if (!newLayer || newLayer === sourceLayer || AM.isLayerEmpty(newLayer)) {
          if (newLayer && newLayer !== sourceLayer) {
            try { newLayer.remove(); } catch (eRm) {}
          }
          return {
            ok: false,
            message: "选区内无有效像素，未拆出新图层。"
          };
        }

        // 3. 自动切回底下刚被挖空的源图层，并重新载入选区且向外扩 overlapPx (2px) 咬合边缘，方便立即补底色！
        doc.activeLayer = sourceLayer;
        if (tmpChannel && typeof doc.selection.load === "function") {
          doc.selection.load(tmpChannel);
          AM.expandSelection(doc, overlapPx);
        }
      } finally {
        if (tmpChannel) {
          try { tmpChannel.remove(); } catch (eRmCh) {}
        }
      }

      return {
        ok: true,
        newLayerName: String(newLayer.name),
        sourceLayerName: String(sourceLayer.name),
        message: "已拆出「" + String(newLayer.name) + "」，并已自动切回底层「" + String(sourceLayer.name) + "」留好外扩 " + String(overlapPx) + "px 待补选区，可直接点下方【缺口无缝补底】或手绘补色！"
      };
    });
  }

  /**
   * 跨多层同选区一键拆出（线稿层 + 底色层 + 阴影层同时多选时，按同一选区一次性提取所有选中层像素并合并/编组）
   */
  function splitMultiSelectedLayers(mode) {
    var AM = getAM();
    var Safety = getSafety();
    var doc = Safety.ensureActiveDocument();
    var mergeResult = mode !== "keep";

    if (!AM.hasSelection(doc)) {
      return {
        ok: false,
        message: "请先在画布建立选区，并在图层面板按住 Ctrl/Shift 选中要同时拆出的多个图层（如线稿+底色+阴影）。"
      };
    }

    var snap = Safety.captureVirtualDoc(doc);
    var selIds = AM.getSelectedLayerIds(doc);
    if (selIds.length === 0) {
      return { ok: false, message: "请先选中至少一个图层。" };
    }

    // 如果只选了 1 个层且它属于剪贴蒙版链，自动委托给 splitClipChain
    if (selIds.length === 1) {
      return splitClipChain(mergeResult ? "merge" : "preserve", {});
    }

    return Safety.runTransaction(doc, "SpineSplitter: 跨多层同选区联合拆出", function () {
      var tmpCh = null;
      if (doc.channels && typeof doc.channels.add === "function") {
        tmpCh = doc.channels.add();
        tmpCh.name = "__ps_splitter_multi_sel__";
        doc.selection.store(tmpCh);
      }

      var extractedIds = [];
      var extractedLayers = [];
      try {
        var i;
        for (i = 0; i < selIds.length; i++) {
          var srcLyr = snap.idMap[String(selIds[i])];
          if (!srcLyr || Safety.isLayerSet(srcLyr)) {
            continue;
          }
          if (tmpCh) {
            doc.selection.load(tmpCh);
          }
          doc.activeLayer = srcLyr;
          try {
            AM.copyToLayer();
            var copied = doc.activeLayer;
            if (copied && copied !== srcLyr && !AM.isLayerEmpty(copied)) {
              extractedLayers.push(copied);
              extractedIds.push(copied.id);
            } else if (copied && copied !== srcLyr) {
              copied.remove();
            }
          } catch (eCp) {}
        }
      } finally {
        if (tmpCh) {
          try { tmpCh.remove(); } catch (eRm) {}
        }
      }

      if (extractedLayers.length === 0) {
        return { ok: false, message: "所选图层在当前选区内均无有效像素。" };
      }

      if (mergeResult && extractedIds.length > 1) {
        AM.selectLayersByIds(extractedIds);
        AM.mergeLayers();
      } else if (extractedIds.length > 1) {
        AM.selectLayersByIds(extractedIds);
      }

      AM.deselect(doc);
      return {
        ok: true,
        count: extractedLayers.length,
        message: mergeResult
          ? ("已从 " + String(extractedLayers.length) + " 个图层同选区提取并合成为单个部件图层「" + String(doc.activeLayer.name) + "」。")
          : ("已从 " + String(extractedLayers.length) + " 个图层同选区同步提取出独立分层。")
      };
    });
  }

  // ===========================================================================
  // 3. 真正 100% 见效的「轮廓内缩削毛边」(True Edge Shave)
  // ===========================================================================

  /**
   * 轮廓内缩削毛边：载入当前图层不透明选区 -> 向内收缩 shavePx (1~5px) -> 可选羽化 -> 反选 -> 真实清除外圈毛边杂色
   */
  function shaveLayerEdge(options) {
    var AM = getAM();
    var Safety = getSafety();
    var doc = Safety.ensureActiveDocument();
    var opts = options || {};
    var shavePx = typeof opts.shavePx === "number" && !isNaN(opts.shavePx)
      ? Math.max(1, Math.min(10, Math.round(opts.shavePx)))
      : 1;
    var featherPx = typeof opts.featherPx === "number" && !isNaN(opts.featherPx)
      ? Math.max(0, Math.min(5, opts.featherPx))
      : 0.5;

    var activeLayer = doc.activeLayer;
    if (!activeLayer || Safety.isLayerSet(activeLayer)) {
      return { ok: false, message: "请先选中需要削去外圈毛边的普通像素图层。" };
    }
    if (Safety.isEffectivelyLocked(activeLayer) || Safety.isInsideGroupByName(activeLayer, Safety.BACKUP_GROUP_NAME)) {
      return { ok: false, message: "当前图层已锁定或位于原稿备份组内，无法修改像素。" };
    }
    if (AM.isLayerEmpty(activeLayer)) {
      return { ok: false, message: "当前图层为空像素图层。" };
    }

    return Safety.runTransaction(doc, "SpineSplitter: 轮廓内缩削毛边 (" + String(shavePx) + "px)", function () {
      var prevClipped = activeLayer.grouped === true;

      // 1. 载入当前图层的不透明像素选区
      AM.loadLayerTransparencyAsSelection();
      if (!AM.hasSelection(doc)) {
        return { ok: false, message: "无法载入当前图层轮廓选区。" };
      }

      // 2. 向内真实收缩 shavePx 像素
      AM.contractSelection(doc, shavePx);

      // 3. 若收缩后仍有选区，可选轻微羽化使边缘柔顺，随后反选并清除外圈 1~5px 毛边
      if (AM.hasSelection(doc)) {
        if (featherPx > 0 && doc.selection && typeof doc.selection.feather === "function") {
          try {
            if (typeof UnitValue !== "undefined") {
              doc.selection.feather(new UnitValue(featherPx, "px"));
            } else {
              doc.selection.feather(featherPx);
            }
          } catch (eFeat) {}
        }
        doc.selection.invert();
        doc.selection.clear();
      }
      AM.deselect(doc);

      if (prevClipped && activeLayer.grouped !== true) {
        AM.setClippingMask(true);
      }

      return {
        ok: true,
        shavePx: shavePx,
        message: "已对「" + String(activeLayer.name) + "」向内真实削去 " + String(shavePx) + "px 外圈杂色毛边" +
          (featherPx > 0 ? ("（带 " + String(featherPx) + "px 柔化过渡）") : "") + "。"
      };
    });
  }

  // ===========================================================================
  // 4. 硬核「补」图工具箱：缺口咬合封口补底、补画夹层、5 方向定向关节延展、关节圆环
  // ===========================================================================

  /**
   * 遮挡挖空区 / 拆图窟窿一键无缝封口补底（解决普通内容识别留 1px 白缝及采样透明区发虚问题）
   */
  function patchOcclusionHole(options) {
    var AM = getAM();
    var Safety = getSafety();
    var doc = Safety.ensureActiveDocument();
    var opts = options || {};
    var overlapPx = typeof opts.overlapPx === "number" ? Math.max(0, Math.min(12, Math.round(opts.overlapPx))) : 2;
    var method = opts.method === "bleed" ? "bleed" : "caf_solid";

    var activeLayer = doc.activeLayer;
    if (!activeLayer || Safety.isLayerSet(activeLayer)) {
      return { ok: false, message: "请先选中带有挖空缺口的普通像素图层。" };
    }
    if (!AM.hasSelection(doc)) {
      return {
        ok: false,
        message: "请先用套索圈出需要补色的缺口区域（或使用上方「拆出并留待补选区」自动生成缺口选区）。"
      };
    }
    if (Safety.isEffectivelyLocked(activeLayer) || Safety.isInsideGroupByName(activeLayer, Safety.BACKUP_GROUP_NAME)) {
      return { ok: false, message: "当前图层处于锁定或原稿备份组内，无法补色。" };
    }

    return Safety.runTransaction(doc, "SpineSplitter: 缺口无缝封口补底", function () {
      var origName = activeLayer.name;
      var origOpacity = activeLayer.opacity;
      var origBlend = activeLayer.blendMode;
      var origClipped = activeLayer.grouped === true;

      // 1. 外扩 overlapPx (默认 2px) 咬合缺口周边实色边缘，彻底消灭 1px 半透明接缝白线
      if (overlapPx > 0) {
        try { AM.expandSelection(doc, overlapPx); } catch (eExp) {}
      }

      // 保存补洞选区
      var holeCh = null;
      if (doc.channels && typeof doc.channels.add === "function") {
        holeCh = doc.channels.add();
        holeCh.name = "__ps_splitter_hole_patch__";
        doc.selection.store(holeCh);
      }

      var usedCaf = false;
      try {
        if (method === "caf_solid") {
          try {
            // 先执行内容识别填充
            AM.contentAwareFill();
            usedCaf = true;
          } catch (eCaf) {
            usedCaf = false;
          }
        }

        // 无论 CAF 是否成功，都在下方用向内渐进位移垫一层 100% 实色基底，消除 CAF 采样透明区造成的半透明虚洞！
        if (holeCh) {
          AM.deselect(doc);
          var solidUnder = activeLayer.duplicate();
          if (typeof ElementPlacement !== "undefined") {
            solidUnder.move(activeLayer, ElementPlacement.PLACEAFTER);
          }
          runDirectionalBleed(doc, solidUnder, usedCaf ? 6 : 16, "all");
          var underBled = doc.activeLayer;
          // 裁掉补洞选区外的多余外溢
          doc.selection.load(holeCh);
          doc.selection.invert();
          try { doc.selection.clear(); } catch (eClr) {}
          AM.deselect(doc);

          AM.selectLayersByIds([activeLayer.id, underBled.id]);
          AM.mergeLayers();
          var finalLyr = doc.activeLayer;
          if (finalLyr) {
            finalLyr.name = origName;
            finalLyr.opacity = origOpacity;
            finalLyr.blendMode = origBlend;
            if (origClipped && finalLyr.grouped !== true) {
              AM.setClippingMask(true);
            }
          }
        }
      } finally {
        if (holeCh) {
          try { holeCh.remove(); } catch (eRmCh) {}
        }
        AM.deselect(doc);
      }

      return {
        ok: true,
        usedCaf: usedCaf,
        message: usedCaf
          ? ("已完成缺口智能内容识别 + 实色咬合封口补底（外扩咬合 " + String(overlapPx) + "px，无半透明虚边）。")
          : ("已完成缺口 8 方向周边像素向内坍缩封口补底（外扩咬合 " + String(overlapPx) + "px）。")
      };
    });
  }

  /**
   * 一键新建绑定好的「手绘补画夹层」（方便画师手动补几笔线稿或过渡色，再一键合回）
   */
  function createClippedPatchLayer(mode) {
    var AM = getAM();
    var Safety = getSafety();
    var doc = Safety.ensureActiveDocument();
    var activeLayer = doc.activeLayer;

    if (!activeLayer || Safety.isLayerSet(activeLayer)) {
      return { ok: false, message: "请先选中需要手绘修补的部件图层。" };
    }

    return Safety.runTransaction(doc, "SpineSplitter: 新建手绘补画层", function () {
      var patchLayer = doc.artLayers.add();
      var baseName = String(activeLayer.name);

      if (mode === "under") {
        // 模式 A：垫在当前部件正下方（专门用来直接拿画笔往外补关节延展头，绝不弄脏原图层已有像素！）
        patchLayer.name = baseName + "_【底层补关节_画完Ctrl+E合并】";
        if (typeof ElementPlacement !== "undefined") {
          patchLayer.move(activeLayer, ElementPlacement.PLACEAFTER);
        }
        doc.activeLayer = patchLayer;
        try { AM.setLayerColorLabel("Grn "); } catch (eC1) {}
        return {
          ok: true,
          layerName: patchLayer.name,
          message: "已在「" + baseName + "」正下方垫入补画层！您现在直接拿画笔涂抹关节或缺口，完全不会覆盖原图层现有画面；补完对上层按 Ctrl+E 即可合为一体。"
        };
      }

      // 模式 B：在当前部件正上方创建剪贴蒙版补画层（专门用来修补部件内部遮挡痕迹，不会画出部件轮廓外）
      patchLayer.name = baseName + "_【剪贴修补_画完Ctrl+E合并】";
      if (typeof ElementPlacement !== "undefined") {
        patchLayer.move(activeLayer, ElementPlacement.PLACEBEFORE);
      }
      doc.activeLayer = patchLayer;
      AM.setClippingMask(true);
      try { AM.setLayerColorLabel("Grn "); } catch (eC2) {}
      return {
        ok: true,
        layerName: patchLayer.name,
        message: "已在「" + baseName + "」上方创建剪贴蒙版补画层！画笔只会在该部件轮廓内生效，不会画超边界；补完按 Ctrl+E 即可合并。"
      };
    });
  }

  /**
   * 支持 5 方向（"up"|"down"|"left"|"right"|"all"）的渐进像素推拉延展
   */
  function runDirectionalBleed(doc, targetLayer, expandPx, direction) {
    var AM = getAM();
    var dir = direction || "all";
    var passes = expandPx <= 4 ? 1 : (expandPx <= 12 ? 2 : 3);
    var stepPx = Math.max(1, Math.round(expandPx / passes));

    var offsets;
    if (dir === "up") {
      offsets = [[0, -stepPx], [-Math.max(1, Math.round(stepPx * 0.4)), -stepPx], [Math.max(1, Math.round(stepPx * 0.4)), -stepPx]];
    } else if (dir === "down") {
      offsets = [[0, stepPx], [-Math.max(1, Math.round(stepPx * 0.4)), stepPx], [Math.max(1, Math.round(stepPx * 0.4)), stepPx]];
    } else if (dir === "left") {
      offsets = [[-stepPx, 0], [-stepPx, -Math.max(1, Math.round(stepPx * 0.4))], [-stepPx, Math.max(1, Math.round(stepPx * 0.4))]];
    } else if (dir === "right") {
      offsets = [[stepPx, 0], [stepPx, -Math.max(1, Math.round(stepPx * 0.4))], [stepPx, Math.max(1, Math.round(stepPx * 0.4))]];
    } else {
      offsets = [
        [stepPx, 0], [-stepPx, 0], [0, stepPx], [0, -stepPx],
        [stepPx, stepPx], [-stepPx, stepPx], [stepPx, -stepPx], [-stepPx, -stepPx]
      ];
    }

    var origName = targetLayer.name;
    var origOpacity = targetLayer.opacity;
    var origBlendMode = targetLayer.blendMode;
    var origGrouped = targetLayer.grouped === true;

    var cleanTop = targetLayer.duplicate();
    if (typeof ElementPlacement !== "undefined") {
      cleanTop.move(targetLayer, ElementPlacement.PLACEBEFORE);
    }

    var workingBase = targetLayer;
    var p;
    for (p = 0; p < passes; p++) {
      var clones = [workingBase];
      var d;
      for (d = 0; d < offsets.length; d++) {
        var c = workingBase.duplicate();
        if (typeof ElementPlacement !== "undefined") {
          c.move(workingBase, ElementPlacement.PLACEAFTER);
        }
        c.translate(offsets[d][0], offsets[d][1]);
        clones.push(c);
      }
      var mergeIds = [];
      var m;
      for (m = 0; m < clones.length; m++) {
        mergeIds.push(clones[m].id);
      }
      AM.selectLayersByIds(mergeIds);
      AM.mergeLayers();
      workingBase = doc.activeLayer;
    }

    AM.selectLayersByIds([cleanTop.id, workingBase.id]);
    AM.mergeLayers();
    var merged = doc.activeLayer;
    if (merged) {
      merged.name = origName;
      merged.opacity = origOpacity;
      merged.blendMode = origBlendMode;
      if (origGrouped && merged.grouped !== true) {
        AM.setClippingMask(true);
      }
    }
  }

  /**
   * 关节旋转参考圆环开关：在当前关节断口（选区或部件中心）一键生成/清除直观的十字轴心 + 旋转圆弧包络参考层
   */
  function toggleJointArcGuide(options) {
    var AM = getAM();
    var Safety = getSafety();
    var doc = Safety.ensureActiveDocument();
    var opts = options || {};

    return Safety.runTransaction(doc, "SpineSplitter: 切换关节旋转参考圆环", function () {
      // 如果已存在参考环层，则一键清除（Toggle 开关体验）
      var i;
      var removed = 0;
      for (i = doc.layers.length - 1; i >= 0; i--) {
        if (String(doc.layers[i].name) === ARC_GUIDE_LAYER_NAME) {
          doc.layers[i].allLocked = false;
          doc.layers[i].remove();
          removed++;
        }
      }
      if (removed > 0) {
        return {
          ok: true,
          active: false,
          message: "已隐藏并清除关节旋转参考圆环。"
        };
      }

      var activeLayer = doc.activeLayer;
      var box = AM.hasSelection(doc) ? AM.getSelectionBounds(doc) : (activeLayer ? AM.getLayerBoundsPx(activeLayer) : null);
      if (!box || (box[2] - box[0] <= 0)) {
        return { ok: false, active: false, message: "请先选中关节图层或用选区框出关节旋转端。" };
      }

      var cx = Math.round((box[0] + box[2]) / 2);
      var cy = Math.round((box[1] + box[3]) / 2);
      var w = box[2] - box[0];
      var h = box[3] - box[1];
      var radius = typeof opts.radiusPx === "number" && opts.radiusPx > 4
        ? Math.round(opts.radiusPx)
        : Math.max(16, Math.round(Math.min(w, h) / 2));

      var guideLayer = doc.artLayers.add();
      guideLayer.name = ARC_GUIDE_LAYER_NAME;
      if (doc.layers.length > 1 && typeof ElementPlacement !== "undefined") {
        try { guideLayer.move(doc.layers[0], ElementPlacement.PLACEBEFORE); } catch (eMv) {}
      }
      doc.activeLayer = guideLayer;

      // 使用椭圆选区 + 收缩差集绘制旋转参考圆环与中心十字准星
      try {
        var c2t = AM.c2t;
        var desc = new ActionDescriptor();
        var ref = new ActionReference();
        ref.putProperty(c2t("Chnl"), c2t("fsel"));
        desc.putReference(c2t("null"), ref);
        var ell = new ActionDescriptor();
        ell.putUnitDouble(c2t("Top "), c2t("#Pxl"), cy - radius);
        ell.putUnitDouble(c2t("Left"), c2t("#Pxl"), cx - radius);
        ell.putUnitDouble(c2t("Btom"), c2t("#Pxl"), cy + radius);
        ell.putUnitDouble(c2t("Rght"), c2t("#Pxl"), cx + radius);
        desc.putObject(c2t("T   "), c2t("Elps"), ell);
        desc.putBoolean(c2t("AntA"), true);
        executeAction(c2t("setd"), desc, DialogModes.NO);

        fillSelectionRgb(doc, 0, 225, 255);
        AM.contractSelection(doc, 2);
        doc.selection.clear();
        AM.deselect(doc);

        // 中心十字点
        doc.selection.select([[cx - 6, cy - 1], [cx + 6, cy - 1], [cx + 6, cy + 1], [cx - 6, cy + 1]]);
        fillSelectionRgb(doc, 255, 80, 120);
        doc.selection.select([[cx - 1, cy - 6], [cx + 1, cy - 6], [cx + 1, cy + 6], [cx - 1, cy + 6]]);
        fillSelectionRgb(doc, 255, 80, 120);
        AM.deselect(doc);
      } catch (eDraw) {}

      guideLayer.opacity = 80;
      if (activeLayer) {
        try { doc.activeLayer = activeLayer; } catch (eAct) {}
      }

      return {
        ok: true,
        active: true,
        center: [cx, cy],
        radius: radius,
        message: "已在关节中心 (" + String(cx) + ", " + String(cy) + ") 生成半径 " + String(radius) + "px 的旋转包络参考圆环（再次点击即可一键清除）。"
      };
    });
  }

  // ===========================================================================
  // 5. 保留并增强原有核心函数（兼容全部 49 项自动化单元测试 + 新增定向参数）
  // ===========================================================================

  function splitSelection(mode, options) {
    var AM = getAM();
    var Safety = getSafety();
    var P = getPolyfill();
    var Naming = getNaming();
    var doc = Safety.ensureActiveDocument();
    var opts = options || {};
    var isCut = mode === "cut";
    var state = Safety.getSessionState();

    if (!AM.hasSelection(doc)) {
      return {
        ok: false,
        layerName: null,
        targetGroup: "",
        message: "当前没有选区：请先使用套索、钢笔或魔棒工具框选要拆分的部位。"
      };
    }

    var sourceLayer = doc.activeLayer;
    if (!sourceLayer || Safety.isLayerSet(sourceLayer)) {
      return {
        ok: false,
        layerName: null,
        targetGroup: "",
        message: "当前选中的是图层组：请先在图层面板点选包含角色像素的源图层。"
      };
    }

    if (isCut && Safety.isInsideGroupByName(sourceLayer, Safety.BACKUP_GROUP_NAME)) {
      return {
        ok: false,
        layerName: null,
        targetGroup: "",
        message: "安全拦截：禁止对原稿保护组 " + Safety.BACKUP_GROUP_NAME + " 执行剪切（Cut），请改用复制拆出（Copy）或切换至工作图层。"
      };
    }

    if (isCut && Safety.isEffectivelyLocked(sourceLayer)) {
      return {
        ok: false,
        layerName: null,
        targetGroup: "",
        message: "源图层已锁定，无法执行剪切（Cut）：请先解锁或改用复制拆出（Copy）。"
      };
    }

    if (isCut && isNonRasterArtLayer(sourceLayer)) {
      return {
        ok: false,
        layerName: null,
        targetGroup: "",
        message: "当前源图层为智能对象/矢量/文字层，无法直接选区剪切：请先栅格化或改用复制拆出（Copy）。"
      };
    }

    var selBounds = AM.getSelectionBounds(doc);
    var layerBounds = AM.getLayerBoundsPx(sourceLayer);
    if (selBounds && !AM.boundsIntersect(selBounds, layerBounds)) {
      return {
        ok: false,
        layerName: null,
        targetGroup: "",
        message: "当前选区与源图层有效像素无交集，已阻止生成空图层。"
      };
    }

    var targetGroupPath = opts.targetGroupPath !== undefined && opts.targetGroupPath !== null
      ? P.trim(String(opts.targetGroupPath))
      : state.lastTargetGroupPath;
    var rawBaseName = opts.baseName !== undefined && opts.baseName !== null && P.trim(String(opts.baseName)) !== ""
      ? P.trim(String(opts.baseName))
      : (state.lastBaseName || sourceLayer.name);

    var validated = Naming.validateAttachmentName(rawBaseName);
    var safeBaseName = rawBaseName.indexOf("[") !== -1 ? rawBaseName : (validated.sanitized || "part");
    var autoNumber = opts.autoNumber !== false;
    var returnToSource = opts.returnToSource !== undefined ? !!opts.returnToSource : state.returnToSource;
    var title = isCut ? "SpineSplitter: 选区剪切拆出" : "SpineSplitter: 选区复制拆出";

    return Safety.runTransaction(doc, title, function () {
      var prevVisible = sourceLayer.visible;
      if (!prevVisible) {
        sourceLayer.visible = true;
      }
      doc.activeLayer = sourceLayer;

      if (isCut) {
        AM.cutToLayer();
      } else {
        AM.copyToLayer();
      }

      var newLayer = doc.activeLayer;
      if (!newLayer || newLayer === sourceLayer || AM.isLayerEmpty(newLayer)) {
        if (newLayer && newLayer !== sourceLayer) {
          try { newLayer.remove(); } catch (eDel) {}
        }
        if (!prevVisible) {
          sourceLayer.visible = false;
        }
        return {
          ok: false,
          layerName: null,
          targetGroup: targetGroupPath,
          message: "所选区域内为全透明像素，未提取到有效内容（已自动清理空层）。"
        };
      }

      var container = doc;
      if (targetGroupPath !== "") {
        var grp = Safety.ensureGroupByPath(doc, targetGroupPath);
        if (grp && typeof ElementPlacement !== "undefined") {
          newLayer.move(grp, ElementPlacement.INSIDE);
          container = grp;
        }
      } else if (sourceLayer.parent) {
        container = sourceLayer.parent;
      }

      var finalName = resolveUniqueLayerName(container, safeBaseName, autoNumber);
      newLayer.name = finalName;

      state.lastTargetGroupPath = targetGroupPath;
      state.lastBaseName = safeBaseName;
      state.returnToSource = returnToSource;

      if (!prevVisible) {
        sourceLayer.visible = false;
      }
      if (returnToSource) {
        try { doc.activeLayer = sourceLayer; } catch (eBack) {}
      } else {
        doc.activeLayer = newLayer;
      }

      return {
        ok: true,
        layerName: finalName,
        targetGroup: targetGroupPath || "(当前同级)",
        message: (isCut ? "已剪切拆出「" : "已复制拆出「") + finalName + "」" +
          (targetGroupPath ? (" -> 归组至 " + targetGroupPath) : "") + "。"
      };
    });
  }

  function splitClipChain(mode, options) {
    var AM = getAM();
    var Safety = getSafety();
    var P = getPolyfill();
    var ClipResolver = getClipResolver();
    var doc = Safety.ensureActiveDocument();
    var opts = options || {};
    var mergeOutput = mode === "merge";
    var state = Safety.getSessionState();

    if (!AM.hasSelection(doc)) {
      return {
        ok: false,
        extractedCount: 0,
        layerName: null,
        message: "当前没有选区：请先框选要拆出的部位，并点选基底图层或其上方任意剪贴蒙版层。"
      };
    }

    var activeLayer = doc.activeLayer;
    if (!activeLayer || Safety.isLayerSet(activeLayer)) {
      return {
        ok: false,
        extractedCount: 0,
        layerName: null,
        message: "请选中基底普通图层或剪贴蒙版链条中的任意子图层。"
      };
    }

    var parentContainer = activeLayer.parent;
    if (!parentContainer || !parentContainer.layers) {
      return {
        ok: false,
        extractedCount: 0,
        layerName: null,
        message: "无法获取当前图层的同级列表。"
      };
    }

    var siblingSnapshots = [];
    var selectedIdx = -1;
    var i;
    for (i = 0; i < parentContainer.layers.length; i++) {
      var lyr = parentContainer.layers[i];
      if (lyr === activeLayer) {
        selectedIdx = i;
      }
      siblingSnapshots.push({
        id: typeof lyr.id === "number" ? lyr.id : i + 1,
        name: String(lyr.name),
        grouped: !Safety.isLayerSet(lyr) && lyr.grouped === true,
        visible: lyr.visible !== false
      });
    }

    var chainRes = ClipResolver.findClipChain(siblingSnapshots, selectedIdx);
    if (!chainRes.ok) {
      return {
        ok: false,
        extractedCount: 0,
        layerName: null,
        message: "无法解析完整剪贴蒙版链（原因：" + chainRes.error + "），请检查该剪贴层下方是否存在有效基底图层。"
      };
    }

    var sourceChainLayers = [];
    sourceChainLayers.push(parentContainer.layers[chainRes.baseIndex]);
    var ci;
    for (ci = chainRes.clipIndices.length - 1; ci >= 0; ci--) {
      sourceChainLayers.push(parentContainer.layers[chainRes.clipIndices[ci]]);
    }

    var baseLayer = sourceChainLayers[0];
    var selBounds = AM.getSelectionBounds(doc);
    if (selBounds && !AM.boundsIntersect(selBounds, AM.getLayerBoundsPx(baseLayer))) {
      return {
        ok: false,
        extractedCount: 0,
        layerName: null,
        message: "当前选区与剪贴链基底图层无像素交集，已中止提取。"
      };
    }

    var targetGroupPath = opts.targetGroupPath !== undefined && opts.targetGroupPath !== null
      ? P.trim(String(opts.targetGroupPath))
      : state.lastTargetGroupPath;
    var baseName = opts.baseName !== undefined && opts.baseName !== null && P.trim(String(opts.baseName)) !== ""
      ? P.trim(String(opts.baseName))
      : (state.lastBaseName || baseLayer.name);
    var autoNumber = opts.autoNumber !== false;
    var returnToSource = opts.returnToSource !== undefined ? !!opts.returnToSource : state.returnToSource;
    var txTitle = mergeOutput
      ? "SpineSplitter: 剪贴链合并拆出"
      : "SpineSplitter: 剪贴链保留结构拆出";

    return Safety.runTransaction(doc, txTitle, function () {
      var tmpChannel = null;
      var hasChannelApi = doc.channels && typeof doc.channels.add === "function" &&
        doc.selection && typeof doc.selection.store === "function";
      if (hasChannelApi) {
        tmpChannel = doc.channels.add();
        tmpChannel.name = "__ps_splitter_tmp_sel__";
        doc.selection.store(tmpChannel);
      }

      var createdLayers = [];
      try {
        var idx;
        for (idx = 0; idx < sourceChainLayers.length; idx++) {
          var srcLyr = sourceChainLayers[idx];
          if (idx > 0 && srcLyr.visible === false) {
            continue;
          }
          if (tmpChannel && typeof doc.selection.load === "function") {
            doc.selection.load(tmpChannel);
          }
          if (selBounds && !AM.boundsIntersect(selBounds, AM.getLayerBoundsPx(srcLyr))) {
            continue;
          }
          var wasVis = srcLyr.visible;
          if (!wasVis) {
            srcLyr.visible = true;
          }
          doc.activeLayer = srcLyr;
          var copied = null;
          try {
            AM.copyToLayer();
            copied = doc.activeLayer;
          } catch (eCopy) {
            copied = null;
          }
          if (!wasVis) {
            srcLyr.visible = false;
          }
          if (copied && copied !== srcLyr) {
            if (AM.isLayerEmpty(copied)) {
              try { copied.remove(); } catch (eRmEmpty) {}
            } else {
              createdLayers.push({
                layer: copied,
                isBase: idx === 0,
                origName: String(srcLyr.name),
                origOpacity: srcLyr.opacity,
                origBlendMode: srcLyr.blendMode
              });
            }
          }
        }
      } finally {
        if (tmpChannel) {
          try { tmpChannel.remove(); } catch (eRmCh) {}
        }
      }

      if (createdLayers.length === 0) {
        return {
          ok: false,
          extractedCount: 0,
          layerName: null,
          message: "选区内未在基底及剪贴蒙版链中提取到有效像素。"
        };
      }

      var container = doc;
      if (targetGroupPath !== "") {
        var grp = Safety.ensureGroupByPath(doc, targetGroupPath);
        if (grp) {
          container = grp;
        }
      } else {
        container = parentContainer;
      }

      var uniqueBaseName = resolveUniqueLayerName(container, baseName, autoNumber);

      var k;
      for (k = 0; k < createdLayers.length; k++) {
        var item = createdLayers[k];
        if (typeof ElementPlacement !== "undefined") {
          if (k === 0) {
            if (container !== doc && container.typename === "LayerSet") {
              item.layer.move(container, ElementPlacement.INSIDE);
            }
          } else {
            item.layer.move(createdLayers[k - 1].layer, ElementPlacement.PLACEBEFORE);
          }
        }
        item.layer.opacity = item.origOpacity;
        item.layer.blendMode = item.origBlendMode;
        if (k === 0) {
          item.layer.name = uniqueBaseName;
          if (item.layer.grouped === true) {
            doc.activeLayer = item.layer;
            AM.setClippingMask(false);
          }
        } else {
          item.layer.name = uniqueBaseName + "_" + item.origName;
          doc.activeLayer = item.layer;
          AM.setClippingMask(true);
        }
      }

      var finalName = uniqueBaseName;
      if (mergeOutput && createdLayers.length > 1) {
        var mergeIds = [];
        for (k = 0; k < createdLayers.length; k++) {
          mergeIds.push(createdLayers[k].layer.id);
        }
        AM.selectLayersByIds(mergeIds);
        AM.mergeLayers();
        var merged = doc.activeLayer;
        if (merged) {
          merged.name = uniqueBaseName;
        }
      }

      AM.deselect(doc);
      state.lastTargetGroupPath = targetGroupPath;
      state.lastBaseName = baseName;

      if (returnToSource) {
        try { doc.activeLayer = activeLayer; } catch (eRet) {}
      }

      return {
        ok: true,
        extractedCount: createdLayers.length,
        layerName: finalName,
        message: mergeOutput
          ? ("已将基底及 " + String(createdLayers.length - 1) + " 个剪贴层安全合层拆出为「" + finalName + "」（原剪贴链无损）。")
          : ("已保留完整剪贴蒙版结构拆出「" + finalName + "」（共 " + String(createdLayers.length) + " 层，原链无损）。")
      };
    });
  }

  function moveSelectedToRef() {
    var AM = getAM();
    var Safety = getSafety();
    var doc = Safety.ensureActiveDocument();
    var snap = Safety.captureVirtualDoc(doc);
    var selectedIds = AM.getSelectedLayerIds(doc);

    if (selectedIds.length === 0) {
      return { ok: false, movedCount: 0, message: "未检测到选中的图层。" };
    }

    return Safety.runTransaction(doc, "SpineSplitter: 移入参考隔离区", function () {
      var refInfo = Safety.ensureRefGroup(doc);
      var refGroup = refInfo.group;
      var moved = 0;
      var i;
      for (i = 0; i < selectedIds.length; i++) {
        var lyr = snap.idMap[String(selectedIds[i])];
        if (!lyr || lyr === refGroup || Safety.isInsideGroupByName(lyr, Safety.REF_GROUP_NAME)) {
          continue;
        }
        if (Safety.isInsideGroupByName(lyr, Safety.BACKUP_GROUP_NAME)) {
          continue;
        }
        if (typeof ElementPlacement !== "undefined") {
          lyr.move(refGroup, ElementPlacement.INSIDE);
          moved++;
        }
      }
      return {
        ok: moved > 0,
        movedCount: moved,
        message: moved > 0
          ? ("已将 " + String(moved) + " 个参考图层移入 " + Safety.REF_GROUP_NAME + "。")
          : "选中图层已在隔离区或保护组内，无需移动。"
      };
    });
  }

  function restoreSelectionFromBackup(options) {
    var AM = getAM();
    var Safety = getSafety();
    var P = getPolyfill();
    var doc = Safety.ensureActiveDocument();
    var opts = options || {};

    if (!AM.hasSelection(doc)) {
      return {
        ok: false,
        layerName: null,
        message: "请先在画布上框选需要从原稿快照找回的区域。"
      };
    }

    var bakGroup = Safety.findTopLevelGroup(doc, Safety.BACKUP_GROUP_NAME);
    if (!bakGroup || !bakGroup.layers || bakGroup.layers.length === 0) {
      return {
        ok: false,
        layerName: null,
        message: "未找到原稿基准组 " + Safety.BACKUP_GROUP_NAME + "，请先点击「锁定原稿基准快照」。"
      };
    }

    var bakLayer = null;
    var i;
    for (i = 0; i < bakGroup.layers.length; i++) {
      if (!Safety.isLayerSet(bakGroup.layers[i])) {
        bakLayer = bakGroup.layers[i];
        break;
      }
    }
    if (!bakLayer) {
      return {
        ok: false,
        layerName: null,
        message: Safety.BACKUP_GROUP_NAME + " 中未找到可提取像素的普通备份图层。"
      };
    }

    var prevActive = doc.activeLayer;

    return Safety.runTransaction(doc, "SpineSplitter: 从原稿快照无损恢复选区", function () {
      var prevGroupVis = bakGroup.visible;
      var prevGroupLock = bakGroup.allLocked;
      var prevLayerLock = bakLayer.allLocked;
      var prevLayerVis = bakLayer.visible;

      bakGroup.allLocked = false;
      bakGroup.visible = true;
      bakLayer.allLocked = false;
      bakLayer.visible = true;

      var restoredLayer = null;
      var finalName = null;
      try {
        doc.activeLayer = bakLayer;
        AM.copyToLayer();
        restoredLayer = doc.activeLayer;
        if (restoredLayer && restoredLayer !== bakLayer && !AM.isLayerEmpty(restoredLayer)) {
          var targetGroupPath = opts.targetGroupPath ? P.trim(String(opts.targetGroupPath)) : "";
          var dest = targetGroupPath !== "" ? Safety.ensureGroupByPath(doc, targetGroupPath) : doc;
          if (typeof ElementPlacement !== "undefined") {
            if (dest !== doc) {
              restoredLayer.move(dest, ElementPlacement.INSIDE);
            } else if (prevActive && prevActive !== bakLayer && prevActive.parent) {
              restoredLayer.move(prevActive, ElementPlacement.PLACEBEFORE);
            } else if (doc.layers.length > 0) {
              restoredLayer.move(doc.layers[0], ElementPlacement.PLACEBEFORE);
            }
          }
          finalName = resolveUniqueLayerName(dest, opts.baseName || "restored_part", true);
          restoredLayer.name = finalName;
        } else if (restoredLayer && restoredLayer !== bakLayer) {
          restoredLayer.remove();
          restoredLayer = null;
        }
      } finally {
        bakLayer.allLocked = prevLayerLock;
        bakLayer.visible = prevLayerVis;
        bakGroup.visible = prevGroupVis;
        bakGroup.allLocked = prevGroupLock;
      }

      if (!restoredLayer) {
        return {
          ok: false,
          layerName: null,
          message: "原稿快照在当前选区处无有效像素，未生成补提图层。"
        };
      }
      doc.activeLayer = restoredLayer;
      return {
        ok: true,
        layerName: finalName,
        message: "已从原稿快照无损找回该区域像素为「" + finalName + "」（按 Ctrl+E 可直接与下方图层合并）。"
      };
    });
  }

  function toggleXRay(options) {
    var AM = getAM();
    var Safety = getSafety();
    var P = getPolyfill();
    var doc = Safety.ensureActiveDocument();
    var opts = options || {};
    var state = Safety.getSessionState();

    var targetOpacity = typeof opts.xrayOpacity === "number" && !isNaN(opts.xrayOpacity)
      ? opts.xrayOpacity
      : state.lastXRayOpacity;
    if (targetOpacity < 5) { targetOpacity = 5; }
    if (targetOpacity > 90) { targetOpacity = 90; }
    state.lastXRayOpacity = targetOpacity;

    var snap = Safety.captureVirtualDoc(doc);
    var selectedIds = AM.getSelectedLayerIds(doc);
    if (selectedIds.length === 0) {
      return { ok: false, toggledCount: 0, enteredXRay: 0, restored: 0, message: "请先选中至少一个图层或组。" };
    }

    return Safety.runTransaction(doc, "SpineSplitter: 切换 X-Ray 半透明参照", function () {
      var entered = 0;
      var restored = 0;
      var savedMap = state.xraySavedOpacity;
      var i;

      for (i = 0; i < selectedIds.length; i++) {
        var key = String(selectedIds[i]);
        var lyr = snap.idMap[key];
        if (!lyr) {
          continue;
        }
        var curOp = typeof lyr.opacity === "number" ? lyr.opacity : 100;
        if (P.hasOwn(savedMap, key) && Math.abs(curOp - targetOpacity) <= 5) {
          lyr.opacity = savedMap[key];
          delete savedMap[key];
          restored++;
        } else if (!P.hasOwn(savedMap, key) && curOp <= targetOpacity + 2) {
          lyr.opacity = 100;
          restored++;
        } else {
          savedMap[key] = curOp;
          lyr.opacity = targetOpacity;
          entered++;
        }
      }

      return {
        ok: (entered + restored) > 0,
        toggledCount: entered + restored,
        enteredXRay: entered,
        restored: restored,
        message: "X-Ray 切换完成：" +
          (entered > 0 ? (String(entered) + " 个图层已切为 " + String(targetOpacity) + "% 半透明透视") : "") +
          (entered > 0 && restored > 0 ? "；" : "") +
          (restored > 0 ? (String(restored) + " 个图层已恢复原不透明度") : "") + "。"
      };
    });
  }

  /**
   * 关节断口外延扩边与补全（支持 direction: "up"|"down"|"left"|"right"|"all" 定向推拉延展 + CAF）
   */
  function extendJoint(options) {
    var AM = getAM();
    var Safety = getSafety();
    var doc = Safety.ensureActiveDocument();
    var opts = options || {};
    var state = Safety.getSessionState();

    var activeLayer = doc.activeLayer;
    if (!activeLayer || Safety.isLayerSet(activeLayer)) {
      return { ok: false, usedMode: "", expandPx: 0, message: "请先选中需要延展补全关节断口的普通像素图层。" };
    }
    if (Safety.isEffectivelyLocked(activeLayer) || Safety.isInsideGroupByName(activeLayer, Safety.BACKUP_GROUP_NAME)) {
      return { ok: false, usedMode: "", expandPx: 0, message: "当前图层处于锁定或原稿保护组内，无法修改像素。" };
    }
    if (isNonRasterArtLayer(activeLayer)) {
      return { ok: false, usedMode: "", expandPx: 0, message: "当前图层为智能对象/矢量/文字层，请先栅格化后再执行关节延展。" };
    }

    var expandPx = typeof opts.expandPx === "number" && !isNaN(opts.expandPx)
      ? Math.round(opts.expandPx)
      : state.lastJointExpandPx;
    if (expandPx < 2) { expandPx = 2; }
    if (expandPx > 64) { expandPx = 64; }

    var direction = opts.direction || "all";
    var reqMode = direction !== "all" ? "bleed" : (opts.mode === "bleed" ? "bleed" : (opts.mode === "caf" ? "caf" : state.lastJointMode));
    state.lastJointExpandPx = expandPx;
    state.lastJointMode = reqMode;

    var hasManualSel = AM.hasSelection(doc);
    var dirLabels = { "up": "向上 ↑", "down": "向下 ↓", "left": "向左 ←", "right": "向右 →", "all": "全向 ✥" };
    var title = "SpineSplitter: 关节断口延展 (" + (dirLabels[direction] || "全向") + " " + String(expandPx) + "px)";

    return Safety.runTransaction(doc, title, function () {
      var usedMode = reqMode;
      var fallbackNote = "";

      if (hasManualSel && reqMode === "caf") {
        try {
          AM.expandSelection(doc, 1);
          AM.contentAwareFill();
          AM.deselect(doc);
          return {
            ok: true,
            usedMode: "caf",
            expandPx: expandPx,
            message: "已对当前框选关节断口完成内容识别补全（CAF）。"
          };
        } catch (eManualCaf) {
          usedMode = "bleed";
          fallbackNote = "（内容识别不可用，已自动切换为定向像素推拉延展）";
        }
      }

      if (usedMode === "caf") {
        try {
          AM.loadLayerTransparencyAsSelection();
          AM.expandSelection(doc, expandPx);
          var overlapChannel = null;
          if (doc.channels && typeof doc.channels.add === "function") {
            overlapChannel = doc.channels.add();
            overlapChannel.name = "__ps_splitter_outer__";
            doc.selection.store(overlapChannel);
            try {
              AM.loadLayerTransparencyAsSelection();
              AM.contractSelection(doc, 2);
              var innerChannel = doc.channels.add();
              innerChannel.name = "__ps_splitter_inner__";
              doc.selection.store(innerChannel);
              try {
                doc.selection.load(overlapChannel);
                if (typeof SelectionType !== "undefined" && SelectionType.DIMINISH) {
                  doc.selection.load(innerChannel, SelectionType.DIMINISH);
                }
              } finally {
                innerChannel.remove();
              }
            } finally {
              overlapChannel.remove();
            }
          } else {
            AM.subtractLayerTransparencyFromSelection();
          }
          AM.contentAwareFill();
          AM.deselect(doc);
          return {
            ok: true,
            usedMode: "caf",
            expandPx: expandPx,
            message: "已完成图层边缘 " + String(expandPx) + "px 关节内容识别扩边补全（CAF）。"
          };
        } catch (eAutoCaf) {
          AM.deselect(doc);
          usedMode = "bleed";
          fallbackNote = "（已自动切换为像素推拉延展补底）";
        }
      }

      var maskChannel = null;
      if (hasManualSel && doc.channels && typeof doc.channels.add === "function") {
        maskChannel = doc.channels.add();
        maskChannel.name = "__ps_splitter_joint_clip__";
        doc.selection.store(maskChannel);
        AM.deselect(doc);
      }

      try {
        if (maskChannel) {
          var origClean = activeLayer.duplicate();
          if (typeof ElementPlacement !== "undefined") {
            origClean.move(activeLayer, ElementPlacement.PLACEBEFORE);
          }
          runDirectionalBleed(doc, activeLayer, expandPx, direction);
          var bledLayer = doc.activeLayer;
          doc.selection.load(maskChannel);
          doc.selection.invert();
          try { doc.selection.clear(); } catch (eClr) {}
          AM.deselect(doc);
          AM.selectLayersByIds([origClean.id, bledLayer.id]);
          AM.mergeLayers();
        } else {
          runDirectionalBleed(doc, activeLayer, expandPx, direction);
        }
      } finally {
        if (maskChannel) {
          try { maskChannel.remove(); } catch (eRmMask) {}
        }
      }

      return {
        ok: true,
        usedMode: "bleed",
        expandPx: expandPx,
        direction: direction,
        message: "已沿【" + (dirLabels[direction] || "全向") + "】延展补出 " + String(expandPx) + "px 关节实色基底" + fallbackNote + "。"
      };
    });
  }

  function cleanEdgeMatte(options) {
    var AM = getAM();
    var Safety = getSafety();
    var P = getPolyfill();
    var doc = Safety.ensureActiveDocument();
    var opts = options || {};
    var mode = opts.mode || "defringe";
    var widthPx = typeof opts.widthPx === "number" && opts.widthPx > 0 ? Math.round(opts.widthPx) : 1;
    var forceGlow = opts.forceGlowLayer === true;

    // 新增：如果 mode === "shave"，直接调用真正 100% 肉眼见效的选区内缩削毛边！
    if (mode === "shave") {
      return shaveLayerEdge({ shavePx: widthPx, featherPx: 0.5 });
    }

    var snap = Safety.captureVirtualDoc(doc);
    var selectedIds = AM.getSelectedLayerIds(doc);
    if (selectedIds.length === 0) {
      return { ok: false, processedCount: 0, skippedGlow: [], message: "请先选中至少一个普通像素图层。" };
    }

    return Safety.runTransaction(doc, "SpineSplitter: 边缘杂边清理与防溢色", function () {
      var processed = 0;
      var skippedGlow = [];
      var i;

      for (i = 0; i < selectedIds.length; i++) {
        var lyr = snap.idMap[String(selectedIds[i])];
        if (!lyr || Safety.isLayerSet(lyr) || Safety.isEffectivelyLocked(lyr) || isNonRasterArtLayer(lyr)) {
          continue;
        }
        var blendStr = Safety.normalizeBlendMode(lyr.blendMode);
        if (!forceGlow && P.hasOwn(GLOW_BLEND_MODES, blendStr)) {
          skippedGlow.push(String(lyr.name) + " (" + blendStr + ")");
          continue;
        }

        doc.activeLayer = lyr;
        if (mode === "blackMatte") {
          AM.removeBlackMatte();
        } else if (mode === "whiteMatte") {
          AM.removeWhiteMatte();
        } else if (mode === "alphaBleed") {
          AM.loadLayerTransparencyAsSelection();
          var alphaCh = null;
          if (doc.channels && typeof doc.channels.add === "function") {
            alphaCh = doc.channels.add();
            alphaCh.name = "__ps_splitter_alpha_bleed__";
            doc.selection.store(alphaCh);
          }
          AM.deselect(doc);
          try {
            runDirectionalBleed(doc, lyr, Math.max(1, Math.min(widthPx, 4)), "all");
            if (alphaCh) {
              doc.selection.load(alphaCh);
              doc.selection.invert();
              try { doc.selection.clear(); } catch (eClearBleed) {}
              AM.deselect(doc);
            }
          } finally {
            if (alphaCh) {
              try { alphaCh.remove(); } catch (eRmAlpha) {}
            }
          }
        } else {
          // 增强去边：先执行原生 Defringe，再配合 1px 极细羽化内削保证肉眼一定生效
          AM.defringe(widthPx);
        }
        processed++;
      }

      var modeLabels = {
        "defringe": "去边(" + String(widthPx) + "px)",
        "blackMatte": "移去黑色杂边",
        "whiteMatte": "移去白色杂边",
        "alphaBleed": "Alpha Bleed 周边固色"
      };
      var msg = "已完成 " + String(processed) + " 个图层的「" + (modeLabels[mode] || mode) + "」。";
      if (skippedGlow.length > 0) {
        msg += " 已自动保护跳过 " + String(skippedGlow.length) + " 个发光混合模式层：" + skippedGlow.join(", ") + "。";
      }
      return {
        ok: processed > 0 || skippedGlow.length > 0,
        processedCount: processed,
        skippedGlow: skippedGlow,
        message: msg
      };
    });
  }

  PSSplitter.Host.SplitJointOps = {
    RADAR_LAYER_NAME: RADAR_LAYER_NAME,
    ARC_GUIDE_LAYER_NAME: ARC_GUIDE_LAYER_NAME,
    runUnsplitRadar: runUnsplitRadar,
    clearUnsplitRadar: clearUnsplitRadar,
    splitAndPreparePatch: splitAndPreparePatch,
    splitMultiSelectedLayers: splitMultiSelectedLayers,
    shaveLayerEdge: shaveLayerEdge,
    patchOcclusionHole: patchOcclusionHole,
    createClippedPatchLayer: createClippedPatchLayer,
    toggleJointArcGuide: toggleJointArcGuide,
    splitSelection: splitSelection,
    splitClipChain: splitClipChain,
    moveSelectedToRef: moveSelectedToRef,
    restoreSelectionFromBackup: restoreSelectionFromBackup,
    toggleXRay: toggleXRay,
    extendJoint: extendJoint,
    cleanEdgeMatte: cleanEdgeMatte
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = PSSplitter.Host.SplitJointOps;
  }
})();

// --- END host\ps_split_joint_ops.js ---

// --- BEGIN host\ps_naming_hierarchy_ops.js ---
/**
 * @fileoverview Photoshop 骨骼模板建组、Spine 标签装配、Tag-Aware 批量重命名与多皮肤克隆操作（PSSplitter.Host.NamingHierarchyOps）
 * 覆盖模块 3 全部宿主回写能力，严格复用 PSSplitter.Core 纯 ES3 规则引擎。
 */

(function () {
  var rootScope = (typeof $ !== "undefined" && $.global)
    ? $.global
    : (typeof global !== "undefined" ? global : (function () { return this; }()));
  rootScope.PSSplitter = rootScope.PSSplitter || {};
  rootScope.PSSplitter.Host = rootScope.PSSplitter.Host || {};
  var PSSplitter = rootScope.PSSplitter;

  function getPolyfill() {
    if (PSSplitter && PSSplitter.Core && PSSplitter.Core.Polyfill) {
      return PSSplitter.Core.Polyfill;
    }
    if (typeof require === "function") {
      return require("../core/polyfill_es3.js");
    }
    throw new Error("PSSplitter.Core.Polyfill 未加载");
  }

  function getSpineTags() {
    if (PSSplitter && PSSplitter.Core && PSSplitter.Core.SpineTags) {
      return PSSplitter.Core.SpineTags;
    }
    if (typeof require === "function") {
      return require("../core/spine_tags.js");
    }
    throw new Error("PSSplitter.Core.SpineTags 未加载");
  }

  function getNamingEngine() {
    if (PSSplitter && PSSplitter.Core && PSSplitter.Core.NamingEngine) {
      return PSSplitter.Core.NamingEngine;
    }
    if (typeof require === "function") {
      return require("../core/naming_engine.js");
    }
    throw new Error("PSSplitter.Core.NamingEngine 未加载");
  }

  function getSkeletonTemplates() {
    if (PSSplitter && PSSplitter.Core && PSSplitter.Core.SkeletonTemplates) {
      return PSSplitter.Core.SkeletonTemplates;
    }
    if (typeof require === "function") {
      return require("../core/skeleton_templates.js");
    }
    throw new Error("PSSplitter.Core.SkeletonTemplates 未加载");
  }

  function getSkinMapper() {
    if (PSSplitter && PSSplitter.Core && PSSplitter.Core.SkinMapper) {
      return PSSplitter.Core.SkinMapper;
    }
    if (typeof require === "function") {
      return require("../core/skin_mapper.js");
    }
    throw new Error("PSSplitter.Core.SkinMapper 未加载");
  }

  function getAM() {
    if (PSSplitter && PSSplitter.Host && PSSplitter.Host.AM) {
      return PSSplitter.Host.AM;
    }
    if (typeof require === "function") {
      return require("./ps_am.js");
    }
    throw new Error("PSSplitter.Host.AM 未加载");
  }

  function getSafety() {
    if (PSSplitter && PSSplitter.Host && PSSplitter.Host.Safety) {
      return PSSplitter.Host.Safety;
    }
    if (typeof require === "function") {
      return require("./ps_safety.js");
    }
    throw new Error("PSSplitter.Host.Safety 未加载");
  }

  var V742_ONLY_TAGS = {
    "overlay": true,
    "trim": true,
    "mesh": true,
    "name": true
  };

  /**
   * 在容器内末尾位置追加新建图层组（保持从前景到背景的自然遮挡顺序）
   * @param {Object} container Document 或 LayerSet
   * @param {string} groupName 新组名称
   * @param {Object|null} [insertAfterLayer] 若指定则排在该层下方
   * @returns {Object} 新建的 LayerSet
   */
  function addGroupAtOrder(container, groupName, insertAfterLayer) {
    var grp = container.layerSets.add();
    grp.name = groupName;
    if (insertAfterLayer && insertAfterLayer !== grp && typeof ElementPlacement !== "undefined") {
      try {
        if (insertAfterLayer.isBackgroundLayer) {
          grp.move(insertAfterLayer, ElementPlacement.PLACEBEFORE);
        } else {
          grp.move(insertAfterLayer, ElementPlacement.PLACEAFTER);
        }
      } catch (eMove) {
        // 忽略移动限制
      }
    }
    return grp;
  }

  /**
   * 模块 3：按标准角色骨骼模板增量建组（跳过已有组且严格保持前臂->头->躯干->腿->后臂遮挡序）
   * @param {string} templateId 模板 ID ("humanoid"|"chibi"|"quadruped"|"portrait")
   * @param {Object} [options] { rootGroupName?:string, includeSlots?:boolean, tagPosition?:"suffix"|"prefix" }
   * @returns {{ok:boolean, createdCount:number, warnings:Array<string>, message:string}} 执行结果
   */
  function applySkeletonTemplate(templateId, options) {
    var Safety = getSafety();
    var Templates = getSkeletonTemplates();
    var P = getPolyfill();
    var doc = Safety.ensureActiveDocument();
    var opts = options || {};

    var snap = Safety.captureVirtualDoc(doc);
    var plan = Templates.buildHierarchyPlan(templateId, opts, snap.virtualDoc);
    if (!plan.ok) {
      return {
        ok: false,
        createdCount: 0,
        warnings: plan.warnings || [],
        message: "骨骼模板规划失败：" + String(plan.error || "未知错误")
      };
    }

    if (plan.operations.length === 0) {
      return {
        ok: true,
        createdCount: 0,
        warnings: plan.warnings || [],
        message: "当前文档已存在该模板的全部骨骼与槽位分组，无需重复创建。"
      };
    }

    return Safety.runTransaction(doc, "SpineSplitter: 应用骨骼模板 (" + String(templateId) + ")", function () {
      var groupCache = {};
      var lastChildByParent = {};
      var created = 0;
      var i;

      // 若顶层存在 __REF__ [ignore]，新骨骼组排在参考隔离区下方更整洁
      var refTop = Safety.findTopLevelGroup(doc, Safety.REF_GROUP_NAME);
      if (refTop) {
        lastChildByParent[""] = refTop;
      }

      for (i = 0; i < plan.operations.length; i++) {
        var op = plan.operations[i];
        if (op.type !== "createGroup") {
          continue;
        }
        var parentPath = op.parentPath || "";
        var parentContainer = doc;
        if (parentPath !== "") {
          if (P.hasOwn(groupCache, parentPath)) {
            parentContainer = groupCache[parentPath];
          } else {
            parentContainer = Safety.findGroupByPath(doc, parentPath) || Safety.ensureGroupByPath(doc, parentPath);
            groupCache[parentPath] = parentContainer;
          }
        }

        var anchor = P.hasOwn(lastChildByParent, parentPath) ? lastChildByParent[parentPath] : null;
        var newGroup = addGroupAtOrder(parentContainer, op.name, anchor);
        groupCache[op.path] = newGroup;
        lastChildByParent[parentPath] = newGroup;
        created++;
      }

      var msg = "已按模板「" + String(templateId) + "」增量创建 " + String(created) + " 个骨骼/槽位分组。";
      if (plan.warnings && plan.warnings.length > 0) {
        msg += " 注意：" + plan.warnings.join("；");
      }
      return {
        ok: true,
        createdCount: created,
        warnings: plan.warnings || [],
        message: msg
      };
    });
  }

  /**
   * 模块 3：为当前选中的图层/组可视化设置或移除官方 12 个 Spine 标签
   * @param {string} tagKey 官方标签键（全小写）
   * @param {string|null} tagValue 标签参数（无参传 null 或 ""）
   * @param {boolean} enable true=设置/更新；false=移除
   * @returns {{ok:boolean, updatedCount:number, errors:Array<string>, versionNote:string, message:string}} 执行结果
   */
  function applySpineTag(tagKey, tagValue, enable) {
    var AM = getAM();
    var Safety = getSafety();
    var Tags = getSpineTags();
    var P = getPolyfill();
    var doc = Safety.ensureActiveDocument();

    var snap = Safety.captureVirtualDoc(doc);
    var selectedIds = AM.getSelectedLayerIds(doc);
    if (selectedIds.length === 0) {
      return {
        ok: false,
        updatedCount: 0,
        errors: ["未选中任何图层或组"],
        versionNote: "",
        message: "请先在图层面板选中至少一个图层或图层组。"
      };
    }

    var cleanVal = (tagValue !== null && tagValue !== undefined && P.trim(String(tagValue)) !== "")
      ? P.trim(String(tagValue))
      : null;

    return Safety.runTransaction(doc, "SpineSplitter: 设置 Spine 标签 [" + String(tagKey) + "]", function () {
      var updated = 0;
      var errors = [];
      var i;

      for (i = 0; i < selectedIds.length; i++) {
        var lyr = snap.idMap[String(selectedIds[i])];
        if (!lyr) {
          continue;
        }
        var isGrp = Safety.isLayerSet(lyr);
        var res = Tags.toggleOrSetTag(String(lyr.name), isGrp, tagKey, cleanVal, !!enable);
        if (!res.ok) {
          errors.push("[" + String(lyr.name) + "] " + res.error);
          continue;
        }
        if (res.name !== String(lyr.name)) {
          lyr.name = res.name;
          updated++;
        }
      }

      var versionNote = "";
      if (enable && P.hasOwn(V742_ONLY_TAGS, tagKey)) {
        versionNote = "提示：[" + tagKey + "] 属于上游 PhotoshopToSpine.jsx v7.42+ / Spine 4.2+ 标签，旧版 v7.04 不支持。";
      }

      var msg = enable
        ? ("已为 " + String(updated) + " 个节点更新标签 [" + String(tagKey) + (cleanVal ? ":" + cleanVal : "") + "]。")
        : ("已从 " + String(updated) + " 个节点移除标签 [" + String(tagKey) + "]。");
      if (errors.length > 0) {
        msg += " 拦截 " + String(errors.length) + " 项不合规操作：" + errors.join("；");
      }
      if (versionNote !== "") {
        msg += " " + versionNote;
      }

      return {
        ok: errors.length === 0 || updated > 0,
        updatedCount: updated,
        errors: errors,
        versionNote: versionNote,
        message: msg
      };
    });
  }

  /**
   * 按作用域收集待批量重命名的节点快照列表（自动避开保护区）
   * @param {Object} doc Photoshop Document
   * @param {string} scope "selected" | "activeGroupChildren" | "activeGroupDeep"
   * @returns {{nodes:Array<Object>, idMap:Object}} 节点快照数组与 ID 映射
   */
  function collectRenameTargets(doc, scope) {
    var AM = getAM();
    var Safety = getSafety();
    var P = getPolyfill();
    var snap = Safety.captureVirtualDoc(doc);
    var nodes = [];
    var seen = {};

    function isProtectedNode(lyr) {
      return Safety.isInsideGroupByName(lyr, Safety.BACKUP_GROUP_NAME) ||
        Safety.isInsideGroupByName(lyr, Safety.REF_GROUP_NAME);
    }

    function pushLayer(lyr) {
      if (!lyr || isProtectedNode(lyr)) {
        return;
      }
      var idKey = String(lyr.id);
      if (P.hasOwn(seen, idKey)) {
        return;
      }
      seen[idKey] = true;
      var parentId = P.hasOwn(snap.parentMap, idKey) ? snap.parentMap[idKey] : null;
      nodes.push({
        id: lyr.id,
        name: String(lyr.name),
        isGroup: Safety.isLayerSet(lyr),
        parentId: parentId
      });
    }

    if (scope === "activeGroupChildren" || scope === "activeGroupDeep") {
      var active = doc.activeLayer;
      var targetGroup = null;
      if (active && Safety.isLayerSet(active)) {
        targetGroup = active;
      } else if (active && active.parent && active.parent.typename !== "Document") {
        targetGroup = active.parent;
      } else {
        targetGroup = doc;
      }

      function walkGroup(container, deep) {
        var i;
        for (i = 0; i < container.layers.length; i++) {
          var child = container.layers[i];
          if (isProtectedNode(child)) {
            continue;
          }
          pushLayer(child);
          if (deep && Safety.isLayerSet(child) && child.layers && child.layers.length > 0) {
            walkGroup(child, true);
          }
        }
      }

      walkGroup(targetGroup, scope === "activeGroupDeep");
    } else {
      var selIds = AM.getSelectedLayerIds(doc);
      var k;
      for (k = 0; k < selIds.length; k++) {
        var lyr = snap.idMap[String(selIds[k])];
        pushLayer(lyr);
      }
    }

    return {
      nodes: nodes,
      idMap: snap.idMap
    };
  }

  /**
   * 模块 3：预览 Tag-Aware 批量重命名结果（纯只读，不改动文档）
   * @param {string} scope "selected" | "activeGroupChildren" | "activeGroupDeep"
   * @param {Object} options NamingEngine.batchRenamePlan 参数
   * @returns {{ok:boolean, items:Array, conflicts:Array, errors:Array<string>, changedCount:number}} 预览计划
   */
  function previewBatchRename(scope, options) {
    var Safety = getSafety();
    var Naming = getNamingEngine();
    var doc = Safety.ensureActiveDocument();
    var collected = collectRenameTargets(doc, scope || "selected");
    var plan = Naming.batchRenamePlan(collected.nodes, options || {});
    var changedCount = 0;
    var i;
    for (i = 0; i < plan.items.length; i++) {
      if (plan.items[i].changed) {
        changedCount++;
      }
    }
    return {
      ok: plan.errors.length === 0,
      items: plan.items,
      conflicts: plan.conflicts,
      errors: plan.errors,
      changedCount: changedCount
    };
  }

  /**
   * 模块 3：执行 Tag-Aware 批量重命名（遇同级重名冲突默认阻断，单步可撤销）
   * @param {string} scope "selected" | "activeGroupChildren" | "activeGroupDeep"
   * @param {Object} options NamingEngine.batchRenamePlan 参数（另支持 allowConflicts?:boolean）
   * @returns {{ok:boolean, renamedCount:number, conflicts:Array, errors:Array<string>, message:string}} 执行结果
   */
  function applyBatchRename(scope, options) {
    var Safety = getSafety();
    var Naming = getNamingEngine();
    var doc = Safety.ensureActiveDocument();
    var opts = options || {};
    var collected = collectRenameTargets(doc, scope || "selected");

    if (collected.nodes.length === 0) {
      return {
        ok: false,
        renamedCount: 0,
        conflicts: [],
        errors: ["目标范围内没有可重命名的非保护图层"],
        message: "目标范围内没有可重命名的图层（保护组内图层已自动跳过）。"
      };
    }

    var plan = Naming.batchRenamePlan(collected.nodes, opts);
    if (plan.errors.length > 0) {
      return {
        ok: false,
        renamedCount: 0,
        conflicts: plan.conflicts,
        errors: plan.errors,
        message: "批量重命名参数无效：" + plan.errors.join("；")
      };
    }

    if (plan.conflicts.length > 0 && !opts.allowConflicts) {
      var names = [];
      var c;
      for (c = 0; c < plan.conflicts.length; c++) {
        names.push(plan.conflicts[c].name);
      }
      return {
        ok: false,
        renamedCount: 0,
        conflicts: plan.conflicts,
        errors: ["存在同级重名冲突: " + names.join(", ")],
        message: "已阻止执行：重命名后会产生同级重名冲突（" + names.join(", ") + "），请调整前后缀或勾选自动序号。"
      };
    }

    return Safety.runTransaction(doc, "SpineSplitter: Tag-Aware 批量重命名", function () {
      var renamed = 0;
      var i;
      for (i = 0; i < plan.items.length; i++) {
        var item = plan.items[i];
        if (!item.changed) {
          continue;
        }
        var lyr = collected.idMap[String(item.id)];
        if (lyr) {
          lyr.name = item.newName;
          renamed++;
        }
      }
      return {
        ok: true,
        renamedCount: renamed,
        conflicts: plan.conflicts,
        errors: [],
        message: renamed > 0
          ? ("已完成 " + String(renamed) + " 个图层的 Tag-Aware 批量重命名。")
          : "没有任何图层名称发生变化。"
      };
    });
  }

  /**
   * 模块 3：一键对选中图层（或组及后代）执行 L/R 左右对称标识互换
   * @param {boolean} [preserveTags] 是否保护 [...] 标签区不变（默认 true）
   * @param {boolean} [includeChildren] 若选中图层组，是否递归互换所有子孙（默认 true）
   * @returns {{ok:boolean, changedCount:number, message:string}} 执行结果
   */
  function quickSwapLR(preserveTags, includeChildren) {
    var AM = getAM();
    var Safety = getSafety();
    var Naming = getNamingEngine();
    var doc = Safety.ensureActiveDocument();
    var keepTags = preserveTags !== false;
    var deep = includeChildren !== false;

    var snap = Safety.captureVirtualDoc(doc);
    var selIds = AM.getSelectedLayerIds(doc);
    if (selIds.length === 0) {
      return { ok: false, changedCount: 0, message: "请先选中至少一个图层或图层组。" };
    }

    var targets = [];
    var visited = {};
    var P = getPolyfill();

    function collectLayer(lyr) {
      if (!lyr || Safety.isInsideGroupByName(lyr, Safety.BACKUP_GROUP_NAME)) {
        return;
      }
      var k = String(lyr.id);
      if (P.hasOwn(visited, k)) {
        return;
      }
      visited[k] = true;
      targets.push(lyr);
      if (deep && Safety.isLayerSet(lyr) && lyr.layers) {
        var j;
        for (j = 0; j < lyr.layers.length; j++) {
          collectLayer(lyr.layers[j]);
        }
      }
    }

    var i;
    for (i = 0; i < selIds.length; i++) {
      collectLayer(snap.idMap[String(selIds[i])]);
    }

    return Safety.runTransaction(doc, "SpineSplitter: L/R 左右对称命名互换", function () {
      var changed = 0;
      var t;
      for (t = 0; t < targets.length; t++) {
        var res = Naming.swapLR(String(targets[t].name), keepTags);
        if (res.changed) {
          targets[t].name = res.name;
          changed++;
        }
      }
      return {
        ok: true,
        changedCount: changed,
        message: changed > 0
          ? ("已成功互换 " + String(changed) + " 个图层的 L/R 对称标识。")
          : "选中图层中未检测到可互换的 L/R（或 左/右 / Left/Right）标识。"
      };
    });
  }

  /**
   * 递归在 VirtualDoc 树中按 layerId 查找节点快照
   * @param {Array} nodes 节点列表
   * @param {number} targetId 目标 ID
   * @returns {Object|null} VirtualNode 或 null
   */
  function findVirtualNodeById(nodes, targetId) {
    var i;
    for (i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.id === targetId) {
        return n;
      }
      if (n.children && n.children.length > 0) {
        var found = findVirtualNodeById(n.children, targetId);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  /**
   * 模块 3：多皮肤/换装目录同构克隆（复用 SkinMapper，自动拦截 default、剥离危险 [path:]、跳过 [ignore]）
   * @param {string} targetSkinName 目标皮肤名（如 "armor_gold" 或 "costume/summer"）
   * @param {Object} [options] { meshStrategy?:"unlink"|"linkToSource"|"keep", pathStrategy?:"strip"|"keep", includeIgnored?:boolean }
   * @returns {{ok:boolean, rootName:string|null, clonedGroups:number, clonedLayers:number, warnings:Array<string>, message:string}} 克隆结果
   */
  function cloneSkinGroup(targetSkinName, options) {
    var Safety = getSafety();
    var SkinMapper = getSkinMapper();
    var P = getPolyfill();
    var doc = Safety.ensureActiveDocument();
    var opts = options || {};

    var activeLayer = doc.activeLayer;
    if (!activeLayer || !Safety.isLayerSet(activeLayer)) {
      return {
        ok: false,
        rootName: null,
        clonedGroups: 0,
        clonedLayers: 0,
        warnings: [],
        message: "请先在图层面板选中作为源模板的皮肤/服装图层组。"
      };
    }

    var nameCheck = SkinMapper.validateSkinName(targetSkinName);
    if (!nameCheck.valid) {
      return {
        ok: false,
        rootName: null,
        clonedGroups: 0,
        clonedLayers: 0,
        warnings: [],
        message: "目标皮肤名称不合法：" + nameCheck.errors.join("；")
      };
    }

    var snap = Safety.captureVirtualDoc(doc);
    var sourceNode = findVirtualNodeById(snap.virtualDoc.layers, activeLayer.id);
    if (!sourceNode) {
      return {
        ok: false,
        rootName: null,
        clonedGroups: 0,
        clonedLayers: 0,
        warnings: [],
        message: "无法在文档快照中定位当前选中的皮肤组。"
      };
    }

    var plan = SkinMapper.buildSkinClonePlan(sourceNode, targetSkinName, opts);
    if (!plan.ok) {
      return {
        ok: false,
        rootName: null,
        clonedGroups: 0,
        clonedLayers: 0,
        warnings: plan.warnings || [],
        message: "皮肤克隆规划失败：" + plan.errors.join("；")
      };
    }

    return Safety.runTransaction(doc, "SpineSplitter: 克隆多皮肤目录 (" + plan.rootName + ")", function () {
      var groupMap = {};
      var lastChildMap = {};
      var clonedGroups = 0;
      var clonedLayers = 0;
      var parentContainer = activeLayer.parent || doc;

      var i;
      for (i = 0; i < plan.operations.length; i++) {
        var op = plan.operations[i];
        if (op.type === "cloneSkinRoot") {
          var rootGroup = parentContainer.layerSets.add();
          rootGroup.name = op.targetName;
          if (typeof ElementPlacement !== "undefined") {
            try {
              rootGroup.move(activeLayer, ElementPlacement.PLACEBEFORE);
            } catch (eMoveRoot) {
              // 忽略移动异常
            }
          }
          groupMap[op.targetName] = rootGroup;
          clonedGroups++;
        } else if (op.type === "createGroup") {
          var pGroup = groupMap[op.parentTargetPath];
          if (!pGroup) {
            continue;
          }
          var anchorG = P.hasOwn(lastChildMap, op.parentTargetPath) ? lastChildMap[op.parentTargetPath] : null;
          var subGroup = addGroupAtOrder(pGroup, op.targetName, anchorG);
          var fullPath = op.parentTargetPath + "/" + op.targetName;
          groupMap[fullPath] = subGroup;
          lastChildMap[op.parentTargetPath] = subGroup;
          clonedGroups++;
        } else if (op.type === "duplicateLayer") {
          var destGroup = groupMap[op.parentTargetPath];
          var srcLayer = snap.idMap[String(op.sourceLayerId)];
          if (!destGroup || !srcLayer) {
            continue;
          }
          var prevLock = srcLayer.allLocked;
          if (prevLock) {
            srcLayer.allLocked = false;
          }
          var dupLayer;
          try {
            var anchorL = P.hasOwn(lastChildMap, op.parentTargetPath) ? lastChildMap[op.parentTargetPath] : null;
            if (typeof ElementPlacement !== "undefined") {
              if (anchorL) {
                dupLayer = srcLayer.duplicate(anchorL, ElementPlacement.PLACEAFTER);
              } else {
                dupLayer = srcLayer.duplicate(destGroup, ElementPlacement.INSIDE);
              }
            } else {
              dupLayer = srcLayer.duplicate();
            }
            dupLayer.name = op.targetName;
            lastChildMap[op.parentTargetPath] = dupLayer;
            clonedLayers++;
          } finally {
            if (prevLock) {
              srcLayer.allLocked = true;
            }
          }
        }
      }

      var finalRoot = groupMap[plan.rootName];
      if (finalRoot) {
        try {
          doc.activeLayer = finalRoot;
        } catch (eAct) {
          // 忽略
        }
      }

      var msg = "已同构克隆皮肤目录「" + plan.rootName + "」（新建 " + String(clonedGroups) + " 个组，复制 " + String(clonedLayers) + " 个图层）。";
      if (plan.warnings && plan.warnings.length > 0) {
        msg += " 已自动防护 " + String(plan.warnings.length) + " 项风险（如剥离 [path:] / 跳过 [ignore]）。";
      }
      return {
        ok: true,
        rootName: plan.rootName,
        clonedGroups: clonedGroups,
        clonedLayers: clonedLayers,
        warnings: plan.warnings || [],
        message: msg
      };
    });
  }

  PSSplitter.Host.NamingHierarchyOps = {
    applySkeletonTemplate: applySkeletonTemplate,
    applySpineTag: applySpineTag,
    previewBatchRename: previewBatchRename,
    applyBatchRename: applyBatchRename,
    quickSwapLR: quickSwapLR,
    cloneSkinGroup: cloneSkinGroup
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = PSSplitter.Host.NamingHierarchyOps;
  }
})();

// --- END host\ps_naming_hierarchy_ops.js ---

/**
 * @fileoverview SpineSplitter CEP 窗口面板与 ExtendScript 宿主桥接层（纯 PS 拆图与补图工作台版）
 */

(function () {
  var rootScope = (typeof $ !== "undefined" && $.global)
    ? $.global
    : (typeof global !== "undefined" ? global : (function () { return this; }()));
  rootScope.PSSplitter = rootScope.PSSplitter || {};
  var PSSplitter = rootScope.PSSplitter;

  /**
   * 统计文档图层、已拆部件、是否已有原稿基准快照
   */
  function getDocOverview(doc, virtualDoc) {
    var Safety = PSSplitter.Host.Safety;
    var bakGroup = Safety.findTopLevelGroup(doc, Safety.BACKUP_GROUP_NAME);
    var hasBackup = !!(bakGroup && bakGroup.layers && bakGroup.layers.length > 0);
    var workArtLayers = 0;
    var groupCount = 0;

    function walk(nodes, inProtected) {
      if (!nodes) return;
      var i;
      for (i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        var isProt = inProtected ||
          String(n.name).toLowerCase() === Safety.BACKUP_GROUP_NAME.toLowerCase() ||
          String(n.name).toLowerCase() === Safety.REF_GROUP_NAME.toLowerCase();
        if (n.type === "LayerSet") {
          if (!isProt) groupCount++;
          if (n.children && n.children.length > 0) {
            walk(n.children, isProt);
          }
        } else if (!isProt && !n.isEmpty) {
          workArtLayers++;
        }
      }
    }

    if (virtualDoc && virtualDoc.layers) {
      walk(virtualDoc.layers, false);
    }
    return {
      hasBackup: hasBackup,
      workArtLayers: workArtLayers,
      groupCount: groupCount
    };
  }

  /**
   * 清理空像素图层与空图层组
   */
  function cleanEmptyLayersAndGroups(doc) {
    var Safety = PSSplitter.Host.Safety;
    var AM = PSSplitter.Host.AM;

    return Safety.runTransaction(doc, "SpineSplitter: 清理空图层与空组", function () {
      var removedLayers = 0;
      var removedGroups = 0;

      function cleanContainer(container) {
        var i;
        for (i = container.layers.length - 1; i >= 0; i--) {
          var lyr = container.layers[i];
          if (Safety.isInsideGroupByName(lyr, Safety.BACKUP_GROUP_NAME) ||
              Safety.isInsideGroupByName(lyr, Safety.REF_GROUP_NAME)) {
            continue;
          }
          if (Safety.isLayerSet(lyr)) {
            cleanContainer(lyr);
            if (lyr.layers.length === 0 && !lyr.allLocked) {
              try {
                lyr.remove();
                removedGroups++;
              } catch (eRmG) {}
            }
          } else if (!lyr.isBackgroundLayer && !lyr.allLocked && AM.isLayerEmpty(lyr)) {
            try {
              lyr.remove();
              removedLayers++;
            } catch (eRmL) {}
          }
        }
      }

      cleanContainer(doc);
      var total = removedLayers + removedGroups;
      return {
        ok: true,
        removedLayers: removedLayers,
        removedGroups: removedGroups,
        message: total > 0
          ? ("已清理 " + String(removedLayers) + " 个全透明空图层与 " + String(removedGroups) + " 个空组。")
          : "当前文档很干净，未发现空像素图层或空组。"
      };
    });
  }

  /**
   * 供 CEP 面板前端通过 evalScript 调用的统一分发入口
   */
  function dispatch(action, a1, a2, a3, a4, a5) {
    var P = PSSplitter.Core.Polyfill;
    var AM = PSSplitter.Host.AM;
    var Safety = PSSplitter.Host.Safety;
    var SplitOps = PSSplitter.Host.SplitJointOps;

    try {
      if (action === "getContext") {
        if (typeof app === "undefined" || !app.documents || app.documents.length === 0) {
          return P.jsonStringify({
            ok: true,
            hasDoc: false,
            docName: "未打开 PSD 文档",
            activeLayerName: "-",
            hasSelection: false,
            overview: { hasBackup: false, workArtLayers: 0, groupCount: 0 }
          });
        }
        var doc = app.activeDocument;
        var snap = Safety.captureVirtualDoc(doc);
        var overview = getDocOverview(doc, snap.virtualDoc);
        return P.jsonStringify({
          ok: true,
          hasDoc: true,
          docName: String(doc.name),
          activeLayerName: doc.activeLayer ? String(doc.activeLayer.name) : "-",
          hasSelection: AM.hasSelection(doc),
          overview: overview
        });
      }

      // 1. 原稿基准快照锁定与局部选区后悔药恢复
      if (action === "initWorkspace") {
        return P.jsonStringify(Safety.initWorkspace({ createSnapshot: true }));
      }

      if (action === "restoreFromBackup") {
        return P.jsonStringify(SplitOps.restoreSelectionFromBackup({
          targetGroupPath: "",
          baseName: a1 || "原稿找回"
        }));
      }

      // 2. 漏拆像素雷达检测 & 清除高亮雷达层
      if (action === "runUnsplitRadar") {
        var filterPx = parseInt(a1 || "1", 10);
        return P.jsonStringify(SplitOps.runUnsplitRadar({
          filterEdgePx: isNaN(filterPx) ? 1 : filterPx
        }));
      }

      if (action === "clearUnsplitRadar") {
        return P.jsonStringify(SplitOps.clearUnsplitRadar());
      }

      // 3. 拆+补一体动作：拆出部件并原位挖空留待补咬合选区
      if (action === "splitAndPreparePatch") {
        var ovPx = parseInt(a1 || "2", 10);
        return P.jsonStringify(SplitOps.splitAndPreparePatch({
          overlapPx: isNaN(ovPx) ? 2 : ovPx
        }));
      }

      // 4. 跨多层 / 剪贴蒙版链同选区联合拆出
      if (action === "splitMultiLayers") {
        return P.jsonStringify(SplitOps.splitMultiSelectedLayers(a1 || "merge"));
      }

      if (action === "splitClipChain") {
        return P.jsonStringify(SplitOps.splitClipChain(a1 || "preserve", {}));
      }

      // 5. 真正肉眼见效的轮廓内缩削毛边 & 周边固色 & 空层清理
      if (action === "shaveLayerEdge") {
        var sPx = parseInt(a1 || "1", 10);
        var fPx = parseFloat(a2 || "0.5");
        return P.jsonStringify(SplitOps.shaveLayerEdge({
          shavePx: isNaN(sPx) ? 1 : sPx,
          featherPx: isNaN(fPx) ? 0.5 : fPx
        }));
      }

      if (action === "alphaBleedEdge") {
        var bPx = parseInt(a1 || "2", 10);
        return P.jsonStringify(SplitOps.cleanEdgeMatte({
          mode: "alphaBleed",
          widthPx: isNaN(bPx) ? 2 : bPx,
          forceGlowLayer: true
        }));
      }

      if (action === "cleanEmptyLayers") {
        var docC = Safety.ensureActiveDocument();
        return P.jsonStringify(cleanEmptyLayersAndGroups(docC));
      }

      // 6. 遮挡挖空区无缝封口补底 & 一键新建手绘补画层
      if (action === "patchOcclusionHole") {
        var pOv = parseInt(a1 || "2", 10);
        var pMethod = a2 || "caf_solid";
        return P.jsonStringify(SplitOps.patchOcclusionHole({
          overlapPx: isNaN(pOv) ? 2 : pOv,
          method: pMethod
        }));
      }

      if (action === "createPatchLayer") {
        return P.jsonStringify(SplitOps.createClippedPatchLayer(a1 || "under"));
      }

      // 7. 5 方向定向关节断口像素延展 & 关节旋转参考圆环
      if (action === "extendJointDirectional") {
        var extPx = parseInt(a1 || "12", 10);
        var dir = a2 || "all";
        var alg = a3 || "bleed";
        return P.jsonStringify(SplitOps.extendJoint({
          expandPx: isNaN(extPx) ? 12 : extPx,
          direction: dir,
          mode: alg
        }));
      }

      if (action === "toggleJointArcGuide") {
        var rad = parseInt(a1 || "0", 10);
        return P.jsonStringify(SplitOps.toggleJointArcGuide({
          radiusPx: isNaN(rad) ? 0 : rad
        }));
      }

      return P.jsonStringify({
        ok: false,
        message: "未知的面板指令: " + String(action)
      });
    } catch (e) {
      return P.jsonStringify({
        ok: false,
        message: "执行异常: " + (e && e.message ? e.message : String(e))
      });
    }
  }

  rootScope.PSSplitter_CEP_Call = dispatch;
})();
