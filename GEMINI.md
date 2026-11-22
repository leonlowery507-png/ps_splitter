# Photoshop 拆补助手 (`ps_splitter`) 开发与自动同步规范

## 1. 强制自动同步流程 (Mandatory Auto-Sync to Photoshop)
每当修改 `ps_splitter` 下的任何源码（`src/**`）或 CEP 面板前端文件（`cep_panel/**`，包括 `index.html`、`css/style.css`、`js/panel.js`、`jsx/cep_bridge.js`）后，在向用户交付前**必须自动按顺序执行以下验证与部署步骤**：

1. **沙箱内运行自动化测试与 ES3 静态审计**（`BypassSandbox: false`）：
   - `npm.cmd --prefix e:\aiagent\Antigravity\ps_splitter test`
   - `node e:\aiagent\Antigravity\ps_splitter\tests\static_audit\run_audit.js`
2. **自动打包并同步到本机 Photoshop**（因需写入 `%APPDATA%\Adobe\CEP\extensions\com.spinesplitter.panel`、`Program Files` 脚本目录及 `HKCU` 注册表，单步设置 `BypassSandbox: true`）：
   - `powershell -NoProfile -ExecutionPolicy Bypass -File e:\aiagent\Antigravity\ps_splitter\scripts\install_ps_scripts.ps1`

## 2. 功能与技术红线 (Scope & Technical Guardrails)
- **功能边界**：仅聚焦 Photoshop 内部「拆图」与「补图」高痛点步骤，不添加 Spine 桥接功能（无 Spine 标签、骨骼模板、多皮肤克隆或合规体检）及普通快捷键可替代的基础功能。
- **兼容性边界**：
  - `src/**` 宿主与核心模块必须严格遵守 **ExtendScript ES3** 规范与 UTF-8 BOM 要求；
  - `cep_panel/**` 前端沿用 `tactile-darkroom-ui` 精密数字暗房美学，并兼容 **Photoshop 2022 CEP（Chromium 74+ 离线环境）**：零外网 CDN 依赖，禁止在 `display: flex` 上使用 `gap`，禁止使用 `inset`、`mask-composite`、`:has()`、`feTurbulence` 全屏动态滤镜及 ES2020+ 语法（如 `?.`、`??`、`replaceAll`）。
