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
