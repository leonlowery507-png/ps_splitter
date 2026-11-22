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
