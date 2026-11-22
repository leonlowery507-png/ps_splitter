/**
 * @fileoverview SpineSplitter ScriptUI 整合模态主控台（PSSplitter.UI.MainPanel）
 * 聚焦 3 大核心拆图模块：1. 精细选区拆图与保护  2. 关节补全与修边防护  3. 命名与层级整理
 */

(function () {
  var rootScope = (typeof $ !== "undefined" && $.global)
    ? $.global
    : (typeof global !== "undefined" ? global : (function () { return this; }()));
  rootScope.PSSplitter = rootScope.PSSplitter || {};
  rootScope.PSSplitter.UI = rootScope.PSSplitter.UI || {};
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

  function getTemplates() {
    if (PSSplitter && PSSplitter.Core && PSSplitter.Core.SkeletonTemplates) {
      return PSSplitter.Core.SkeletonTemplates;
    }
    if (typeof require === "function") {
      return require("../core/skeleton_templates.js");
    }
    throw new Error("PSSplitter.Core.SkeletonTemplates 未加载");
  }

  function getAM() {
    if (PSSplitter && PSSplitter.Host && PSSplitter.Host.AM) {
      return PSSplitter.Host.AM;
    }
    if (typeof require === "function") {
      return require("../host/ps_am.js");
    }
    throw new Error("PSSplitter.Host.AM 未加载");
  }

  function getSafety() {
    if (PSSplitter && PSSplitter.Host && PSSplitter.Host.Safety) {
      return PSSplitter.Host.Safety;
    }
    if (typeof require === "function") {
      return require("../host/ps_safety.js");
    }
    throw new Error("PSSplitter.Host.Safety 未加载");
  }

  function getSplitJointOps() {
    if (PSSplitter && PSSplitter.Host && PSSplitter.Host.SplitJointOps) {
      return PSSplitter.Host.SplitJointOps;
    }
    if (typeof require === "function") {
      return require("../host/ps_split_joint_ops.js");
    }
    throw new Error("PSSplitter.Host.SplitJointOps 未加载");
  }

  function getNamingOps() {
    if (PSSplitter && PSSplitter.Host && PSSplitter.Host.NamingHierarchyOps) {
      return PSSplitter.Host.NamingHierarchyOps;
    }
    if (typeof require === "function") {
      return require("../host/ps_naming_hierarchy_ops.js");
    }
    throw new Error("PSSplitter.Host.NamingHierarchyOps 未加载");
  }

  /**
   * 构造当前文档与选区摘要文本
   * @returns {string} 状态摘要
   */
  function buildDocSummaryText() {
    var AM = getAM();
    if (typeof app === "undefined" || !app.documents || app.documents.length === 0) {
      return "当前未打开任何 Photoshop 文档";
    }
    var doc = app.activeDocument;
    var activeName = doc.activeLayer ? String(doc.activeLayer.name) : "(无)";
    var hasSel = AM.hasSelection(doc);
    return "文档: " + String(doc.name) +
      "  |  当前层: " + activeName +
      "  |  选区: " + (hasSel ? "已建立选区" : "无选区");
  }

  /**
   * 构建并弹出 SpineSplitter 3-Tab ScriptUI 主控台对话框
   * @returns {{ok:boolean, shown:boolean}} 执行状态
   */
  function show() {
    var P = getPolyfill();
    var Safety = getSafety();
    var SplitJointOps = getSplitJointOps();
    var NamingOps = getNamingOps();
    var Templates = getTemplates();

    Safety.ensureActiveDocument();

    if (typeof Window === "undefined") {
      throw new Error("当前运行环境不支持 ScriptUI Window 对象。");
    }

    var state = Safety.getSessionState();
    var win = new Window("dialog", "SpineSplitter - Spine 2D 拆图辅助主控台 v1.0");
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 8;
    win.margins = 12;

    // 顶部文档实时状态栏
    var headerBar = win.add("panel", undefined, "当前工作上下文");
    headerBar.orientation = "row";
    headerBar.alignChildren = ["fill", "center"];
    headerBar.margins = [10, 12, 10, 8];
    var lblDocStatus = headerBar.add("statictext", undefined, buildDocSummaryText());
    lblDocStatus.alignment = ["fill", "center"];

    // 3 大核心模块 TabbedPanel
    var tabs = win.add("tabbedpanel");
    tabs.alignChildren = ["fill", "fill"];
    tabs.preferredSize = [620, 410];

    // =========================================================================
    // Tab 1: 精细选区拆图与保护
    // =========================================================================
    var tabSplit = tabs.add("tab", undefined, "1. 精细拆图与保护");
    tabSplit.orientation = "column";
    tabSplit.alignChildren = ["fill", "top"];
    tabSplit.spacing = 8;
    tabSplit.margins = 10;

    var pnlGuard = tabSplit.add("panel", undefined, "原稿快照保护 & 参考草图防导出隔离");
    pnlGuard.orientation = "column";
    pnlGuard.alignChildren = ["fill", "top"];
    pnlGuard.margins = [10, 14, 10, 10];
    var rowGuardBtns = pnlGuard.add("group");
    rowGuardBtns.orientation = "row";
    var btnInitWs = rowGuardBtns.add("button", undefined, "初始化工作区 (建 SRC_BACKUP & __REF__)");
    var btnMoveRef = rowGuardBtns.add("button", undefined, "选中层移入 __REF__ 隔离区");
    var btnRestoreBak = rowGuardBtns.add("button", undefined, "从原稿快照无损补提选区");

    var pnlRoute = tabSplit.add("panel", undefined, "拆图目标归组与命名路由");
    pnlRoute.orientation = "column";
    pnlRoute.alignChildren = ["fill", "top"];
    pnlRoute.margins = [10, 14, 10, 10];
    pnlRoute.spacing = 6;

    var rowGroupSel = pnlRoute.add("group");
    rowGroupSel.orientation = "row";
    rowGroupSel.add("statictext", undefined, "现有目标组:");
    var ddGroups = rowGroupSel.add("dropdownlist", undefined, ["(保持当前同级 / 手动填写下方路径)"]);
    ddGroups.preferredSize.width = 340;
    var btnRefreshGroups = rowGroupSel.add("button", undefined, "刷新组列表");

    var rowCustomPath = pnlRoute.add("group");
    rowCustomPath.orientation = "row";
    rowCustomPath.add("statictext", undefined, "目标组路径:");
    var edtTargetGroup = rowCustomPath.add("edittext", undefined, state.lastTargetGroupPath || "");
    edtTargetGroup.preferredSize.width = 230;
    rowCustomPath.add("statictext", undefined, "基础名称:");
    var edtBaseName = rowCustomPath.add("edittext", undefined, state.lastBaseName || "part");
    edtBaseName.preferredSize.width = 140;

    var rowSplitFlags = pnlRoute.add("group");
    rowSplitFlags.orientation = "row";
    var chkAutoNum = rowSplitFlags.add("checkbox", undefined, "自动追加递增序号 (_01, _02)");
    chkAutoNum.value = true;
    var chkReturnSrc = rowSplitFlags.add("checkbox", undefined, "拆出后自动切回源图层 (方便连续套索拆图)");
    chkReturnSrc.value = state.returnToSource !== false;

    var pnlSplitActions = tabSplit.add("panel", undefined, "选区拆出 & 复合剪贴蒙版链联动拆出");
    pnlSplitActions.orientation = "column";
    pnlSplitActions.alignChildren = ["fill", "top"];
    pnlSplitActions.margins = [10, 14, 10, 10];
    pnlSplitActions.spacing = 6;

    var rowBasicSplit = pnlSplitActions.add("group");
    rowBasicSplit.orientation = "row";
    var btnSplitCopy = rowBasicSplit.add("button", undefined, "复制拆出并归组 (Copy - 保留源层)");
    var btnSplitCut = rowBasicSplit.add("button", undefined, "剪切拆出并归组 (Cut - 挖空已拆区)");

    var rowClipSplit = pnlSplitActions.add("group");
    rowClipSplit.orientation = "row";
    var btnClipPreserve = rowClipSplit.add("button", undefined, "剪贴蒙版链拆出：保留完整剪贴链结构");
    var btnClipMerge = rowClipSplit.add("button", undefined, "剪贴蒙版链拆出：安全合层为干净单图");

    // =========================================================================
    // Tab 2: 关节补全与修边防护
    // =========================================================================
    var tabJoint = tabs.add("tab", undefined, "2. 关节补全与修边");
    tabJoint.orientation = "column";
    tabJoint.alignChildren = ["fill", "top"];
    tabJoint.spacing = 8;
    tabJoint.margins = 10;

    var pnlXRay = tabJoint.add("panel", undefined, "遮挡区域 X-Ray 半透明透视参照（自动记忆并恢复原不透明度）");
    pnlXRay.orientation = "row";
    pnlXRay.alignChildren = ["left", "center"];
    pnlXRay.margins = [10, 14, 10, 10];
    pnlXRay.add("statictext", undefined, "透视不透明度(%):");
    var edtXRayOpacity = pnlXRay.add("edittext", undefined, String(state.lastXRayOpacity || 35));
    edtXRayOpacity.preferredSize.width = 55;
    var btnToggleXRay = pnlXRay.add("button", undefined, "一键切换 / 还原选中层 X-Ray 半透明参照");

    var pnlExtend = tabJoint.add("panel", undefined, "关节末端外延扩边与智能补全（防动画旋转穿帮露缝）");
    pnlExtend.orientation = "column";
    pnlExtend.alignChildren = ["fill", "top"];
    pnlExtend.margins = [10, 14, 10, 10];
    pnlExtend.spacing = 6;

    var rowExtCfg = pnlExtend.add("group");
    rowExtCfg.orientation = "row";
    rowExtCfg.add("statictext", undefined, "外延像素(px):");
    var edtExtendPx = rowExtCfg.add("edittext", undefined, String(state.lastJointExpandPx || 10));
    edtExtendPx.preferredSize.width = 55;
    var rbCaf = rowExtCfg.add("radiobutton", undefined, "智能内容识别填充 (CAF, 失败自动降级)");
    var rbBleed = rowExtCfg.add("radiobutton", undefined, "8方向柔和像素外扩固色 (全版本极速稳定)");
    if (state.lastJointMode === "bleed") {
      rbBleed.value = true;
    } else {
      rbCaf.value = true;
    }

    var btnRunExtend = pnlExtend.add("button", undefined, "对当前图层/框选关节区执行扩边补全");

    var pnlMatte = tabJoint.add("panel", undefined, "柔边杂边清理 & Alpha Bleed 固色（自动保护发光混合模式层）");
    pnlMatte.orientation = "column";
    pnlMatte.alignChildren = ["fill", "top"];
    pnlMatte.margins = [10, 14, 10, 10];
    pnlMatte.spacing = 6;

    var rowMatteCfg = pnlMatte.add("group");
    rowMatteCfg.orientation = "row";
    rowMatteCfg.add("statictext", undefined, "去边/固色宽度(px):");
    var edtDefringePx = rowMatteCfg.add("edittext", undefined, "1");
    edtDefringePx.preferredSize.width = 50;
    var chkForceGlow = rowMatteCfg.add("checkbox", undefined, "强制处理发光混合模式层 (默认跳过保护)");
    chkForceGlow.value = false;

    var rowMatteBtns = pnlMatte.add("group");
    rowMatteBtns.orientation = "row";
    var btnDefringe = rowMatteBtns.add("button", undefined, "去边 (Defringe)");
    var btnBlackMatte = rowMatteBtns.add("button", undefined, "移去黑色杂边");
    var btnWhiteMatte = rowMatteBtns.add("button", undefined, "移去白色杂边");
    var btnAlphaBleed = rowMatteBtns.add("button", undefined, "Alpha Bleed 周边固色");

    // =========================================================================
    // Tab 3: 命名与层级整理
    // =========================================================================
    var tabNaming = tabs.add("tab", undefined, "3. 命名与层级整理");
    tabNaming.orientation = "column";
    tabNaming.alignChildren = ["fill", "top"];
    tabNaming.spacing = 6;
    tabNaming.margins = 10;

    // 3.1 角色骨骼模板
    var pnlTpl = tabNaming.add("panel", undefined, "标准化角色骨骼模板一键增量建组（跳过已有组，不破坏已拆图层）");
    pnlTpl.orientation = "row";
    pnlTpl.alignChildren = ["left", "center"];
    pnlTpl.margins = [10, 12, 10, 8];
    var tplList = Templates.listTemplates();
    var tplItems = [];
    var ti;
    for (ti = 0; ti < tplList.length; ti++) {
      tplItems.push(tplList[ti].id + " - " + tplList[ti].name);
    }
    var ddTemplate = pnlTpl.add("dropdownlist", undefined, tplItems);
    ddTemplate.selection = 0;
    ddTemplate.preferredSize.width = 230;
    var chkTplSlots = pnlTpl.add("checkbox", undefined, "含 [slot] 子组");
    chkTplSlots.value = true;
    var btnApplyTpl = pnlTpl.add("button", undefined, "一键增量建组");

    // 3.2 Spine 官方 12 标签快捷装配
    var pnlTags = tabNaming.add("panel", undefined, "Spine 官方 12 标签可视化装配与移除（严格小写 & 作用域校验）");
    pnlTags.orientation = "row";
    pnlTags.alignChildren = ["left", "center"];
    pnlTags.margins = [10, 12, 10, 8];
    pnlTags.add("statictext", undefined, "标签:");
    var tagMenuItems = [
      "bone (骨骼)",
      "slot (插槽)",
      "skin (皮肤)",
      "folder (输出文件夹)",
      "merge (仅组:合并为单图)",
      "ignore (忽略不导出)",
      "trim (如 false 禁裁切)",
      "mesh (网格/链接网格)",
      "scale (必填缩放正数)",
      "name (仅组:含*命名模式)",
      "path (覆写PNG路径)",
      "overlay (剪贴叠加遮罩)"
    ];
    var tagKeys = [
      "bone", "slot", "skin", "folder", "merge", "ignore",
      "trim", "mesh", "scale", "name", "path", "overlay"
    ];
    var ddTagKey = pnlTags.add("dropdownlist", undefined, tagMenuItems);
    ddTagKey.selection = 0;
    ddTagKey.preferredSize.width = 165;
    pnlTags.add("statictext", undefined, "参数:");
    var edtTagVal = pnlTags.add("edittext", undefined, "");
    edtTagVal.preferredSize.width = 110;
    var btnAddTag = pnlTags.add("button", undefined, "添加/更新");
    var btnRemoveTag = pnlTags.add("button", undefined, "移除标签");

    // 3.3 Tag-Aware 批量重命名与 L/R 对称互换
    var pnlRename = tabNaming.add("panel", undefined, "Tag-Aware 批量重命名 & L/R 对称互换（自动保护 [...] 标签区）");
    pnlRename.orientation = "column";
    pnlRename.alignChildren = ["fill", "top"];
    pnlRename.margins = [10, 12, 10, 8];
    pnlRename.spacing = 4;

    var rowRen1 = pnlRename.add("group");
    rowRen1.orientation = "row";
    rowRen1.add("statictext", undefined, "范围:");
    var ddRenScope = rowRen1.add("dropdownlist", undefined, [
      "当前选中图层/组 (Selected)",
      "当前组直接子层 (Group Children)",
      "当前组全部后代 (Group Deep)"
    ]);
    ddRenScope.selection = 0;
    ddRenScope.preferredSize.width = 200;
    rowRen1.add("statictext", undefined, "前缀:");
    var edtPrefix = rowRen1.add("edittext", undefined, "");
    edtPrefix.preferredSize.width = 75;
    rowRen1.add("statictext", undefined, "后缀:");
    var edtSuffix = rowRen1.add("edittext", undefined, "");
    edtSuffix.preferredSize.width = 75;
    rowRen1.add("statictext", undefined, "起始号:");
    var edtSeqStart = rowRen1.add("edittext", undefined, "");
    edtSeqStart.preferredSize.width = 45;

    var rowRen2 = pnlRename.add("group");
    rowRen2.orientation = "row";
    rowRen2.add("statictext", undefined, "正则查找:");
    var edtRegexFind = rowRen2.add("edittext", undefined, "");
    edtRegexFind.preferredSize.width = 110;
    rowRen2.add("statictext", undefined, "替换:");
    var edtRegexRep = rowRen2.add("edittext", undefined, "");
    edtRegexRep.preferredSize.width = 90;
    var chkRenSwapLR = rowRen2.add("checkbox", undefined, "互换 L/R");
    chkRenSwapLR.value = false;
    var btnPreviewRen = rowRen2.add("button", undefined, "预览");
    var btnApplyRen = rowRen2.add("button", undefined, "执行重命名");
    var btnQuickLR = rowRen2.add("button", undefined, "一键互换 L/R");

    // 3.4 多皮肤同构克隆
    var pnlSkin = tabNaming.add("panel", undefined, "多皮肤 / 换装目录同构克隆（自动拦截 default、剥离 [path:]、跳过 [ignore]）");
    pnlSkin.orientation = "row";
    pnlSkin.alignChildren = ["left", "center"];
    pnlSkin.margins = [10, 12, 10, 8];
    pnlSkin.add("statictext", undefined, "新皮肤名:");
    var edtSkinName = pnlSkin.add("edittext", undefined, "costume_02");
    edtSkinName.preferredSize.width = 135;
    pnlSkin.add("statictext", undefined, "Mesh处理:");
    var ddMeshStrat = pnlSkin.add("dropdownlist", undefined, [
      "解绑为独立 [mesh] (推荐)",
      "跨皮肤链接源 [mesh:skin/...]",
      "原样保留标签"
    ]);
    ddMeshStrat.selection = 0;
    ddMeshStrat.preferredSize.width = 175;
    var btnCloneSkin = pnlSkin.add("button", undefined, "同构克隆选中皮肤组");

    tabs.selection = tabSplit;

    // 底部操作结果日志框与控制按钮
    var pnlLog = win.add("panel", undefined, "操作执行反馈");
    pnlLog.orientation = "column";
    pnlLog.alignChildren = ["fill", "top"];
    pnlLog.margins = [10, 12, 10, 8];
    var edtLog = pnlLog.add("edittext", undefined, "就绪：请选择上方功能操作（所有修改均支持 Ctrl+Z 一步撤销）。", {
      multiline: true,
      readonly: true
    });
    edtLog.preferredSize.height = 48;

    var footer = win.add("group");
    footer.orientation = "row";
    footer.alignment = ["right", "bottom"];
    var btnRefreshStatus = footer.add("button", undefined, "刷新状态");
    var btnClose = footer.add("button", undefined, "关闭面板", { name: "cancel" });

    // =========================================================================
    // 内部事件绑定与辅助函数
    // =========================================================================
    function writeLog(text) {
      edtLog.text = String(text || "");
      lblDocStatus.text = buildDocSummaryText();
    }

    function refreshGroupDropdown() {
      var doc = Safety.ensureActiveDocument();
      var paths = Safety.listAllGroupPaths(doc, false);
      ddGroups.removeAll();
      ddGroups.add("item", "(保持当前同级 / 手动填写下方路径)");
      var selIdx = 0;
      var i;
      for (i = 0; i < paths.length; i++) {
        ddGroups.add("item", paths[i]);
        if (state.lastTargetGroupPath && paths[i] === state.lastTargetGroupPath) {
          selIdx = i + 1;
        }
      }
      ddGroups.selection = selIdx;
    }

    ddGroups.onChange = function () {
      if (ddGroups.selection && ddGroups.selection.index > 0) {
        edtTargetGroup.text = ddGroups.selection.text;
      }
    };

    btnRefreshGroups.onClick = function () {
      try {
        refreshGroupDropdown();
        writeLog("已刷新文档图层组列表。");
      } catch (e) {
        writeLog("刷新失败：" + (e.message || String(e)));
      }
    };

    btnRefreshStatus.onClick = function () {
      try {
        refreshGroupDropdown();
        writeLog("状态已刷新。");
      } catch (e) {
        writeLog("刷新状态失败：" + (e.message || String(e)));
      }
    };

    // Tab 1 事件
    btnInitWs.onClick = function () {
      try {
        var res = Safety.initWorkspace({ createSnapshot: true });
        refreshGroupDropdown();
        writeLog(res.message);
      } catch (e) {
        writeLog("初始化工作区异常：" + (e.message || String(e)));
      }
    };

    btnMoveRef.onClick = function () {
      try {
        var res = SplitJointOps.moveSelectedToRef();
        writeLog(res.message);
      } catch (e) {
        writeLog("移入参考隔离区异常：" + (e.message || String(e)));
      }
    };

    btnRestoreBak.onClick = function () {
      try {
        var res = SplitJointOps.restoreSelectionFromBackup({
          targetGroupPath: P.trim(edtTargetGroup.text),
          baseName: P.trim(edtBaseName.text) || "restored"
        });
        writeLog(res.message);
      } catch (e) {
        writeLog("从原稿补提异常：" + (e.message || String(e)));
      }
    };

    function collectSplitOpts() {
      return {
        targetGroupPath: P.trim(edtTargetGroup.text),
        baseName: P.trim(edtBaseName.text) || "part",
        autoNumber: chkAutoNum.value,
        returnToSource: chkReturnSrc.value
      };
    }

    btnSplitCopy.onClick = function () {
      try {
        var res = SplitJointOps.splitSelection("copy", collectSplitOpts());
        writeLog(res.message);
      } catch (e) {
        writeLog("选区复制拆出异常：" + (e.message || String(e)));
      }
    };

    btnSplitCut.onClick = function () {
      try {
        var res = SplitJointOps.splitSelection("cut", collectSplitOpts());
        writeLog(res.message);
      } catch (e) {
        writeLog("选区剪切拆出异常：" + (e.message || String(e)));
      }
    };

    btnClipPreserve.onClick = function () {
      try {
        var res = SplitJointOps.splitClipChain("preserve", collectSplitOpts());
        writeLog(res.message);
      } catch (e) {
        writeLog("剪贴蒙版链拆出异常：" + (e.message || String(e)));
      }
    };

    btnClipMerge.onClick = function () {
      try {
        var res = SplitJointOps.splitClipChain("merge", collectSplitOpts());
        writeLog(res.message);
      } catch (e) {
        writeLog("剪贴蒙版链合并拆出异常：" + (e.message || String(e)));
      }
    };

    // Tab 2 事件
    btnToggleXRay.onClick = function () {
      try {
        var opVal = parseFloat(P.trim(edtXRayOpacity.text));
        var res = SplitJointOps.toggleXRay({
          xrayOpacity: isNaN(opVal) ? 35 : opVal
        });
        writeLog(res.message);
      } catch (e) {
        writeLog("X-Ray 切换异常：" + (e.message || String(e)));
      }
    };

    btnRunExtend.onClick = function () {
      try {
        var px = parseInt(P.trim(edtExtendPx.text), 10);
        var res = SplitJointOps.extendJoint({
          expandPx: isNaN(px) ? 10 : px,
          mode: rbBleed.value ? "bleed" : "caf"
        });
        writeLog(res.message);
      } catch (e) {
        writeLog("关节扩边补全异常：" + (e.message || String(e)));
      }
    };

    function runMatteMode(modeName) {
      try {
        var w = parseInt(P.trim(edtDefringePx.text), 10);
        var res = SplitJointOps.cleanEdgeMatte({
          mode: modeName,
          widthPx: isNaN(w) ? 1 : w,
          forceGlowLayer: chkForceGlow.value
        });
        writeLog(res.message);
      } catch (e) {
        writeLog("修边处理异常：" + (e.message || String(e)));
      }
    }

    btnDefringe.onClick = function () { runMatteMode("defringe"); };
    btnBlackMatte.onClick = function () { runMatteMode("blackMatte"); };
    btnWhiteMatte.onClick = function () { runMatteMode("whiteMatte"); };
    btnAlphaBleed.onClick = function () { runMatteMode("alphaBleed"); };

    // Tab 3 事件
    btnApplyTpl.onClick = function () {
      try {
        var idx = ddTemplate.selection ? ddTemplate.selection.index : 0;
        var tplId = tplList[idx] ? tplList[idx].id : "humanoid";
        var res = NamingOps.applySkeletonTemplate(tplId, {
          includeSlots: chkTplSlots.value
        });
        refreshGroupDropdown();
        writeLog(res.message);
      } catch (e) {
        writeLog("骨骼模板建组异常：" + (e.message || String(e)));
      }
    };

    function triggerTagAction(enableFlag) {
      try {
        var idx = ddTagKey.selection ? ddTagKey.selection.index : 0;
        var key = tagKeys[idx] || "bone";
        var val = P.trim(edtTagVal.text);
        var res = NamingOps.applySpineTag(key, val === "" ? null : val, enableFlag);
        refreshGroupDropdown();
        writeLog(res.message);
      } catch (e) {
        writeLog("标签操作异常：" + (e.message || String(e)));
      }
    }

    btnAddTag.onClick = function () { triggerTagAction(true); };
    btnRemoveTag.onClick = function () { triggerTagAction(false); };

    function getRenameScopeAndOpts() {
      var sIdx = ddRenScope.selection ? ddRenScope.selection.index : 0;
      var scope = sIdx === 1 ? "activeGroupChildren" : (sIdx === 2 ? "activeGroupDeep" : "selected");
      var seqText = P.trim(edtSeqStart.text);
      var seqNum = seqText !== "" ? parseInt(seqText, 10) : null;
      return {
        scope: scope,
        options: {
          prefix: edtPrefix.text || "",
          suffix: edtSuffix.text || "",
          regexPattern: edtRegexFind.text || "",
          regexFlags: "g",
          regexReplace: edtRegexRep.text || "",
          sequentialStart: (seqNum !== null && !isNaN(seqNum)) ? seqNum : undefined,
          swapLR: chkRenSwapLR.value,
          preserveTags: true
        }
      };
    }

    btnPreviewRen.onClick = function () {
      try {
        var cfg = getRenameScopeAndOpts();
        var res = NamingOps.previewBatchRename(cfg.scope, cfg.options);
        if (!res.ok) {
          writeLog("预览报错：" + res.errors.join("；"));
          return;
        }
        var samplePairs = [];
        var i;
        for (i = 0; i < res.items.length && samplePairs.length < 4; i++) {
          if (res.items[i].changed) {
            samplePairs.push(res.items[i].oldName + " -> " + res.items[i].newName);
          }
        }
        var summary = "预览：共 " + String(res.changedCount) + "/" + String(res.items.length) + " 项将变更";
        if (samplePairs.length > 0) {
          summary += "（示例: " + samplePairs.join(" | ") + "）";
        }
        if (res.conflicts.length > 0) {
          summary += "  [警告: 存在 " + String(res.conflicts.length) + " 处同级重名冲突!]";
        }
        writeLog(summary);
      } catch (e) {
        writeLog("预览异常：" + (e.message || String(e)));
      }
    };

    btnApplyRen.onClick = function () {
      try {
        var cfg = getRenameScopeAndOpts();
        var res = NamingOps.applyBatchRename(cfg.scope, cfg.options);
        refreshGroupDropdown();
        writeLog(res.message);
      } catch (e) {
        writeLog("批量重命名异常：" + (e.message || String(e)));
      }
    };

    btnQuickLR.onClick = function () {
      try {
        var res = NamingOps.quickSwapLR(true, true);
        refreshGroupDropdown();
        writeLog(res.message);
      } catch (e) {
        writeLog("L/R 互换异常：" + (e.message || String(e)));
      }
    };

    btnCloneSkin.onClick = function () {
      try {
        var mIdx = ddMeshStrat.selection ? ddMeshStrat.selection.index : 0;
        var mStrat = mIdx === 1 ? "linkToSource" : (mIdx === 2 ? "keep" : "unlink");
        var res = NamingOps.cloneSkinGroup(P.trim(edtSkinName.text), {
          meshStrategy: mStrat,
          pathStrategy: "strip",
          includeIgnored: false
        });
        refreshGroupDropdown();
        writeLog(res.message);
      } catch (e) {
        writeLog("皮肤克隆异常：" + (e.message || String(e)));
      }
    };

    btnClose.onClick = function () {
      win.close(0);
    };

    refreshGroupDropdown();
    win.center();
    win.show();

    return {
      ok: true,
      shown: true
    };
  }

  PSSplitter.UI.MainPanel = {
    show: show
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = PSSplitter.UI.MainPanel;
  }
})();
