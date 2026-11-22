# `ps_splitter` 系统技术架构与工程基线说明书（Architecture）

> **文档版本**：1.0.0（Milestone M1 Baseline）  
> **项目根目录**：`e:\aiagent\Antigravity\ps_splitter`  
> **核心运行时**：Adobe Photoshop ExtendScript（ECMAScript 3 / CS6 ~ CC 2025+） & Node.js `v24.17.0`（零第三方依赖测试验证环境）

---

## 1. 系统总体分层解耦架构（Snapshot Tree Pattern）

### 1.1 设计原则与单向依赖拓扑
为突破 ExtendScript 与 Photoshop 宿主耦合导致“无法自动化测试、无法脱离 PS 校验规则”的传统困境，`ps_splitter` 采用 **Snapshot Tree Pattern（虚拟文档快照树模式）**，强制执行严格的三层单向依赖架构：

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ 入口与界面层：src/entries/*.jsx (10 个)  &  src/ui/main_panel.js (1 个)    │
│  • 职责：顶层顺序 #include、文档打开守卫、采集 UI 选项、调用 Host 事务        │
│  • 约束：允许调用 Core 只读格式化工具；严禁内联复杂业务算法或直接拼装 AM 描述符 │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ 触发事务 / 传递选项
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 宿主适配层：src/host/*.js (6 个)                                         │
│  • 职责：唯一允许访问 PS DOM 与 ActionManager 的层                        │
│  • 流程：PS activeDocument ──▶ VirtualDoc 快照 ──▶ Core 规划 ──▶ layerID 回写│
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ 仅传纯 JSON 数据与计划对象
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 纯 ES3 逻辑内核：src/core/*.js (9 个)                                     │
│  • 职责：标签解析、命名规则、模板树、皮肤映射、几何计算、剪贴拓扑、体检与净身计划│
│  • 硬约束：零 PS DOM / AM / ScriptUI / $ / File / Folder 全局依赖          │
│  • 100% 可在 Node.js v24.17.0 下脱离 Photoshop 运行确定性单测与沙箱 E2E     │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 全仓库目录结构规划（对齐 `PROJECT.md § Code Layout`）

```text
ps_splitter/
├── package.json                        # 零外部依赖工程清单，提供 npm.cmd test (node --test) 与审计命令
├── README.md                           # 项目总览、V1/V2 范围、快速开始与目录说明
├── docs/
│   ├── FUNCTIONAL_SPEC.md              # 功能规划（6 大功能域 + 12 标签 + R01~R10 + V1/V2+ 边界）
│   ├── ARCHITECTURE.md                 # 分层解耦架构、VirtualDoc 契约、ES3 基线与三层验证体系
│   └── USER_GUIDE.md                   # 安装部署、PS Actions 快捷键录制指南、日常拆图 SOP 与 FAQ
├── src/
│   ├── core/                           # 【M2 拥有】纯 ES3 逻辑内核（9 个模块，零宿主依赖）
│   │   ├── polyfill_es3.js
│   │   ├── spine_tags.js
│   │   ├── naming_engine.js
│   │   ├── skeleton_templates.js
│   │   ├── skin_mapper.js
│   │   ├── alignment_math.js
│   │   ├── clip_chain_resolver.js
│   │   ├── preflight_validator.js
│   │   └── sanitize_planner.js
│   ├── host/                           # 【M3 拥有】Photoshop 宿主适配层（6 个模块，DOM + AM）
│   │   ├── ps_am.js
│   │   ├── ps_snapshot.js
│   │   ├── ps_splitter_ops.js
│   │   ├── ps_compat_ops.js
│   │   ├── ps_hierarchy_ops.js
│   │   └── ps_sanitizer.js
│   ├── ui/                             # 【M4 拥有】ScriptUI 模态主控台（1 个模块）
│   │   └── main_panel.js
│   └── entries/                        # 【M4 拥有】PS 可执行入口（1 主控台 + 9 原子脚本 = 10 个）
│       ├── SpineSplitter_Panel.jsx
│       ├── 00_Init_Workspace.jsx
│       ├── 01_Split_Copy.jsx
│       ├── 02_Split_Cut.jsx
│       ├── 03_Split_ClipChain.jsx
│       ├── 04_Joint_Extend.jsx
│       ├── 05_Clean_Edge_Matte.jsx
│       ├── 06_Toggle_Ghost_Ref.jsx
│       ├── 07_Mirror_LR_Swap.jsx
│       └── 08_Preflight_Check.jsx
├── scripts/                            # 【M4 拥有】一键部署助手
│   ├── install_ps_scripts.bat
│   └── install_ps_scripts.ps1
└── tests/
    ├── static_audit/                   # 【M2 + M5】ES3 严格语法审计 & #include 闭合与依赖方向校验
    ├── unit/                           # 【M2/M3/M4】各层单元测试
    └── e2e/                            # 【E2E Track / M5】node:vm Mock PS 沙箱 Tier 1-5 E2E 套件
```

### 1.3 各层模块职责与接口契约总表

#### A. `src/core/`（9 个纯 ES3 模块 —— **Hard Contract，严格对齐 `PROJECT.md § Interface Contracts 3`**）

| 模块文件 | 挂载命名空间 | 精确对外函数签名与返回值契约 |
|---|---|---|
| `polyfill_es3.js` | `PSSplitter.Core.Polyfill` | • `trim(s)` -> `string`<br>• `startsWith(s, prefix)` -> `boolean`<br>• `endsWith(s, suffix)` -> `boolean`<br>• `indexOf(arr, item)` -> `number`<br>• `map(arr, fn)` -> `Array`<br>• `filter(arr, fn)` -> `Array`<br>• `forEach(arr, fn)` -> `void`<br>• `keys(obj)` -> `string[]`<br>• `isArray(v)` -> `boolean`<br>• `clone(obj)` -> `any`（深拷贝）<br>• `jsonStringify(val)` -> `string` |
| `spine_tags.js` | `PSSplitter.Core.SpineTags` | • `OFFICIAL_TAGS`: `["bone","slot","skin","folder","merge","ignore","overlay","trim","mesh","scale","name","path"]`<br>• `parseLayerName(rawName, isGroup)` -> `{ rawName, cleanName, tags: [{ key, value, raw }], invalidTags: [], errors: [] }`<br>• `formatLayerName(cleanName, tags, position /* "suffix"\|"prefix" */)` -> `string`<br>• `toggleOrSetTag(rawName, isGroup, tagKey, tagValue, enable)` -> `{ ok, name, error }`<br>• `stripAllTags(rawName)` -> `string` |
| `naming_engine.js` | `PSSplitter.Core.NamingEngine` | • `validateAttachmentName(baseName)` -> `{ valid, sanitized, errors }`（校验非法字符 `[\\:"*?<>\|]`、`.png` 尾部、纯点 `/^\.+$/`、`__drag`、Windows 保留名 `CON/PRN/AUX/NUL/COM0-9/LPT0-9`、长度 `<=255`）<br>• `swapLR(name, preserveTags)` -> `{ changed, name }`（成对互换 `_L/_R`, `_l/_r`, `L_/R_`, `.L/.R`, `Left/Right`, `左/右`，且保护 `[...]` 标签区不变）<br>• `batchRenamePlan(nodes, options)` -> `{ items: [{ id, oldName, newName, changed }], conflicts: [{ name, ids }] }`（`options`: `prefix`, `suffix`, `regexPattern`, `regexFlags`, `regexReplace`, `sequentialStart`, `swapLR`, `preserveTags`） |
| `skeleton_templates.js` | `PSSplitter.Core.SkeletonTemplates` | • `listTemplates()` -> `[{ id, name, description }]`（含 `humanoid`, `chibi`, `quadruped`, `portrait`）<br>• `buildHierarchyPlan(templateId, options, existingDoc)` -> `{ operations: [{ type: "createGroup", path, name, parentPath, tags }] }`（增量合并，跳过已存在组） |
| `skin_mapper.js` | `PSSplitter.Core.SkinMapper` | • `validateSkinName(skinName)` -> `{ valid, errors }`（拒绝 `"default"` 不区分大小写及非法路径）<br>• `buildSkinClonePlan(sourceSkinNode, targetSkinName, options)` -> `{ ok, errors, rootName, operations: [...] }` |
| `alignment_math.js` | `PSSplitter.Core.AlignmentMath` | • `calcMirrorDelta(bounds, axisX)` -> `{ targetCenterX, deltaX, targetBounds }`<br>• `calcSymmetryDeviation(boundsL, boundsR, axisX)` -> `{ deltaX, deltaY, fixForR: { dx, dy } }`<br>• `calcNineGridOffset(sourceBounds, targetBounds, anchor /* "CC"\|"TL"\|"TC"\|"TR"\|"CL"\|"CR"\|"BL"\|"BC"\|"BR" */)` -> `{ dx, dy }`<br>• `calcSafeCanvasBounds(docWidth, docHeight, layerBoundsList, padding)` -> `{ bounds: [l, t, r, b], changed }` |
| `clip_chain_resolver.js` | `PSSplitter.Core.ClipChainResolver` | • `findClipChain(siblingNodes, selectedIndex)` -> `{ ok, baseIndex, baseNode, clipIndices, clipNodes, error }`（向上连续收集紧邻 `grouped === true` 子层） |
| `preflight_validator.js` | `PSSplitter.Core.PreflightValidator` | • `validateDocument(virtualDoc, options)` -> `{ passed, summary: { errors, warnings, infos }, issues: [{ code, severity, layerId, layerName, path, message, autoFixable, fixAction }], exportStats: { attachmentCount, caseInsensitivePaths: [] } }`（覆盖 R01~R10；存在任意 `ERROR` 时 `passed === false`） |
| `sanitize_planner.js` | `PSSplitter.Core.SanitizePlanner` | • `buildSanitizePlan(virtualDoc, preflightReport, policy)` -> `{ requiresBackupSnapshot, steps: [{ action, layerIds, params, description }] }` |

#### B. `src/host/`（6 个宿主适配模块 —— **M1 推荐细化契约**）

> **硬契约与细化推荐区分**：上述 `src/core/` 9 个模块的函数签名属于 `PROJECT.md` 规定的**不可变更硬契约**；下表 `src/host/` 的导出函数名属于 M1 为确保结构清晰给出的**推荐工程接口**（M3 可按宿主内部协作需要做局部扩展，但不得破坏单向分层、`PSSplitter.Host` 根命名空间与 `layerID` 回写原则）。

| 模块文件 | 挂载命名空间 | 推荐对外函数与职责 |
|---|---|---|
| `ps_am.js` | `PSSplitter.Host.AM` | 语言无关 ActionManager 原语：`s2t(str)`, `c2t(char4)`, `t2s(id)`, `hasSelection()`, `copyToLayer()` (`CpTL`), `cutToLayer()` (`CtTL`), `newLayerBelow(name)`, `mergeLayers()` (`Mrg2`), `rasterizeLayer(layerId)`, `setClippingMask(layerId, enable)` (`GrpL`/`Ungr`), `removeBlackMatte()`, `removeWhiteMatte()`, `defringe(px)`, `contentAwareFill()`, `getRulerOrigin()`, `setRulerOrigin(x, y)`, `selectLayerById(layerId)`, `addLayerToSelectionById(layerId)`, `setLayerVisible(layerId, v)`, `setLayerLocked(layerId, locked)` |
| `ps_snapshot.js` | `PSSplitter.Host.Snapshot` | 文档快照与安全事务：`captureVirtualDoc(doc)`, `hasBackupGroup(doc)`, `ensureBackupSnapshot(doc, options)`, `ensureRefGroup(doc)`, `runWithSafety(doc, title, fn, args)`（封装 `Units.PIXELS` 恢复、`suspendHistory` 全局槽与异常历史回滚） |
| `ps_splitter_ops.js` | `PSSplitter.Host.SplitterOps` | 拆图与补全操作：`splitSelection(mode /* "copy"\|"cut" */, options)`, `splitClipChain(mode /* "preserve"\|"merge" */, options)`, `toggleGhostRef(options)`, `extendJoint(options)`, `cleanEdgeMatte(options)` |
| `ps_compat_ops.js` | `PSSplitter.Host.CompatOps` | 属性兼容与清理：`flattenLayerCompat(layerId)`, `bakeLayerEffects(layerId)`, `applyBlendModeFix(planItem)`, `cleanEmptyAndDebris(plan)`, `cropOvershoot(layerIds)`, `trimCanvasSafe(padding)` |
| `ps_hierarchy_ops.js` | `PSSplitter.Host.HierarchyOps` | 结构化与对齐落地：`applyHierarchyPlan(plan)`, `applyTagChange(layerId, tagKey, tagValue, enable)`, `applyBatchRename(plan)`, `applySkinClone(plan)`, `mirrorLRAndSwap(options)`, `createPivotGuide(options)`, `alignNineGrid(options)` |
| `ps_sanitizer.js` | `PSSplitter.Host.Sanitizer` | 体检与净身编排：`runPreflight(options)`, `focusIssueLayer(layerId)`, `executeSanitizePlan(plan, options)`（含强制 `SRC_BACKUP [ignore]` 确认与清洗后自动复检） |

#### C. `src/ui/` & `src/entries/`（1 个界面模块 + 10 个可执行入口）

| 层级 | 文件清单 | 职责与执行契约 |
|---|---|---|
| **UI** (`1 个`) | `src/ui/main_panel.js` | 挂载 `PSSplitter.UI.MainPanel.show()`：构建 `new Window("dialog", ...)` 模态主控台，包含 6 大功能域分页标签页（拆图与保护 / 补全与修边 / 命名与模板 / 皮肤与对齐 / 属性兼容与清理 / 体检与净身）。 |
| **Entries** (`1 + 9 = 10 个`) | 1. `SpineSplitter_Panel.jsx`（主控台入口）<br>2. `00_Init_Workspace.jsx`<br>3. `01_Split_Copy.jsx`<br>4. `02_Split_Cut.jsx`<br>5. `03_Split_ClipChain.jsx`<br>6. `04_Joint_Extend.jsx`<br>7. `05_Clean_Edge_Matte.jsx`<br>8. `06_Toggle_Ghost_Ref.jsx`<br>9. `07_Mirror_LR_Swap.jsx`<br>10. `08_Preflight_Check.jsx` | 均以 `#target photoshop` 声明宿主，通过顶层扁平相对 `#include` 依次载入 `core -> host -> ui`；执行前检查 `app.documents.length === 0`（无打开文档时友好弹窗返回，不抛异常）；原子入口统一经 `runWithSafety` 包裹单步撤回事务。 |

### 1.4 全局命名空间 `PSSplitter` 与双加载规范模板

#### 1. 跨环境双加载标准模板（CommonJS + ExtendScript `#include` + `node:vm`）
所有 `src/core/*.js`（以及无需 Node `require` 也可复用的辅助模块）必须遵守以下幂等模板，保证同时在 Photoshop `#include`（无 `module`/`require`，共享 `$.global`）、Node.js 单元测试 `require()`（独立 CommonJS 模块作用域，通过 `global` 共享根对象）与 `node:vm` 共享全局沙箱下无缝运行；若 `src/host/*.js` 或 `src/ui/*.js` 需在 CommonJS 单元测试模式下运行，**也必须在文件顶部对上游 `Core`/`Host` 依赖采用相同的 `if (!Dep && typeof require === "function")` 按需回退解析**，不得假设在 CommonJS 局部作用域内 `PSSplitter` 已自动包含全部跨文件依赖：

```javascript
/* 必须以 UTF-8 with BOM 保存，严格 ES3 语法 */
var __psRoot = (typeof global !== "undefined") ? global : ((typeof $ !== "undefined" && $.global) ? $.global : this);
__psRoot.PSSplitter = __psRoot.PSSplitter || {};
var PSSplitter = __psRoot.PSSplitter;
PSSplitter.Core = PSSplitter.Core || {};
PSSplitter.Host = PSSplitter.Host || {};
PSSplitter.UI = PSSplitter.UI || {};

(function (root) {
    /* 幂等防重复加载守卫：防止多次 #include 或重复 require 覆盖已有状态 */
    if (root.Core.SpineTags) {
        if (typeof module !== "undefined" && module.exports) {
            module.exports = root.Core.SpineTags;
        }
        return;
    }

    /* 跨环境依赖解析：在 #include/vm 下读全局，在 CommonJS 单测下按需 require */
    var Polyfill = root.Core.Polyfill;
    if (!Polyfill && typeof require === "function") {
        Polyfill = require("./polyfill_es3.js");
    }

    var OFFICIAL_TAGS = [
        "bone", "slot", "skin", "folder", "merge", "ignore",
        "overlay", "trim", "mesh", "scale", "name", "path"
    ];

    /* ... 纯 ES3 实现 ... */

    var api = {
        OFFICIAL_TAGS: OFFICIAL_TAGS
        /* ... */
    };

    root.Core.SpineTags = api;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(PSSplitter);
```

#### 2. 顶层入口扁平 `#include` 规范
ExtendScript 的 `#include` **仅接收字面量字符串**，路径**相对于包含该语句的文件所在目录**解析，且原生没有 `#pragma once`。因此规定：
- **禁止**在 `src/core/*.js` 或 `src/host/*.js` 内部互相写 `#include`；
- **统一由 `src/entries/*.jsx`** 在文件顶部按依赖拓扑自底向上扁平顺序 `#include`（`polyfill_es3.js` -> 其余 `core/*.js` -> `ps_am.js` -> `ps_snapshot.js` -> 其余 `host/*.js` -> `main_panel.js`）。

---

## 2. `VirtualDoc` 与 `VirtualNode` 快照契约

### 2.1 `VirtualDoc` 字段全量定义

| 字段名 | 类型 | 取值域 / 格式 | 边界默认值 | 采集来源与语义规范 |
|---|---|---|---|---|
| `name` | `string` | 非空文件名，如 `"hero.psd"` | `"Untitled"` | `decodeURI(doc.name)` |
| `saved` | `boolean` | `true \| false` | `false` | 当 `doc.saved === true` 且读取 `doc.path` 不抛异常时为 `true`（未保存触发 R01 `ERROR`） |
| `path` | `string \| null` | `/` 分隔绝对路径 | `null`（未保存时） | 将 `decodeURI(doc.path.fsName)` 中 `\` 统一规范为 `/` |
| `width` | `number` | 正数（px） | `> 0` | 强制在 `Units.PIXELS` 下读取 `doc.width.as("px")` |
| `height` | `number` | 正数（px） | `> 0` | 强制在 `Units.PIXELS` 下读取 `doc.height.as("px")` |
| `mode` | `string` | `"RGB" \| "CMYK" \| "GRAYSCALE" \| "INDEXED" \| "BITMAP" \| "LAB" \| "DUOTONE" \| "MULTICHANNEL" \| "UNKNOWN"` | `"UNKNOWN"` | 从 `DocumentMode.*` 映射；非 `"RGB"` 触发 R01 |
| `bitsPerChannel` | `number` | `8 \| 16 \| 32` | `8` | 从 `BitsPerChannelType.*` 映射；非 `8` 触发 R01 |
| `rulerOrigin` | `object` | `{ x: number, y: number }`（px） | `{ x: 0, y: 0 }` | AM 读取 `Dcmn/Ordn/Trgt` 的 `cID("RlrH") / 65536` 与 `cID("RlrV") / 65536` |
| `hasSelection` | `boolean` | `true \| false` | `false` | 通过 `try { var b = doc.selection.bounds; ... } catch (e)` 安全探测，杜绝 Error 1302 |
| `selectionBounds` | `number[4] \| null` | `[left, top, right, bottom]`（px） | `null`（无选区时） | 仅 `hasSelection === true` 时读取 `[b[0].as("px"), b[1].as("px"), b[2].as("px"), b[3].as("px")]` |
| `totalLayerCount` | `number` | 非负整数 `>= 0` | `0` | 递归统计全文档 `ArtLayer` + `LayerSet` 总数；`>= 500` 时触发 R08 警告并禁用 `rasterizeAll()` |
| `hasArtboards` | `boolean` | `true \| false` | `false` | 任意节点 `isArtboard === true` 时置 `true`，触发 R01 阻断 |
| `layers` | `VirtualNode[]` | 从上到下有序数组（index `0` 为最顶层） | `[]` | 树形镜像文档顶层 `layers` 集合 |

### 2.2 `VirtualNode` 字段全量定义

| 字段名 | 类型 | 取值域 / 格式 | 边界默认值 | 采集来源与边界判定原则 |
|---|---|---|---|---|
| `id` | `number` | PS 持久化唯一整数 `layerID` (`>= 1`) | 合法正整数 | **必须取 AM `sID("layerID")`**；严禁使用在增删移动层后会漂移的 `itemIndex` |
| `name` | `string` | 原始图层/组名称 | `""` | 原样采集，**禁止提前 trim 空格或改写大小写**（以保证 R03 能抓出 `[ bone]`/`[Bone]`） |
| `type` | `string` | `"ArtLayer" \| "LayerSet"` | `"ArtLayer"` | AM `layerSection`（`layerSectionStart` -> `"LayerSet"`，`layerSectionContent` -> `"ArtLayer"`） |
| `kind` | `string` | `"NORMAL" \| "SMARTOBJECT" \| "TEXT" \| "SOLIDFILL" \| "GRADIENTFILL" \| "PATTERNFILL" \| "LEVELS" \| "CURVES" \| "HUESATURATION" \| "BRIGHTNESSCONTRAST" \| "COLORBALANCE" \| "EXPOSURE" \| "BLACKANDWHITE" \| "PHOTOFILTER" \| "CHANNELMIXER" \| "COLORLOOKUP" \| "INVERT" \| "POSTERIZE" \| "THRESHOLD" \| "GRADIENTMAP" \| "SELECTIVECOLOR" \| "VIDEO" \| "LAYER3D" \| "GROUP" \| "UNKNOWN"` | `"GROUP"`（组）/ `"NORMAL"` | 映射 DOM `LayerKind.*` 或 AM `layerKind`；所有调整层映射为对应非 `"NORMAL"` 字符串 |
| `visible` | `boolean` | `true \| false` | `true` | AM `visible` |
| `allLocked` | `boolean` | `true \| false` | `false` | AM `layerLocking.protectAll`（或 DOM `allLocked`） |
| `opacity` | `number` | `0..100` | `100` | 四舍五入整数 `Math.round(opacity)` |
| `blendMode` | `string` | 大写枚举：`"NORMAL" \| "MULTIPLY" \| "SCREEN" \| "LINEARDODGE" \| "OVERLAY" \| "SOFTLIGHT" \| ...` | `"NORMAL"` | 统一转大写标准化，仅前 4 项受 Spine 原生支持 |
| `grouped` | `boolean` | `true \| false` | `false` | `true` 表示作为剪贴蒙版附着于紧邻下方基底图层（AM 键 `group` / DOM `grouped`） |
| `hasLayerEffects` | `boolean` | `true \| false` | `false` | AM `desc.hasKey(sID("layerEffects"))` 且存在启用的效果 |
| `hasUserMask` | `boolean` | `true \| false` | `false` | AM `hasUserMask` |
| `hasVectorMask` | `boolean` | `true \| false` | `false` | AM `hasVectorMask` |
| `isBackground` | `boolean` | `true \| false` | `false` | AM `background`（语言无关，不判断 `"Background"`/`"背景"` 名称） |
| `isArtboard` | `boolean` | `true \| false` | `false` | AM `artboardEnabled` |
| `bounds` | `number[4]` | `[left, top, right, bottom]`（px） | `[0, 0, 0, 0]` | 含 FX 视觉扩展包围盒；**空图层强制归一化为 `[0, 0, 0, 0]`** |
| `boundsNoEffects` | `number[4]` | `[left, top, right, bottom]`（px） | `[0, 0, 0, 0]` | 不含样式的纯像素包围盒；不支持读取时回退至 `bounds` |
| `isEmpty` | `boolean` | `true \| false` | `true`（空层） | 对 `ArtLayer`：`boundsNoEffects`（回退 `bounds`）满足 `right <= left \|\| bottom <= top` 为 `true`；对 `LayerSet`：`children.length === 0` 或所有子孙均 `isEmpty === true` 时标 `true` |
| `children` | `VirtualNode[]` | 仅 `LayerSet` 拥有 | `[]` | 从上到下有序数组（`index 0` 为组内最顶层） |

### 2.3 面板索引方向、`ClipChainResolver` 双向定位与持久化回写原则

```text
VirtualDoc.layers / VirtualNode.children 索引方向（与 PS 图层面板视觉一致）：
  index 0 :  [ArtLayer]  高光_clip    (grouped: true)   ◀─┐
  index 1 :  [ArtLayer]  阴影_clip    (grouped: true)   ◀─┼─ 剪贴蒙版子层（index 更小，位于上方）
  index 2 :  [ArtLayer]  手臂底色_base (grouped: false)  ◀─┘  基底图层（index 更大，位于下方）
  index 3 :  [ArtLayer]  躯干_other   (grouped: false)
```

1. **面板从上到下递增索引方向**：数组下标 `0` 始终对应 PS 图层面板视觉最上方，`length - 1` 对应最下方。
2. **`ClipChainResolver.findClipChain(siblingNodes, selectedIndex)` 双向定位与边界自洽规则**：
   - **前置边界检查**：若 `siblingNodes` 非数组，或 `selectedIndex` 非整数/越界（`typeof selectedIndex !== "number" || isNaN(selectedIndex) || selectedIndex % 1 !== 0 || selectedIndex < 0 || selectedIndex >= siblingNodes.length`），立即返回 `{ ok: false, baseIndex: -1, baseNode: null, clipIndices: [], clipNodes: [], error: "Invalid selectedIndex" }`。
   - **步骤 1（向下寻基与基底有效性统一校验）**：若 `siblingNodes[selectedIndex].grouped === true`，从 `selectedIndex + 1` 开始向**下标增大方向（面板下方）**扫描，寻找第一个 `grouped === false` 的同级节点作为候选 `baseIndex`；若直到数组末尾仍未找到 `grouped === false` 基底，说明是**悬空剪贴蒙版**，立即返回 `{ ok: false, baseIndex: -1, baseNode: null, clipIndices: [], clipNodes: [], error: "Dangling clipping mask without base layer" }`。若选中节点自身 `grouped === false`，则候选 `baseIndex = selectedIndex`。
   - **基底空节点/空组一致性拒绝**：无论入口选中的是上方剪贴层（向下寻基）还是直接选中非 `grouped` 节点本身，**只要最终定位到的 `baseNode` 为无效空组（`type === "LayerSet" && isEmpty === true`）或无有效像素的空图层（`isEmpty === true`），均应一致返回 `{ ok: false, baseIndex: -1, baseNode: null, clipIndices: [], clipNodes: [], error: "Base layer or group is empty" }`**；反之，只要 `baseNode` 为非空 `ArtLayer` 或非空 `LayerSet`（`grouped === false && isEmpty === false`），均允许作为合法基底。
   - **步骤 2（向上收链）**：从 `baseIndex - 1` 开始向**下标减小方向（面板上方）**连续收集所有 `grouped === true` 的紧邻同级节点（含设为剪贴蒙版的 `ArtLayer` 或 `LayerSet`），直到遇到 `grouped === false` 或到达 `index 0` 为止；若合法基底上方没有任何 `grouped === true` 剪贴层，则返回 `{ ok: true, baseIndex: baseIndex, baseNode: siblingNodes[baseIndex], clipIndices: [], clipNodes: [], error: null }`。
   - **步骤 3（顺序输出约定）**：收集到的 `clipIndices` 与 `clipNodes` 统一按**面板从上到下递增序**排列（即 `[topClipIndex, ..., baseIndex - 1]`），与 `siblingNodes` 索引顺序保持完全一致，便于 Host 层按从上到下或逆序重建剪贴链。
3. **持久化 `layerID` 回写原则**：Photoshop 图层的 `itemIndex` 在任何新增、删除、移动或合层操作后都会即时位移失效。因此 `Core` 生成的一切计划（重命名、体检定位、净身动作）**一律以持久化 `VirtualNode.id`（即 PS AM `layerID`）作为唯一锚点**，Host 执行前通过 `AM.selectLayerById(id)` 精确选定目标。

---

## 3. ES3 严格语法工程基线与 ExtendScript/PS 十大防坑机制

### 3.1 ES3 严格语法与原生 API 禁用清单

所有位于 `src/` 下交付给 Photoshop 运行的 `.js`/`.jsx`/`.jsxinc` 源码必须 **100% 符合 ECMAScript 3 (ES3)**，静态审计器将对以下清单执行零容忍拦截：
- **禁用语法**：`let`, `const`, `class`, `extends`, `super`, 箭头函数 `=>`, 模板字符串 `` ` ``, 解构赋值（`var {a} = x` / `[a, b] = y`）, 函数默认参数, 扩展/剩余运算符 `...`, `for..of`, `async`/`await`, `yield`, `import`/`export`, 对象属性/方法简写（`{ a, fn() {} }`）, 计算属性名 `{ [k]: 1 }`, 对象与数组**尾逗号**（`{ a: 1, }`、`[1, 2,]`）, `0b`/`0o` 字面量, 数字分隔符 `1_000`, 无参数 `catch {}`（必须写成 `catch (e) {}`）, 正则 `y`/`u`/`s` 标志。
- **禁用未 polyfill 原生 API**：
  - `Array.prototype.{map, filter, forEach, reduce, reduceRight, every, some, indexOf, lastIndexOf, find, findIndex, includes, flat}`, `Array.isArray`；
  - `String.prototype.{trim, trimStart, trimEnd, startsWith, endsWith, includes, repeat, padStart, padEnd}`；
  - `Object.{keys, values, entries, assign, create, freeze, defineProperty}`；
  - 全局对象/API：`JSON.{parse, stringify}`, `Map`, `Set`, `WeakMap`, `WeakSet`, `Promise`, `Symbol`, `Proxy`, `Reflect`, `console.*`。
  - *所有上述常用工具均通过 `PSSplitter.Core.Polyfill`（`src/core/polyfill_es3.js`）提供纯 ES3 实现。*

### 3.2 ExtendScript / Photoshop 十大工程防坑规范与代码级对策

| # | 坑点领域 | 失效表现与底层机理 | 强制工程对策（`src/host/` 代码级落地标准） |
|---|---|---|---|
| **1** | **`doc.suspendHistory()` 作用域隔离与状态刷新** | `suspendHistory(title, codeStr)` 通过独立字符串 `eval` 执行，**外层闭包变量完全不可见**；结束瞬间立即读 `activeHistoryState` 可能因异步 UI 未刷而滞后；异常中断若未清理全局槽会引发防重入失效与闭包滞留。 | 通过全局槽 `PSSplitter.Host._pendingTask = { fn: fn, args: args }` 传参，向 `suspendHistory` 传入固定字符串 `"PSSplitter.Host._runPendingTask();"`；`_runPendingTask` 与外层 `runWithSafety` 均使用 `try { ... } finally { PSSplitter.Host._pendingTask = null; }` 清理全局槽；外层异常回滚前必须判断 `if (doc.activeHistoryState !== prevState) { doc.activeHistoryState = prevState; }`，避免无变更时错退上一步历史；关键节点显式调用 `app.refresh()` 同步历史状态：```javascript
PSSplitter.Host._runPendingTask = function () {
    var t = PSSplitter.Host._pendingTask;
    try {
        if (t && t.fn) {
            t.fn.apply(null, t.args || []);
        }
    } finally {
        PSSplitter.Host._pendingTask = null;
    }
};
``` |
| **2** | **标尺单位污染 (`rulerUnits`)** | 用户习惯将 PS 标尺设为厘米、英寸或百分比，导致 `UnitValue` 或裸像素坐标严重错位。 | 所有读取尺寸、选区、裁切、移动与画布操作必须外包 `try...finally` 恢复：```javascript
var savedUnits = app.preferences.rulerUnits;
app.preferences.rulerUnits = Units.PIXELS;
try { /* 业务逻辑 */ } finally { app.preferences.rulerUnits = savedUnits; }
``` |
| **3** | **标尺原点 (`rulerOrigin`) AM `/ 65536` 读写** | PS DOM 无 `rulerOrigin` 属性，若假设 `(0,0)` 在左上角将使 Pivot 与对称/导出基准错位；旧版 `>> 16` 截断小数精度。 | 对齐 `PhotoshopToSpine.jsx v7.42 L1449-1455`：通过 `ActionReference` 获取 `Dcmn/Ordn/Trgt`，读取 `cID("RlrH") / 65536` 与 `cID("RlrV") / 65536`；参考线与位置提示显式考虑 `originX`/`originY`。 |
| **4** | **无选区访问 (`Error 1302`)** | 无选区状态下直接访问 `doc.selection.bounds` 或执行 `CpTL`/`CtTL` 立刻抛出 `Error 1302 ("No such element")`。 | 封装 `AM.hasSelection(doc)` 安全探测；`Split_Copy`/`Split_Cut` 前先检测并捕获空像素选区异常：```javascript
function hasSelection(doc) {
    try {
        var b = doc.selection.bounds;
        return !!(b && b.length === 4);
    } catch (e) { return false; }
}
``` |
| **5** | **空文档 `doc.trim()` 崩溃防护** | 对全透明图层或无像素文档调用 `doc.trim(TrimType.TRANSPARENT)` 直接崩溃报错 *"Could not trim because this would create an empty document"*。 | **严禁直接调用不带检查的 `trim(TrimType.TRANSPARENT)`**。画布收缩统一先经 `Core.AlignmentMath.calcSafeCanvasBounds()` 计算有效像素联合包围盒，仅当 `changed === true` 且宽高 `> 0` 时在 `try...catch` 内执行 `doc.crop(...)`。 |
| **6** | **`rasterizeAll()` `>= 500` 层失效** | 官方源码明确注记：文档图层数 `>= 500` 时 `sID("rasterizeAll")` **静默失效**，导致智能对象与矢量层漏栅格化。 | **严禁依赖全局 `rasterizeAll()`**。`ps_compat_ops.js` 始终按虚拟树遍历目标导出图层，针对 `SMARTOBJECT`/`TEXT`/矢量填充层**逐层调用 `AM.rasterizeLayer(layerId)`**，保障任意规模 PSD 100% 生效。 |
| **7** | **图层样式 (FX) `newLayerBelow + Mrg2` 烘焙** | 直接调用 `rasterizeLayer(layerStyle)` 在含填充不透明度、挖空或混合选项时极易失真丢效果。 | 对齐 `PhotoshopToSpine.jsx v7.42 L1879-1900`：选中目标层 -> 若有直属剪贴层按策略先行处理 -> `AM.newLayerBelow(name)` (`Mk  `, `below: true`) -> 向上连选原层与新空层 -> `AM.mergeLayers()` (`Mrg2`) 完成无损样式烘焙。 |
| **8** | **语言无关 `cID` / `sID` 调用规范** | 中文版 PS 背景层名称为 `"背景"`、动作名本地化；硬编码英文/中文字符串跨语言必崩。 | 所有底层动作与属性键一律使用 `charIDToTypeID` (`cID`) 与 `stringIDToTypeID` (`sID`)（如 `cID("CpTL")`, `cID("CtTL")`, `cID("Mrg2")`, `sID("layerEffects")`, `sID("layerID")`），背景层判定读取 AM `background` 布尔键。 |
| **9** | **`colorSamplers` 4 个上限防爆** | PS 文档最多允许 4 个颜色取样器，超过即报错，且在纯透明区取色易抛异常。 | 关节扩边与 Alpha Bleed 固色完全采用 **选区扩展 + CAF + 多层复制 `Mrg2` 推实 Alpha**（零采样器消耗）；若未来扩展需用取样器，必须前置断言 `doc.colorSamplers.length < 4` 并于 `finally` 立即清除新建采样器。 |
| **10** | **`UTF-8 with BOM` 编码与扁平 `#include`** | 中文 Windows 下无 BOM UTF-8 文件会被 ExtendScript 按 GBK/ANSI 解码引发乱码甚至引号截断语法错；嵌套 `#include` 易相对路径错乱与重复执行。 | 全仓库 `.js`/`.jsx`/`.jsxinc` 统一以 **`UTF-8 with BOM` (`EF BB BF`)** 保存；`#include` 仅由 `src/entries/*.jsx` 顶层扁平按序引用，配合各模块幂等守卫，静态审计层强制校验 BOM 与路径闭合。 |

---

## 4. 基于 Node.js `v24.17.0` 零外部依赖的三层客观验证架构

鉴于生产目标宿主为本地桌面软件 Adobe Photoshop 且本机工具链无第三方 AST/Lint 依赖，`ps_splitter` 基于本地原生 **Node.js `v24.17.0`**（`node:test`, `node:vm`, `node:assert/strict`, `node:fs`, `node:path`）构建**零外部 npm 依赖**的三层自动化客观验证流水线：

```text
┌──────────────────────────────────────────────────────────────────────┐
│ 第一层：静态审计层 (tests/static_audit/)                              │
│  UTF-8 BOM 检查 ─▶ ExtendScript 指令预处理 ─▶ ES3 Tokenizer ─▶       │
│  new vm.Script() ─▶ #include 路径闭合与单向分层依赖校验               │
└──────────────────────────────────┬───────────────────────────────────┘
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 第二层：Core 单元测试层 (tests/unit/)                                 │
│  node:test + node:assert/strict ─▶ 确定性覆盖 9 个 Core 模块全部边界  │
└──────────────────────────────────┬───────────────────────────────────┘
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 第三层：node:vm Mock PS 沙箱 E2E 层 (tests/e2e/)                      │
│  主动屏蔽 ES5+ 全局与原型方法的 vm 沙箱 ─▶ 高保真 PS DOM/AM/ScriptUI  │
│  模拟器 ─▶ 完整工作流 E2E ─▶ 独立于被测源码的 R01~R10 契约验证器       │
└──────────────────────────────────────────────────────────────────────┘
```

### 4.1 第一层：ES3 静态审计与 `#include` 闭合校验（`tests/static_audit/`）
1. **UTF-8 BOM 校验与剥离**：检查每个源码文件头部字节是否包含 `0xEF 0xBB 0xBF`（含非 ASCII 中文文案的文件强制要求 BOM），解析前剥离 BOM。
2. **ExtendScript 指令预处理**：扫描 `#target`、`#include "..."`、`#script`、`//@include` 指令，记录全部 `#include` 依赖路径清单并将其原地替换为等长注释行（保持报错行号 1:1 对齐）。
3. **ES3 词法扫描器（Tokenizer）+ `new vm.Script`**：
   - Tokenizer 精确跳过单行注释 `//`、块注释 `/* */`、单/双引号字符串与正则字面量，随后强拦截第 3.1 节列出的全部 ES5+/ES6+ 关键字、箭头函数、模板字符串、对象/数组尾逗号、无参 `catch` 及未 polyfill 的现代方法调用；
   - 通过 Node 原生 `new vm.Script(preprocessedCode, { filename })` 捕获基础词法、括号配对与语法结构错误。
4. **`#include` 闭合与分层依赖校验**：
   - 以 10 个 `src/entries/*.jsx` 为根节点解析全部 `#include` 相对路径，断言目标文件真实存在、加载顺序严格遵循 `polyfill -> core -> host -> ui`、无循环包含；
   - 断言 `src/core/*.js` 源码内**零** `app`、`activeDocument`、`ActionDescriptor`、`ActionReference`、`executeAction`、`Window`、`File`、`Folder` 等宿主关键词引用。

### 4.2 第二层：Core 单元测试层（`tests/unit/`）
使用 `node:test` (`describe`, `it`) 与 `node:assert/strict` 对 `src/core/` 全部 9 个模块进行输入输出断言，重点覆盖高危边界：
- `SpineTags`：12 标签全小写严格匹配、`[Bone]`/`[ ignore]`/`[notrim]`/`[trim:FALSE]`/`[scale]` 缺冒号/`[ignore:x]` 多余冒号拦截、`[merge]`/`[name:*]` 仅限 Group 校验；
- `NamingEngine`：Windows 保留设备名、`__drag`、`/.png$/` 风险名提醒、`swapLR` 在 `preserveTags=true` 下保护 `[slot:arm_L]` 标签区不被误改、同级命名冲突表输出；
- `AlignmentMath`：镜像目标坐标与对称偏差精度 `< 0.5px`、9 宫格全部 9 个锚点偏移量、空输入下 `calcSafeCanvasBounds` 返回 `{ changed: false }`；
- `ClipChainResolver`：多级连挂剪贴链从上到下递增序输出、悬空剪贴层/空组或空图层基底/越界 `selectedIndex` 一致返回 `{ ok: false }`、无剪贴层合法非空节点返回 `{ ok: true, clipIndices: [], clipNodes: [] }`；
- `PreflightValidator`：完整覆盖 R01~R10（含跨槽位大小写不敏感 `attachmentPath` 碰撞、`>=500` 层预警、`[bone]` 顶层空层漂移、`[mesh:target]` 非 `default` 皮肤与 `[folder]` 内完整前缀索引及循环引用、`[skin:/...]` 与内部前导 `/` 冲突、`[name:pattern]` 展开后保留名校验时序与非法字符逃逸拦截）；
- `SanitizePlanner`：无备份快照强制置 `requiresBackupSnapshot = true`、清洗步骤顺序确定性。

### 4.3 第三层：严格裁剪 ES5+ 的 `node:vm` Mock PS 沙箱 E2E 层（`tests/e2e/`）
1. **运行时 ES3 降级沙箱与跨 Realm 隔离规范**：
   - 使用 `vm.createContext(sandbox)` 构造独立 V8 Context 执行环境，在沙箱自身 Realm 内部**主动删除或屏蔽** `Map`, `Set`, `Promise`, `JSON`, `Symbol`, `Proxy`, `Reflect`, `console`，并在沙箱自身的 `Array.prototype` / `String.prototype` / `Object` 上屏蔽 `Array.prototype.{map,filter,forEach,indexOf,includes,...}`、`String.prototype.{trim,startsWith,endsWith,...}`、`Object.keys` 等 ES5+ 方法——**任何绕过 `Polyfill` 的隐式 ES5+ 调用在 E2E 运行期将立刻抛出 `TypeError` 暴露缺陷**。
   - **严禁污染外层宿主原型**：绝对禁止将外层 Node.js 进程的 `Array`、`String`、`Object` 构造器直接注入 `vm` `sandbox` 后修改其原型（否则会直接破坏外层 Node 测试进程自身运行时，导致 `node:util.inspect` 等内部模块报 `TypeError: ctx.seen.includes is not a function` 崩溃）。
   - **沙箱内夹具构造与重建（防原型逃逸）**：由于 V8 中每个 `vm` Context 拥有独立的内置原型链，若直接将外层 Node Realm 创建的对象/数组引用传入沙箱函数，其上的 `.map()`/`.indexOf()` 将绕过沙箱原型屏蔽逃逸检测。因此规定：**所有 Mock PS 宿主返回的数据结构（`VirtualDoc`、`layers`、`bounds` 等数组与对象）以及测试用例传入沙箱被测函数的全部输入夹具，必须在沙箱 Realm 内部构造（或经沙箱内深拷贝/重建函数转换为沙箱 Realm 原型对象）**。
   - **外层断言跨 Realm 脱壳规范化**：从沙箱返回给外层测试的返回值持有沙箱 Realm 的 `Object.prototype`/`Array.prototype`，直接调用 `node:assert/strict.deepStrictEqual` 会因跨 Realm 原型不等触发 `AssertionError: Values have same structure but are not reference-equal`。因此外层测试在执行 `assert.deepStrictEqual` 比对前，**必须先对沙箱返回值执行跨 Realm 脱壳规范化**（例如在外层测试断言侧调用递归纯对象克隆函数或 `JSON.parse(JSON.stringify(val))`；注意 `JSON` 仅在外层测试断言侧使用，沙箱 Realm 内部仍严格保持屏蔽 `JSON`）。
2. **高保真 Photoshop 宿主陷阱模拟器**：
   - `doc.selection.bounds`：无选区状态访问立即精确抛出 `Error 1302`；
   - `doc.trim(TrimType.TRANSPARENT)`：空图层/空文档调用立即抛异常；
   - `doc.suspendHistory(title, codeStr)`：在沙箱顶层独立求值 `codeStr`，**严格隔离外层局部闭包变量**，验证 `_pendingTask` 机制正确性；
   - `doc.colorSamplers`：超过 4 个采样器立即报错；
   - 完整模拟 `ActionDescriptor` / `ActionReference` / `executeAction` / `executeActionGet`（支持 `CpTL`, `CtTL`, `Mk  `, `Mrg2`, `RlrH`/`RlrV`, `layerID`, `layerEffects`, `rasterizeLayer` 等）及 `Window("dialog")` ScriptUI 控件事件。
3. **独立于被测代码的前置契约断言器**：
   - 在 `tests/e2e/` 中构建完全独立于 `src/core/preflight_validator.js` 的 **`PhotoshopToSpine.jsx` R01~R10 独立验证器**，对端到端模拟场景（脏 PSD 原稿 -> 备份初始化 -> 选区/剪贴链拆分 -> 扩边固色 -> 模板建组与多皮肤克隆 -> 9 宫格对齐 -> 一键净身）产出的最终文档树做不透明盒验证。

### 4.4 本地测试执行命令规范
在项目根目录 `e:\aiagent\Antigravity\ps_splitter` 下（注意规避 Windows PowerShell 默认执行策略对 `npm.ps1` 的拦截）：
- 运行全部静态审计 + 单元测试 + 沙箱 E2E 测试：
  ```powershell
  node --test
  ```
  或：
  ```powershell
  npm.cmd test
  ```
- 分层单独执行：
  ```powershell
  node --test tests/static_audit/*.test.js
  node --test tests/unit/*.test.js
  node --test tests/e2e/*.test.js
  ```
