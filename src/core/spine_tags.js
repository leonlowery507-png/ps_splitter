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
