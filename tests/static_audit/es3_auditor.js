/**
 * @fileoverview ES3 语法、ES5+/ES6+ API 与 Photoshop 宿主全局污染审计器
 * 基于 es3_tokenizer.js 产出的纯代码 Token 流，结合括号/对象上下文栈与 node:vm 二次编译校验。
 */

"use strict";

var vm = require("vm");
var tokenizer = require("./es3_tokenizer.js");

var ownProp = Object.prototype.hasOwnProperty;

function hasKey(dict, key) {
  return !!dict && ownProp.call(dict, key);
}

function isPunct(tok, val) {
  return !!tok && tok.type === "PUNCTUATOR" && (val === undefined || tok.value === val);
}

var ES56_KEYWORDS = {
  "let": true, "const": true, "class": true, "extends": true, "super": true,
  "import": true, "export": true, "async": true, "await": true, "yield": true,
  "static": true, "enum": true, "implements": true, "interface": true,
  "package": true, "private": true, "protected": true, "public": true
};

var ES3_KEYWORDS = {
  "break": true, "case": true, "catch": true, "continue": true, "default": true,
  "delete": true, "do": true, "else": true, "finally": true, "for": true,
  "function": true, "if": true, "in": true, "instanceof": true, "new": true,
  "return": true, "switch": true, "this": true, "throw": true, "try": true,
  "typeof": true, "var": true, "void": true, "while": true, "with": true,
  "true": true, "false": true, "null": true
};

var DISALLOWED_OPERATORS = {
  "=>": true,
  "...": true,
  "??": true,
  "?.": true,
  "??=": true,
  "&&=": true,
  "||=": true,
  "**": true,
  "**=": true
};

var DISALLOWED_GLOBALS = {
  "JSON": true, "Map": true, "Set": true, "WeakMap": true, "WeakSet": true,
  "Promise": true, "Symbol": true, "Proxy": true, "Reflect": true,
  "BigInt": true, "Intl": true, "ArrayBuffer": true, "DataView": true,
  "globalThis": true, "console": true, "process": true, "Buffer": true
};

var DISALLOWED_STATIC_METHODS = {
  "Object": {
    "keys": true, "values": true, "entries": true, "assign": true, "create": true,
    "defineProperty": true, "defineProperties": true, "getOwnPropertyNames": true,
    "getPrototypeOf": true, "freeze": true, "seal": true, "hasOwn": true, "is": true
  },
  "Array": {
    "isArray": true, "from": true, "of": true
  },
  "Date": {
    "now": true
  },
  "String": {
    "fromCodePoint": true, "raw": true
  },
  "Number": {
    "isNaN": true, "isFinite": true, "isInteger": true
  }
};

var DISALLOWED_PROTO_METHODS = {
  "map": true, "filter": true, "forEach": true, "reduce": true, "reduceRight": true,
  "some": true, "every": true, "includes": true, "find": true, "findIndex": true,
  "flat": true, "flatMap": true, "fill": true, "copyWithin": true, "at": true,
  "trim": true, "trimStart": true, "trimEnd": true, "startsWith": true,
  "endsWith": true, "repeat": true, "padStart": true, "padEnd": true,
  "replaceAll": true, "bind": true
};

var PS_HOST_GLOBALS = {
  "app": true, "activeDocument": true, "documents": true, "Window": true,
  "BridgeTalk": true, "ActionDescriptor": true, "ActionReference": true,
  "ActionList": true, "executeAction": true, "executeActionGet": true,
  "charIDToTypeID": true, "stringIDToTypeID": true, "DialogModes": true,
  "Units": true, "TrimType": true, "SaveOptions": true, "File": true,
  "Folder": true, "alert": true, "confirm": true, "prompt": true
};

function isCodeToken(tok) {
  return tok.type !== "COMMENT_LINE" &&
    tok.type !== "COMMENT_BLOCK" &&
    tok.type !== "DIRECTIVE";
}

function isPropertyPosition(codeTokens, idx, objCtxStack) {
  var prev = idx > 0 ? codeTokens[idx - 1] : null;
  if (isPunct(prev, ".")) {
    return true;
  }
  if (objCtxStack.length > 0) {
    var topObj = objCtxStack[objCtxStack.length - 1];
    if (topObj.isObjectLiteral && topObj.expectKey) {
      return true;
    }
  }
  return false;
}

function isPolyfillReceiver(codeTokens, dotIdx) {
  var prev = dotIdx > 0 ? codeTokens[dotIdx - 1] : null;
  if (!prev) {
    return false;
  }
  if (prev.type === "IDENTIFIER" && (prev.value === "Polyfill" || prev.value === "P")) {
    return true;
  }
  if (prev.type === "CLOSE_PAREN" && dotIdx >= 3) {
    var maybeCall = codeTokens[dotIdx - 3];
    if (maybeCall && maybeCall.type === "IDENTIFIER" && maybeCall.value === "getPolyfill") {
      return true;
    }
  }
  return false;
}

function isAllowedDollarGlobalProbe(codeTokens, idx) {
  var prev = idx > 0 ? codeTokens[idx - 1] : null;
  var next = idx + 1 < codeTokens.length ? codeTokens[idx + 1] : null;
  var next2 = idx + 2 < codeTokens.length ? codeTokens[idx + 2] : null;
  if (prev && prev.type === "IDENTIFIER" && prev.value === "typeof") {
    return true;
  }
  if (isPunct(next, ".") && next2 && next2.type === "IDENTIFIER" && next2.value === "global") {
    return true;
  }
  return false;
}

/**
 * 对源码执行完整 ES3 静态审计
 * @param {string} source 源码内容
 * @param {string} [filePath="inline.js"] 文件路径
 * @param {Object} [options] 选项 {checkHostPollution?:boolean, allowDirectives?:boolean}
 * @returns {{filePath:string, passed:boolean, violations:Array}} 审计结果
 */
function auditSource(source, filePath, options) {
  var opts = options || {};
  var checkHostPollution = opts.checkHostPollution !== false;
  var allowDirectives = !!opts.allowDirectives;
  var targetFile = filePath || "inline.js";
  var violations = [];

  function addViolation(rule, message, line, column) {
    violations.push({
      file: targetFile,
      rule: rule,
      message: message,
      line: line || 1,
      column: column || 1
    });
  }

  var lexed = tokenizer.tokenizeES3(source);
  var i;
  for (i = 0; i < lexed.lexErrors.length; i++) {
    var le = lexed.lexErrors[i];
    addViolation(le.code, le.message, le.line, le.column);
  }

  var allTokens = lexed.tokens;
  var codeTokens = [];
  for (i = 0; i < allTokens.length; i++) {
    var t = allTokens[i];
    if (t.type === "DIRECTIVE") {
      if (!allowDirectives) {
        addViolation("DISALLOWED_DIRECTIVE", "core 模块禁止使用 ExtendScript 预处理指令: " + t.value, t.line, t.column);
      }
      continue;
    }
    if (isCodeToken(t)) {
      codeTokens.push(t);
    }
  }

  var parenCtxStack = [];
  var objCtxStack = [];
  var bracketDepth = 0;
  var bracketStack = [];

  for (i = 0; i < codeTokens.length; i++) {
    var tok = codeTokens[i];
    var prev = i > 0 ? codeTokens[i - 1] : null;
    var next = i + 1 < codeTokens.length ? codeTokens[i + 1] : null;
    var next2 = i + 2 < codeTokens.length ? codeTokens[i + 2] : null;

    if (tok.type === "TEMPLATE_LITERAL") {
      continue;
    }

    if (tok.type === "REGEX" && tok.flags) {
      if (!/^[gim]*$/.test(tok.flags)) {
        addViolation("ES6_REGEX_FLAG", "ES3 不支持正则标志: /" + tok.flags, tok.line, tok.column);
      }
    }

    if (tok.type === "NUMBER") {
      var lowNum = tok.value.toLowerCase();
      if (lowNum.indexOf("0b") === 0 || lowNum.indexOf("0o") === 0) {
        addViolation("ES6_NUMERIC_LITERAL", "ES3 不支持二进制/八进制字面量: " + tok.value, tok.line, tok.column);
      } else if (tok.value.indexOf("_") !== -1) {
        addViolation("ES2021_NUMERIC_SEPARATOR", "ES3 不支持数字分隔符: " + tok.value, tok.line, tok.column);
      } else if (lowNum.charAt(lowNum.length - 1) === "n") {
        addViolation("ES2020_BIGINT_LITERAL", "ES3 不支持 BigInt 字面量: " + tok.value, tok.line, tok.column);
      }
    }

    if (tok.type === "PUNCTUATOR" && hasKey(DISALLOWED_OPERATORS, tok.value)) {
      addViolation("ES6_OPERATOR", "ES3 不支持运算符或语法: " + tok.value, tok.line, tok.column);
    }

    if (isPunct(tok, "(")) {
      var inForHeader = !!(prev && prev.type === "IDENTIFIER" && prev.value === "for" &&
        (!codeTokens[i - 2] || !isPunct(codeTokens[i - 2], ".")));
      var inFnParams = !!(tok.parenInfo && tok.parenInfo.isFunctionParams);
      parenCtxStack.push({
        isFunctionParams: inFnParams,
        isForHeader: inForHeader,
        nestedBraceDepth: objCtxStack.length,
        nestedBracketDepth: bracketDepth
      });
    } else if (tok.type === "CLOSE_PAREN" || tok.type === "CONDITION_CLOSE_PAREN") {
      if (isPunct(prev, ",")) {
        var topFnCheck = parenCtxStack.length > 0 ? parenCtxStack[parenCtxStack.length - 1] : null;
        if (topFnCheck && topFnCheck.isFunctionParams) {
          addViolation("TRAILING_COMMA_PARAMS", "ES3 不支持函数参数尾逗号", prev.line, prev.column);
        }
      }
      if (parenCtxStack.length > 0) {
        parenCtxStack.pop();
      }
    }

    if (parenCtxStack.length > 0) {
      var curParen = parenCtxStack[parenCtxStack.length - 1];
      if (curParen.isFunctionParams &&
        objCtxStack.length === curParen.nestedBraceDepth &&
        bracketDepth === curParen.nestedBracketDepth) {
        if (isPunct(tok, "=") || isPunct(tok, "{") || isPunct(tok, "[")) {
          addViolation("ES6_PARAM_SYNTAX", "ES3 函数参数列表不支持默认参数或解构: " + tok.value, tok.line, tok.column);
        }
      }
      if (curParen.isForHeader &&
        tok.type === "IDENTIFIER" &&
        tok.value === "of" &&
        objCtxStack.length === curParen.nestedBraceDepth &&
        bracketDepth === curParen.nestedBracketDepth) {
        addViolation("ES6_FOR_OF", "ES3 不支持 for..of 循环", tok.line, tok.column);
      }
    }

    if (isPunct(tok, "[")) {
      if (objCtxStack.length > 0) {
        var topObjForBracket = objCtxStack[objCtxStack.length - 1];
        if (topObjForBracket.isObjectLiteral && topObjForBracket.expectKey &&
          bracketDepth === topObjForBracket.nestedBracketDepth &&
          parenCtxStack.length === topObjForBracket.nestedParenDepth) {
          addViolation("ES6_COMPUTED_PROPERTY", "ES3 不支持对象计算属性名 [key]", tok.line, tok.column);
        }
      }
      var isSubscriptAccess = !!(prev && (
        prev.type === "IDENTIFIER" ||
        prev.type === "CLOSE_PAREN" ||
        isPunct(prev, "]") ||
        prev.type === "STRING"
      ));
      bracketStack.push({
        isArrayLiteral: !isSubscriptAccess,
        startsWithAssignmentTarget: !isSubscriptAccess &&
          (!prev || isPunct(prev, ";") || isPunct(prev, "{") || prev.type === "BLOCK_CLOSE_BRACE" ||
            prev.type === "CONDITION_CLOSE_PAREN" || (prev.type === "IDENTIFIER" && prev.value === "var"))
      });
      bracketDepth++;
    } else if (isPunct(tok, "]")) {
      if (isPunct(prev, ",")) {
        addViolation("TRAILING_COMMA_ARRAY", "ES3 不支持数组尾逗号 ',]' ", prev.line, prev.column);
      }
      var poppedArr = bracketStack.length > 0 ? bracketStack.pop() : null;
      bracketDepth = Math.max(0, bracketDepth - 1);
      if (poppedArr && poppedArr.startsWithAssignmentTarget && isPunct(next, "=")) {
        addViolation("ES6_ARRAY_DESTRUCTURING", "ES3 不支持数组解构赋值", tok.line, tok.column);
      }
    }

    if (isPunct(tok, "{")) {
      var isObj = !!(tok.braceInfo && tok.braceInfo.isObjectLiteral);
      objCtxStack.push({
        isObjectLiteral: isObj,
        expectKey: isObj,
        nestedBracketDepth: bracketDepth,
        nestedParenDepth: parenCtxStack.length
      });
    } else if (tok.type === "OBJECT_CLOSE_BRACE" || tok.type === "BLOCK_CLOSE_BRACE") {
      if (isPunct(prev, ",") && tok.type === "OBJECT_CLOSE_BRACE") {
        addViolation("TRAILING_COMMA_OBJECT", "ES3 不支持对象字面量尾逗号 ',}' ", prev.line, prev.column);
      }
      var poppedObj = objCtxStack.length > 0 ? objCtxStack.pop() : null;
      if (poppedObj && poppedObj.isObjectLiteral && isPunct(next, "=")) {
        addViolation("ES6_OBJECT_DESTRUCTURING", "ES3 不支持对象解构赋值", tok.line, tok.column);
      }
    } else if (objCtxStack.length > 0) {
      var activeObj = objCtxStack[objCtxStack.length - 1];
      if (activeObj.isObjectLiteral &&
        bracketDepth === activeObj.nestedBracketDepth &&
        parenCtxStack.length === activeObj.nestedParenDepth) {
        if (activeObj.expectKey) {
          if (tok.type === "IDENTIFIER" && (tok.value === "get" || tok.value === "set") &&
            next && next.type === "IDENTIFIER" && isPunct(next2, "(")) {
            addViolation("ES5_GETTER_SETTER", "ES3 不支持对象 getter/setter: " + tok.value, tok.line, tok.column);
            activeObj.expectKey = false;
          } else if (tok.type === "IDENTIFIER" && isPunct(next, "(")) {
            addViolation("ES6_SHORTHAND_METHOD", "ES3 不支持对象简写方法: " + tok.value + "()", tok.line, tok.column);
            activeObj.expectKey = false;
          } else if (tok.type === "IDENTIFIER" && (isPunct(next, ",") || (next && next.type === "OBJECT_CLOSE_BRACE"))) {
            addViolation("ES6_SHORTHAND_PROPERTY", "ES3 不支持对象简写属性: " + tok.value, tok.line, tok.column);
            activeObj.expectKey = false;
          } else if (tok.type === "IDENTIFIER" && hasKey(ES3_KEYWORDS, tok.value) && isPunct(next, ":")) {
            addViolation("ES3_RESERVED_OBJECT_KEY", "ES3 对象字面量未加引号键名禁止使用保留字: " + tok.value, tok.line, tok.column);
            activeObj.expectKey = false;
          } else if (isPunct(tok, ":") || tok.type === "IDENTIFIER" || tok.type === "STRING" || tok.type === "NUMBER") {
            if (isPunct(next, ":")) {
              activeObj.expectKey = false;
            }
          }
        } else if (isPunct(tok, ",")) {
          activeObj.expectKey = true;
        }
      }
    }

    if (tok.type === "IDENTIFIER") {
      var propPos = isPropertyPosition(codeTokens, i, objCtxStack);

      if (tok.value === "var" && !propPos && (isPunct(next, "{") || isPunct(next, "["))) {
        addViolation("ES6_VAR_DESTRUCTURING", "ES3 不支持 var 解构声明", tok.line, tok.column);
      }

      if (tok.value === "catch" && !propPos && isPunct(next, "{")) {
        addViolation("ES2019_OPTIONAL_CATCH", "ES3 catch 语句必须携带 (e) 参数", tok.line, tok.column);
      }

      if (hasKey(ES56_KEYWORDS, tok.value) && !isPunct(prev, ".")) {
        addViolation("ES6_KEYWORD", "ES3 禁用 ES5+/ES6+ 关键字或保留词: " + tok.value, tok.line, tok.column);
      }

      if (isPunct(prev, ".")) {
        if (hasKey(ES3_KEYWORDS, tok.value)) {
          addViolation("ES3_RESERVED_PROPERTY", "ES3 禁止点号访问保留字属性: ." + tok.value, tok.line, tok.column);
        }

        var ownerTok = i >= 2 ? codeTokens[i - 2] : null;
        if (ownerTok && ownerTok.type === "IDENTIFIER" &&
          (!codeTokens[i - 3] || !isPunct(codeTokens[i - 3], ".")) &&
          hasKey(DISALLOWED_STATIC_METHODS, ownerTok.value) &&
          hasKey(DISALLOWED_STATIC_METHODS[ownerTok.value], tok.value)) {
          addViolation("ES5_STATIC_METHOD", "ES3 禁止调用 ES5+ 静态方法: " + ownerTok.value + "." + tok.value, tok.line, tok.column);
        }

        if (hasKey(DISALLOWED_PROTO_METHODS, tok.value) && !isPolyfillReceiver(codeTokens, i - 1)) {
          addViolation("ES5_PROTO_METHOD", "ES3 禁止直接调用未 polyfill 原型方法: ." + tok.value, tok.line, tok.column);
        }

        if (tok.value === "indexOf" || tok.value === "lastIndexOf") {
          if (isPunct(ownerTok, "]")) {
            addViolation("ES5_ARRAY_INDEXOF", "ES3 不支持数组字面量调用 ." + tok.value, tok.line, tok.column);
          } else if (i >= 4 &&
            codeTokens[i - 4].type === "IDENTIFIER" && codeTokens[i - 4].value === "Array" &&
            isPunct(codeTokens[i - 3], ".") &&
            codeTokens[i - 2].type === "IDENTIFIER" && codeTokens[i - 2].value === "prototype") {
            addViolation("ES5_ARRAY_INDEXOF", "ES3 不存在 Array.prototype." + tok.value, tok.line, tok.column);
          }
        }
      } else if (!propPos) {
        if (hasKey(DISALLOWED_GLOBALS, tok.value)) {
          addViolation("ES5_GLOBAL", "ES3 禁用现代全局对象: " + tok.value, tok.line, tok.column);
        }
        if (checkHostPollution) {
          if (hasKey(PS_HOST_GLOBALS, tok.value)) {
            addViolation("HOST_GLOBAL_POLLUTION", "core 模块禁止引用 Photoshop 宿主全局变量: " + tok.value, tok.line, tok.column);
          }
          if (tok.value === "$" && !isAllowedDollarGlobalProbe(codeTokens, i)) {
            addViolation("HOST_DOLLAR_POLLUTION", "core 模块禁止非根探测用途引用 ExtendScript '$'", tok.line, tok.column);
          }
        }
      }
    }
  }

  var compileSource = String(source || "");
  if (compileSource.charCodeAt(0) === 0xFEFF) {
    compileSource = compileSource.slice(1);
  }
  if (allowDirectives) {
    compileSource = compileSource.replace(/^[ \t]*#(target|include|includepath|script|strict)\b[^\r\n]*/gm, function (m) {
      return new Array(m.length + 1).join(" ");
    });
  }
  try {
    new vm.Script(compileSource, { filename: targetFile });
  } catch (err) {
    addViolation("SYNTAX_COMPILE_ERROR", "JS 语法编译失败: " + (err && err.message ? err.message : String(err)), 1, 1);
  }

  return {
    filePath: targetFile,
    passed: violations.length === 0,
    violations: violations
  };
}

module.exports = {
  auditSource: auditSource
};
