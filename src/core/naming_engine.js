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
