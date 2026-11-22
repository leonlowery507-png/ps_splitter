/**
 * @fileoverview ES3 状态机词法分析器 (Tokenizer)
 * 负责剥离 UTF-8 BOM、识别注释/字符串/ExtendScript 指令，并基于括号栈与前驱 Token 上下文
 * 精确区分除法运算符 "/" 与正则表达式字面量 "/.../"（含 [...] 字符类与条件闭合括号）。
 */

"use strict";

var EXPR_PREFIX_KEYWORDS = {
  "return": true,
  "throw": true,
  "case": true,
  "delete": true,
  "void": true,
  "typeof": true,
  "in": true,
  "instanceof": true,
  "new": true,
  "else": true,
  "do": true
};

var CONDITION_KEYWORDS = {
  "if": true,
  "while": true,
  "for": true,
  "with": true
};

var REGEX_PRE_PUNCTUATORS = {
  "(": true, "[": true, "{": true, ",": true, ";": true, ":": true, "?": true,
  "=": true, "+=": true, "-=": true, "*=": true, "/=": true, "%=": true,
  "&=": true, "|=": true, "^=": true, "<<=": true, ">>=": true, ">>>=": true,
  "**=": true, "??=": true, "&&=": true, "||=": true,
  "+": true, "-": true, "*": true, "/": true, "%": true, "!": true, "~": true,
  "&": true, "|": true, "^": true, "<": true, "<=": true, ">": true, ">=": true,
  "==": true, "===": true, "!=": true, "!==": true,
  "&&": true, "||": true, "??": true, "<<": true, ">>": true, ">>>": true,
  "=>": true, "...": true
};

var OBJECT_LITERAL_PRE_PUNCTUATORS = {
  "=": true, ":": true, "(": true, "[": true, ",": true, "?": true,
  "!": true, "~": true, "+": true, "-": true, "&&": true, "||": true,
  "??": true, "===": true, "==": true, "!==": true, "!=": true,
  "=>": true, "return": true, "throw": true, "typeof": true, "void": true
};

var OBJECT_LITERAL_PRE_KEYWORDS = {
  "return": true,
  "throw": true,
  "typeof": true,
  "void": true,
  "delete": true,
  "in": true,
  "instanceof": true,
  "case": true
};

// 多字符符号按最长优先排列
var MULTI_PUNCTUATORS = [
  ">>>=", "===", "!==", ">>>", "<<=", ">>=", "??=", "&&=", "||=", "**=",
  "...", "==", "!=", "<=", ">=", "&&", "||", "??", "?.", "=>", "++", "--",
  "<<", ">>", "**", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^="
];

function isIdentifierStart(ch) {
  return (ch >= "a" && ch <= "z") ||
    (ch >= "A" && ch <= "Z") ||
    ch === "_" ||
    ch === "$";
}

function isIdentifierPart(ch) {
  return isIdentifierStart(ch) || (ch >= "0" && ch <= "9");
}

function isDigit(ch) {
  return ch >= "0" && ch <= "9";
}

function isHexDigit(ch) {
  return isDigit(ch) || (ch >= "a" && ch <= "f") || (ch >= "A" && ch <= "F");
}

function isLineTerminator(ch) {
  return ch === "\n" || ch === "\r" || ch === "\u2028" || ch === "\u2029";
}

function isHorizontalWhitespace(ch) {
  return ch === " " || ch === "\t" || ch === "\v" || ch === "\f" || ch === "\u00A0" || ch === "\uFEFF";
}

/**
 * 对源码执行 ES3 词法扫描
 * @param {string} source 源码文本
 * @returns {{tokens:Array, lexErrors:Array}} Token 流与词法错误列表
 */
function tokenizeES3(source) {
  var src = String(source || "");
  if (src.charCodeAt(0) === 0xFEFF) {
    src = src.slice(1);
  }

  var len = src.length;
  var pos = 0;
  var line = 1;
  var col = 1;
  var tokens = [];
  var lexErrors = [];

  var prevCodeToken = null;
  var prevPrevCodeToken = null;
  var parenStack = [];
  var braceStack = [];
  var atLineStart = true;

  function pushLexError(code, msg, errLine, errCol) {
    lexErrors.push({
      code: code,
      message: msg,
      line: errLine,
      column: errCol
    });
  }

  function advance(count) {
    var k;
    for (k = 0; k < (count || 1); k++) {
      var ch = src.charAt(pos);
      pos++;
      if (ch === "\r") {
        if (src.charAt(pos) === "\n") {
          pos++;
        }
        line++;
        col = 1;
        atLineStart = true;
      } else if (ch === "\n" || ch === "\u2028" || ch === "\u2029") {
        line++;
        col = 1;
        atLineStart = true;
      } else {
        col++;
      }
    }
  }

  function pushCodeToken(type, value, startLine, startCol, raw, extra) {
    var tok = {
      type: type,
      value: value,
      line: startLine,
      column: startCol,
      raw: raw !== undefined ? raw : value
    };
    if (extra) {
      var k;
      for (k in extra) {
        if (Object.prototype.hasOwnProperty.call(extra, k)) {
          tok[k] = extra[k];
        }
      }
    }
    tokens.push(tok);
    prevPrevCodeToken = prevCodeToken;
    prevCodeToken = tok;
    atLineStart = false;
  }

  function isRegexStartContext() {
    if (!prevCodeToken) {
      return true;
    }
    if (prevCodeToken.type === "PUNCTUATOR" && REGEX_PRE_PUNCTUATORS[prevCodeToken.value]) {
      return true;
    }
    if (prevCodeToken.type === "CONDITION_CLOSE_PAREN") {
      return true;
    }
    if (prevCodeToken.type === "BLOCK_CLOSE_BRACE") {
      return true;
    }
    if (prevCodeToken.type === "IDENTIFIER" &&
      EXPR_PREFIX_KEYWORDS[prevCodeToken.value] &&
      (!prevPrevCodeToken || prevPrevCodeToken.type !== "PUNCTUATOR" || prevPrevCodeToken.value !== ".")) {
      return true;
    }
    return false;
  }

  function isObjectLiteralOpenBrace() {
    if (!prevCodeToken) {
      return false;
    }
    // function f() { ... } 或匿名函数 function () { ... } 必为块
    if (prevCodeToken.type === "CLOSE_PAREN") {
      var topParen = prevCodeToken.matchedOpen;
      if (topParen && topParen.isFunctionParams) {
        return false;
      }
    }
    if (prevCodeToken.type === "CONDITION_CLOSE_PAREN") {
      return false;
    }
    if (prevCodeToken.type === "PUNCTUATOR" && OBJECT_LITERAL_PRE_PUNCTUATORS[prevCodeToken.value]) {
      return true;
    }
    if (prevCodeToken.type === "IDENTIFIER" && OBJECT_LITERAL_PRE_KEYWORDS[prevCodeToken.value]) {
      return true;
    }
    return false;
  }

  function isFunctionHeaderParen() {
    if (!prevCodeToken) {
      return false;
    }
    if (prevCodeToken.type === "IDENTIFIER" && prevCodeToken.value === "function" &&
      (!prevPrevCodeToken || prevPrevCodeToken.value !== ".")) {
      return true;
    }
    // 命名函数 function foo(...)
    if (prevCodeToken.type === "IDENTIFIER" &&
      prevPrevCodeToken && prevPrevCodeToken.type === "IDENTIFIER" &&
      prevPrevCodeToken.value === "function") {
      return true;
    }
    return false;
  }

  while (pos < len) {
    var ch = src.charAt(pos);
    var startLine = line;
    var startCol = col;

    // 1. 空白与换行
    if (isHorizontalWhitespace(ch) || isLineTerminator(ch)) {
      advance(1);
      continue;
    }

    // 2. ExtendScript 预处理指令（仅限行首）
    if (ch === "#") {
      if (atLineStart) {
        var restLine = src.slice(pos).match(/^#(target|include|includepath|script|strict)\b[^\r\n]*/);
        if (restLine) {
          var dirRaw = restLine[0];
          tokens.push({
            type: "DIRECTIVE",
            value: dirRaw,
            line: startLine,
            column: startCol,
            raw: dirRaw
          });
          pos += dirRaw.length;
          col += dirRaw.length;
          atLineStart = false;
          continue;
        }
      }
      pushLexError("ILLEGAL_HASH", "非法 '#' 字符或非行首预处理指令", startLine, startCol);
      advance(1);
      continue;
    }

    // 3. 单行注释 //
    if (ch === "/" && src.charAt(pos + 1) === "/") {
      var commentStart = pos;
      pos += 2;
      col += 2;
      while (pos < len && !isLineTerminator(src.charAt(pos))) {
        pos++;
        col++;
      }
      tokens.push({
        type: "COMMENT_LINE",
        value: src.slice(commentStart + 2, pos),
        line: startLine,
        column: startCol,
        raw: src.slice(commentStart, pos)
      });
      continue;
    }

    // 4. 多行注释 /* ... */
    if (ch === "/" && src.charAt(pos + 1) === "*") {
      var blockStart = pos;
      advance(2);
      var closed = false;
      while (pos < len) {
        if (src.charAt(pos) === "*" && src.charAt(pos + 1) === "/") {
          advance(2);
          closed = true;
          break;
        }
        advance(1);
      }
      if (!closed) {
        pushLexError("UNTERMINATED_COMMENT", "多行注释未闭合", startLine, startCol);
      }
      tokens.push({
        type: "COMMENT_BLOCK",
        value: src.slice(blockStart + 2, closed ? pos - 2 : pos),
        line: startLine,
        column: startCol,
        raw: src.slice(blockStart, pos)
      });
      continue;
    }

    // 5. 模板字符串（ES6 禁用）
    if (ch === "`") {
      pushLexError("ILLEGAL_TEMPLATE_LITERAL", "ES3 不支持模板字符串 (`...`)", startLine, startCol);
      pushCodeToken("TEMPLATE_LITERAL", "`", startLine, startCol, "`");
      advance(1);
      continue;
    }

    // 6. 字符串字面量 '...' / "..."
    if (ch === "\"" || ch === "'") {
      var quote = ch;
      var strStart = pos;
      advance(1);
      var strClosed = false;
      var strVal = "";
      while (pos < len) {
        var sc = src.charAt(pos);
        if (isLineTerminator(sc)) {
          break;
        }
        if (sc === "\\") {
          strVal += sc;
          advance(1);
          if (pos < len) {
            if (isLineTerminator(src.charAt(pos))) {
              advance(1);
            } else {
              strVal += src.charAt(pos);
              advance(1);
            }
          }
          continue;
        }
        if (sc === quote) {
          advance(1);
          strClosed = true;
          break;
        }
        strVal += sc;
        advance(1);
      }
      if (!strClosed) {
        pushLexError("UNTERMINATED_STRING", "字符串字面量未闭合", startLine, startCol);
      }
      pushCodeToken("STRING", strVal, startLine, startCol, src.slice(strStart, pos));
      continue;
    }

    // 7. 正则字面量 vs 除法 /
    if (ch === "/" && isRegexStartContext()) {
      var reStart = pos;
      advance(1);
      var inCharClass = false;
      var reClosed = false;
      while (pos < len) {
        var rc = src.charAt(pos);
        if (isLineTerminator(rc)) {
          break;
        }
        if (rc === "\\") {
          advance(1);
          if (pos < len && !isLineTerminator(src.charAt(pos))) {
            advance(1);
          }
          continue;
        }
        if (rc === "[" && !inCharClass) {
          inCharClass = true;
          advance(1);
          continue;
        }
        if (rc === "]" && inCharClass) {
          inCharClass = false;
          advance(1);
          continue;
        }
        if (rc === "/" && !inCharClass) {
          advance(1);
          reClosed = true;
          break;
        }
        advance(1);
      }
      var flags = "";
      if (reClosed) {
        while (pos < len && isIdentifierPart(src.charAt(pos))) {
          flags += src.charAt(pos);
          advance(1);
        }
      } else {
        pushLexError("UNTERMINATED_REGEX", "正则表达式字面量未闭合", startLine, startCol);
      }
      pushCodeToken("REGEX", src.slice(reStart, pos), startLine, startCol, src.slice(reStart, pos), {
        flags: flags
      });
      continue;
    }

    // 8. 数字字面量
    if (isDigit(ch) || (ch === "." && isDigit(src.charAt(pos + 1)))) {
      var numStart = pos;
      var numPrefix = src.slice(pos, pos + 2).toLowerCase();
      if (numPrefix === "0x") {
        advance(2);
        while (pos < len && (isHexDigit(src.charAt(pos)) || src.charAt(pos) === "_")) {
          advance(1);
        }
      } else if (numPrefix === "0b" || numPrefix === "0o") {
        advance(2);
        while (pos < len && (isDigit(src.charAt(pos)) || src.charAt(pos) === "_")) {
          advance(1);
        }
      } else {
        while (pos < len && (isDigit(src.charAt(pos)) || src.charAt(pos) === "_")) {
          advance(1);
        }
        if (src.charAt(pos) === ".") {
          advance(1);
          while (pos < len && (isDigit(src.charAt(pos)) || src.charAt(pos) === "_")) {
            advance(1);
          }
        }
        if (src.charAt(pos) === "e" || src.charAt(pos) === "E") {
          advance(1);
          if (src.charAt(pos) === "+" || src.charAt(pos) === "-") {
            advance(1);
          }
          while (pos < len && (isDigit(src.charAt(pos)) || src.charAt(pos) === "_")) {
            advance(1);
          }
        }
      }
      if (src.charAt(pos) === "n") {
        advance(1);
      }
      var numRaw = src.slice(numStart, pos);
      pushCodeToken("NUMBER", numRaw, startLine, startCol, numRaw);
      continue;
    }

    // 9. 标识符或关键字
    if (isIdentifierStart(ch)) {
      var idStart = pos;
      advance(1);
      while (pos < len && isIdentifierPart(src.charAt(pos))) {
        advance(1);
      }
      var idName = src.slice(idStart, pos);
      pushCodeToken("IDENTIFIER", idName, startLine, startCol, idName);
      continue;
    }

    // 10. 括号与花括号（维护状态栈）
    if (ch === "(") {
      var isCond = !!(prevCodeToken &&
        prevCodeToken.type === "IDENTIFIER" &&
        CONDITION_KEYWORDS[prevCodeToken.value] &&
        (!prevPrevCodeToken || prevPrevCodeToken.type !== "PUNCTUATOR" || prevPrevCodeToken.value !== "."));
      var isFnParams = isFunctionHeaderParen();
      var parenInfo = {
        isCondition: isCond,
        isFunctionParams: isFnParams,
        line: startLine,
        column: startCol
      };
      parenStack.push(parenInfo);
      pushCodeToken("PUNCTUATOR", "(", startLine, startCol, "(", { parenInfo: parenInfo });
      advance(1);
      continue;
    }

    if (ch === ")") {
      var poppedParen = parenStack.length > 0 ? parenStack.pop() : null;
      var closeParenType = (poppedParen && poppedParen.isCondition)
        ? "CONDITION_CLOSE_PAREN"
        : "CLOSE_PAREN";
      pushCodeToken(closeParenType, ")", startLine, startCol, ")", { matchedOpen: poppedParen });
      advance(1);
      continue;
    }

    if (ch === "{") {
      var isObjLit = isObjectLiteralOpenBrace();
      var braceInfo = {
        isObjectLiteral: isObjLit,
        line: startLine,
        column: startCol
      };
      braceStack.push(braceInfo);
      pushCodeToken("PUNCTUATOR", "{", startLine, startCol, "{", { braceInfo: braceInfo });
      advance(1);
      continue;
    }

    if (ch === "}") {
      var poppedBrace = braceStack.length > 0 ? braceStack.pop() : null;
      var closeBraceType = (poppedBrace && poppedBrace.isObjectLiteral)
        ? "OBJECT_CLOSE_BRACE"
        : "BLOCK_CLOSE_BRACE";
      pushCodeToken(closeBraceType, "}", startLine, startCol, "}", { matchedOpen: poppedBrace });
      advance(1);
      continue;
    }

    // 11. 多字符符号
    var matchedPunct = null;
    var pi;
    for (pi = 0; pi < MULTI_PUNCTUATORS.length; pi++) {
      var pStr = MULTI_PUNCTUATORS[pi];
      if (src.slice(pos, pos + pStr.length) === pStr) {
        matchedPunct = pStr;
        break;
      }
    }
    if (matchedPunct !== null) {
      pushCodeToken("PUNCTUATOR", matchedPunct, startLine, startCol, matchedPunct);
      advance(matchedPunct.length);
      continue;
    }

    // 12. 单字符符号
    if ("[].,:;?+-*/%&|^~!<>=".indexOf(ch) !== -1) {
      pushCodeToken("PUNCTUATOR", ch, startLine, startCol, ch);
      advance(1);
      continue;
    }

    pushLexError("UNEXPECTED_CHAR", "无法识别的字符: " + ch, startLine, startCol);
    advance(1);
  }

  return {
    tokens: tokens,
    lexErrors: lexErrors
  };
}

module.exports = {
  tokenizeES3: tokenizeES3
};
