// ============================================
// Ccoding - 启动脚本
// 职责：修复 ELECTRON_RUN_AS_NODE 环境变量后启动 Electron
// ============================================

// 某些 Electron 宿主环境（WorkBuddy、VS Code、Claude Code 等 IDE/Agent）
// 会向子进程注入 ELECTRON_RUN_AS_NODE=1，让 electron.exe 以「纯 Node」模式运行，
// 导致 require('electron') 返回路径字符串而非 API，app / BrowserWindow 全为 undefined。
// 这里在启动前删除该变量，确保 Electron 以桌面应用模式正常启动。
delete process.env.ELECTRON_RUN_AS_NODE;

const { spawn } = require('child_process');

// require('electron') 在纯 Node 环境返回 electron.exe 的路径字符串，正好用于启动
const electronPath = require('electron');

const child = spawn(electronPath, ['.'], { stdio: 'inherit', windowsHide: false });

child.on('close', (code) => {
  process.exit(code ?? 0);
});
