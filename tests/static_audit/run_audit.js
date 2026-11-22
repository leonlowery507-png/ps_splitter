/**
 * @fileoverview ES3 静态审计独立 CLI 运行器
 * 用法：node tests/static_audit/run_audit.js
 */

"use strict";

var fs = require("fs");
var path = require("path");
var auditor = require("./es3_auditor.js");
var sandbox = require("./vm_es3_sandbox.js");

function collectScriptFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }
  var entries = fs.readdirSync(dirPath);
  var out = [];
  var i;
  for (i = 0; i < entries.length; i++) {
    var name = entries[i];
    if (/\.(js|jsx)$/i.test(name)) {
      out.push(path.join(dirPath, name));
    }
  }
  out.sort();
  return out;
}

function main() {
  var projectRoot = path.resolve(__dirname, "../..");
  var coreDir = path.join(projectRoot, "src", "core");
  var groups = [
    { dir: path.join(projectRoot, "src", "core"), checkHostPollution: true, allowDirectives: false },
    { dir: path.join(projectRoot, "src", "host"), checkHostPollution: false, allowDirectives: false },
    { dir: path.join(projectRoot, "src", "ui"), checkHostPollution: false, allowDirectives: false },
    { dir: path.join(projectRoot, "src", "entries"), checkHostPollution: false, allowDirectives: true }
  ];

  var totalFiles = 0;
  var totalViolations = 0;
  var g;
  for (g = 0; g < groups.length; g++) {
    var grp = groups[g];
    var files = collectScriptFiles(grp.dir);
    var i;
    for (i = 0; i < files.length; i++) {
      totalFiles++;
      var fp = files[i];
      var relPath = path.relative(projectRoot, fp).replace(/\\/g, "/");
      var src = fs.readFileSync(fp, "utf8");
      var res = auditor.auditSource(src, relPath, {
        checkHostPollution: grp.checkHostPollution,
        allowDirectives: grp.allowDirectives
      });
      if (!res.passed) {
        var v;
        for (v = 0; v < res.violations.length; v++) {
          var item = res.violations[v];
          console.error(item.file + ":" + item.line + ":" + item.column + " [" + item.rule + "] " + item.message);
          totalViolations++;
        }
      }
    }
  }

  try {
    var vmCtx = sandbox.loadCoreIncludeMode(coreDir);
    if (!vmCtx.PSSplitter || !vmCtx.PSSplitter.Core || !vmCtx.PSSplitter.Core.SanitizePlanner) {
      console.error("[SANDBOX_FAIL] ExtendScript #include 模式未挂载完整 PSSplitter.Core 命名空间");
      totalViolations++;
    }
  } catch (err) {
    console.error("[SANDBOX_ERROR] ES3 沙箱加载异常: " + (err && err.stack ? err.stack : String(err)));
    totalViolations++;
  }

  if (totalViolations > 0) {
    console.error("\nES3 静态审计未通过：共发现 " + totalViolations + " 处违规或加载异常（已审计 " + totalFiles + " 个文件）。");
    process.exit(1);
  }

  console.log("ES3 静态审计通过：已审计 " + totalFiles + " 个源码文件（core/host/ui/entries），0 违规。");
}

main();
