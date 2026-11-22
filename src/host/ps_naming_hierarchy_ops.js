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
