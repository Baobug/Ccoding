// ============================================
// Ccoding - 预加载脚本（Preload）
// 职责：在主进程和渲染进程之间建立安全的通信桥梁
// ============================================

const { contextBridge, ipcRenderer } = require('electron');

// 通过 contextBridge 向渲染进程暴露一个安全、受限的 API
// 渲染进程只能通过 window.ccoding 调用这些方法，
// 无法直接访问 Node / Electron 的底层能力（安全隔离）
contextBridge.exposeInMainWorld('ccoding', {
  // 打开文件：弹出系统对话框，返回 { filePath, content } 或 null（取消）
  openFile: () => ipcRenderer.invoke('open-file'),

  // 保存文件：弹出系统对话框，写入内容，返回保存路径或 null（取消）
  saveFile: (content, defaultName) => ipcRenderer.invoke('save-file', content, defaultName),

  // 编译并运行：把代码发给主进程，编译运行后返回 { success, compileOutput, runOutput }
  compileRun: (code) => ipcRenderer.invoke('compile-run', code),
});
