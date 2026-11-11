// ============================================
// Ccoding - 主进程（Main Process）
// 职责：创建窗口、管理应用生命周期、处理文件读写
// ============================================

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

// 创建主窗口
function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    title: 'Ccoding',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // 预加载脚本
      contextIsolation: true,  // 开启上下文隔离（安全）
      nodeIntegration: false,  // 关闭 Node 集成（安全）
    },
  });

  win.loadFile('index.html');
}

// ===== IPC：打开文件 =====
// 渲染进程调用 window.ccoding.openFile() 时触发
ipcMain.handle('open-file', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: '打开文件',
    filters: [
      { name: 'C/C++ 源文件', extensions: ['c', 'h', 'cpp', 'hpp', 'txt'] },
      { name: '所有文件', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });

  // 用户取消或没选文件
  if (canceled || filePaths.length === 0) return null;

  const filePath = filePaths[0];
  const content = fs.readFileSync(filePath, 'utf-8');
  return { filePath, content };
});

// ===== IPC：保存文件 =====
// 渲染进程调用 window.ccoding.saveFile(content, name) 时触发
ipcMain.handle('save-file', async (event, content, defaultName) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: '保存文件',
    defaultPath: defaultName || 'main.c',
    filters: [{ name: 'C 源文件', extensions: ['c'] }],
  });

  if (canceled || !filePath) return null;

  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
});

// 当 Electron 应用准备就绪后执行
app.whenReady().then(() => {
  createWindow();

  // macOS 特有：点击 Dock 图标时若没有窗口，则重新创建一个
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// 当所有窗口都关闭时退出应用（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
