# SpineSplitter (`ps_splitter`) — Spine 2D Photoshop 拆图辅助脚本工具集

> **定位**：面向日常 Spine 2D 角色/道具拆图生产工作流的 **Photoshop 前置辅助脚本工具**（无缝衔接下游官方导出脚本 `PhotoshopToSpine.jsx` 与 Spine 4.2+ `Import PSD`）。

---

## 一、核心功能概览（定向精简版 + 全量规则内核）

### 1. 精细选区拆图与原稿保护
- **原稿只读快照保护 (`SRC_BACKUP [ignore]`)**：一键初始化安全工作区，自动将原画备份置底、隐藏、全锁定并打上 `[ignore]` 标签；尝试对备份层执行剪切时自动阻断；支持随时按选区从备份层无损补提像素。
- **参考草图防导出隔离 (`__REF__ [ignore]`)**：一键将三视图、线稿、色卡移入顶层隔离区，彻底解决官方脚本默认 `ignoreHiddenLayers = false` 将隐藏草图全部导出成废 PNG 的痛点。
- **选区快速拆出并自动归组 (`Copy / Cut & Route`)**：套索框选后一键复制/剪切拆为独立图层，自动路由至指定骨骼/槽位组、自动顺延编号（`_01, _02`）、阻止空选区产生废层，并支持**拆出后自动切回源图层**以便连续套索作业。
- **复合剪贴蒙版链联动拆出 (`Smart Clip-Chain Split`)**：针对“1 个底色剪影层 + 多个上方阴影/高光剪贴蒙版”的高频画法，支持按选区**保留完整剪贴蒙版链结构拆出**或**安全合并为干净单图拆出**，原剪贴链 100% 无损。

### 2. 关节补全与边缘修边防护
- **遮挡区 X-Ray 半透明透视参照**：一键将遮挡层切换为半透明（默认 `35%`），自动在会话中记忆原始不透明度，再次触发即可精准还原。
- **关节末端外延扩边与智能补全 (`Joint Extend`)**：支持对框选关节缺口或图层边缘向外扩展 `2~64 px`，提供 **智能内容识别填充 (CAF)** 与 **8 方向柔和像素外扩固色 (全版本 PS 零依赖稳定降级)** 双模式，防止动画旋转穿帮露缝。
- **去黑/白边与 Alpha Bleed 周边固色**：集成去边 (`Defringe`)、移去黑/白杂边 (`Remove Black/White Matte`) 与不改变半透明轮廓的 `Alpha Bleed` 周边固色；**自动识别并跳过 `LINEARDODGE` / `SCREEN` 等发光混合模式层**，防止洗坏光效。

### 3. 图层命名与 Spine 层级组织
- **4 套标准化角色骨骼模板增量建组**：内置 `humanoid`（标准人形）、`chibi`（Q版二头身）、`quadruped`（四足兽类）、`portrait`（半身立绘），严格遵循前景到背景遮挡序，增量合并跳过已有组，不破坏已拆图层。
- **Spine 官方 12 标签可视化装配与校验**：严格遵循全小写无多余空格标准（`bone`, `slot`, `skin`, `folder`, `merge`, `ignore`, `trim`, `mesh`, `scale`, `name`, `path`, `overlay`），自动拦截 `[notrim]`、普通层误挂 `[merge]`/`[name:]` 等错误，并提供 `v7.04` / `v7.42` 版本兼容提醒。
- **Tag-Aware 批量重命名与 L/R 对称互换**：支持前缀、后缀、正则替换、递增序号与一键 `L/R`（左/右）对称互换，**全程自动保护 `[...]` 标签区**不被破坏，并在执行前拦截同级重名冲突。
- **多皮肤/换装目录同构克隆**：一键将现有皮肤组同构克隆为新皮肤目录，自动拒绝保留字 `default`、跳过 `[ignore]`、剥离会导致磁盘贴图互相覆盖的 `[path:]` 标签，并支持 `[mesh]` 独立解绑或跨皮肤链接。

---

## 二、精简双轨入口（1 个主面板 + 5 个高频快捷键脚本）

| 脚本入口文件 (`src/entries/`) | 类型 | 推荐绑定快捷键 | 功能说明 |
|---|---|---|---|
| `SpineSplitter_Panel.jsx` | 整合主面板 | `F1` 或菜单启动 | 打开 3-Tab 可视化中文主控台（涵盖全部拆图、补全、模板、标签、重命名与皮肤克隆功能） |
| `01_Split_Copy.jsx` | 原子快捷脚本 | `F2` | 将当前选区**复制拆出**并自动归入上次设定的目标组、顺延命名并切回源层 |
| `02_Split_Cut.jsx` | 原子快捷脚本 | `F3` | 将当前选区**剪切拆出**并自动归组（自带 `SRC_BACKUP [ignore]` 防切保护） |
| `03_Split_ClipChain.jsx` | 原子快捷脚本 | `F4` | 将当前选区内的**基底 + 全部上方剪贴蒙版链**联动拆出并重建剪贴关系 |
| `04_Joint_Extend.jsx` | 原子快捷脚本 | `F5` | 对当前图层或框选关节缺口执行**外延扩边与智能补色** |
| `05_Toggle_XRay.jsx` | 原子快捷脚本 | `F6` | 一键**切换/还原**当前选中图层的 X-Ray 半透明透视状态 |

> 所有修改操作均包裹在 `activeDocument.suspendHistory()` 单步事务中，按一次 `Ctrl + Z` 即可完整无损撤回。

---

## 三、快速安装与运行测试

### 1. 安装到 Photoshop
- **方式 A（直接浏览运行，免安装）**：在 Photoshop 中打开 PSD 文档，点击菜单 **「文件 > 脚本 > 浏览...」**，选择本目录下的 `src/entries/SpineSplitter_Panel.jsx` 即可立刻使用。
- **方式 B（一键安装到 Photoshop 脚本菜单）**：
  - 右键以管理员身份运行 `scripts\install_ps_scripts.bat`（或执行 `powershell -ExecutionPolicy Bypass -File scripts\install_ps_scripts.ps1`）；
  - 脚本会自动将 6 个入口部署至 Photoshop 的 `Presets\Scripts\SpineSplitter\`，并将内部库封装为 `.jsxinc`（不污染脚本菜单）；重启 Photoshop 后即可在 **「文件 > 脚本」** 菜单直接看到并录制动作快捷键。

### 2. 运行自动化验证（Node.js 零外部依赖）
```powershell
node --test tests/static_audit/*.test.js tests/unit/*.test.js
# 或
npm.cmd test
```

---

## 四、目录结构与文档导航

- `docs/FUNCTIONAL_SPEC.md`：完整功能规划、官方 12 标签实证与 10 条准出契约规格书
- `docs/ARCHITECTURE.md`：三层解耦系统架构与模块契约说明书
- `docs/USER_GUIDE.md`：安装部署、PS Actions 快捷键录制图解步骤与日常拆图 SOP
- `src/core/`：9 个纯 ES3 核心逻辑模块（零宿主依赖）
- `src/host/`：4 个 Photoshop 宿主适配模块（ActionManager + 安全事务 + 3 大功能域回写）
- `src/ui/`：3-Tab 整合 ScriptUI 主控台 (`main_panel.js`)
- `src/entries/`：6 个 Photoshop 可执行 `.jsx` 入口
- `scripts/`：Windows 一键部署脚本 (`.bat` / `.ps1`)
- `tests/`：ES3 静态语法/UTF-8 BOM 审计与 49 项自动化单元测试
