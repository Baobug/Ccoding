// ============================================
// Ccoding - 主进程（Main Process）
// 职责：创建窗口、管理应用生命周期
// ============================================

// 从 Electron 引入 app（应用）和 BrowserWindow（浏览器窗口）
const { app, BrowserWindow } = require('electron');

// 创建主窗口
function createWindow() {
  const win = new BrowserWindow({
    width: 1000,       // 窗口宽度（像素）
    height: 700,       // 窗口高度（像素）
    title: 'Ccoding',  // 窗口标题
  });

  // 加载界面文件（index.html 属于"渲染进程"）
  win.loadFile('index.html');
}

// 当 Electron 应用准备就绪后执行
app.whenReady().then(() => {
  createWindow();

  // macOS 特有：点击 Dock 图标时若没有窗口，则重新创建一个
  // （Windows 上这段不会触发，留着是跨平台的好习惯）
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// 当所有窗口都关闭时退出应用
// （macOS 的习惯是窗口关了应用还在，所以 macOS 不退出）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
