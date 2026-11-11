# Ccoding 开发日志

> 记录每一次开发的进展、决策和遇到的问题，按时间倒序排列。

## 2026-11-11

### v0.0.2 编辑器与文件操作（已完成）

- 接入 Monaco 编辑器（npm 安装 `monaco-editor`，AMD loader 方式，延续无打包器决策）
- 新增 `preload.js`（contextBridge 安全桥），`main.js` 加 `ipcMain.handle` 实现打开/保存文件
- `index.html` 重构为工具栏 + 编辑器布局；`renderer.js` 初始化 Monaco + 绑定新建/打开/保存
- 安全：`contextIsolation=true`、`nodeIntegration=false`、CSP 允许 blob worker 和 data 字体
- 达成标准：窗口内显示 C 代码编辑器（语法高亮），可新建/打开/保存 `.c` 文件

### v0.0.1 起步（已完成）

- 完成项目骨架：`package.json`、`.npmrc`（国内镜像）、`.gitignore`
- 实现主进程 `main.js`（创建窗口）与渲染进程 `index.html` + `renderer.js`（点击「运行」显示模拟编译结果）
- 新增 `start.js` 启动脚本（修复 ELECTRON_RUN_AS_NODE 环境变量）
- Electron 版本：33.4.11（成熟稳定版）
- 达成标准：打开窗口 → 点击「运行」→ 显示 `Hello, World!`

### 踩坑记录：ELECTRON_RUN_AS_NODE=1

- 现象：`npm start` 报 `app.whenReady is not a function`，`require('electron')` 返回路径字符串而非 API
- 根因：WorkBuddy（Electron 应用）向子进程注入 `ELECTRON_RUN_AS_NODE=1`，让 electron.exe 以纯 Node 模式运行
- 修复：`start.js` 里 `delete process.env.ELECTRON_RUN_AS_NODE` 后再 spawn Electron

### 项目立项背景（回顾）

- 项目定位：替代 DEV-C++ 的 C 语言教学 IDE，Windows 优先
- 技术栈：Electron + Monaco + clangd + MinGW-w64(GCC/GDB)
- 开源协议：GPL-3.0
- 仓库：https://github.com/Baobug/Ccoding.git
