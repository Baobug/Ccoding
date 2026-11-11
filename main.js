// ============================================
// Ccoding - 主进程（Main Process）
// 职责：创建窗口、管理应用生命周期、处理文件读写
// ============================================

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

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

// ===== 工具：查找 gcc 编译器 =====
// 依次尝试：系统 PATH → 常见安装目录 → winget 包目录
function findGcc() {
  // 1. 优先用系统 PATH 里的 gcc
  try {
    const out = execSync('where gcc', { encoding: 'utf-8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
    for (const line of out.split(/\r?\n/)) {
      const p = line.trim();
      if (/gcc\.exe$/i.test(p) && fs.existsSync(p)) return p;
    }
  } catch (e) { /* PATH 里没有 */ }

  // 2. 扫描常见安装目录
  const home = os.homedir();
  const roots = [
    path.join(__dirname, 'tools', 'mingw64'), // 项目自带编译器（最高优先级，开箱即用）
    path.join(home, 'AppData', 'Local', 'Programs', 'WinLibs'),
    path.join(home, 'scoop', 'apps'),
    'C:\\Program Files\\WinLibs',
    'C:\\Program Files\\mingw64',
    'C:\\mingw64',
    'C:\\msys64\\mingw64',
  ];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const found = findFileDeep(root, 'gcc.exe', 4);
    if (found) return found;
  }

  // 3. winget 包目录（WinLibs 可能被 winget 装到这里）
  const wg = path.join(home, 'AppData', 'Local', 'Microsoft', 'WinGet', 'Packages');
  if (fs.existsSync(wg)) {
    try {
      for (const d of fs.readdirSync(wg)) {
        if (/winlibs/i.test(d)) {
          const found = findFileDeep(path.join(wg, d), 'gcc.exe', 6);
          if (found) return found;
        }
      }
    } catch (e) { /* 忽略 */ }
  }

  return null;
}

// 在目录下递归查找指定文件名（限制深度，避免扫到海量文件）
function findFileDeep(dir, filename, maxDepth) {
  if (maxDepth < 0) return null;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return null; }
  for (const e of entries) {
    if (e.isFile() && e.name.toLowerCase() === filename.toLowerCase()) {
      return path.join(dir, e.name);
    }
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      const found = findFileDeep(path.join(dir, e.name), filename, maxDepth - 1);
      if (found) return found;
    }
  }
  return null;
}

// ===== 工具：执行命令，捕获输出 =====
function runCommand(cmd, args, cwd, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, windowsHide: true });
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      try { child.kill(); } catch (e) { /* 忽略 */ }
    }, timeoutMs);

    child.stdout.on('data', (d) => { stdout += d.toString('utf-8'); });
    child.stderr.on('data', (d) => { stderr += d.toString('utf-8'); });

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ exitCode: -1, output: err.message, timedOut: false });
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      const output = [stdout, stderr].filter(Boolean).join('\n');
      resolve({ exitCode: code, output, timedOut });
    });
  });
}

// ===== IPC：编译并运行 =====
// 渲染进程调用 window.ccoding.compileRun(code) 时触发
ipcMain.handle('compile-run', async (event, code) => {
  const gcc = findGcc();
  if (!gcc) {
    return {
      success: false,
      compileOutput: '',
      runOutput: '',
      error: '未检测到 gcc 编译器。\n请先安装 MinGW-w64，例如在命令行执行：\n  winget install BrechtSanders.WinLibs.POSIX.UCRT',
    };
  }

  // 在系统临时目录下创建固定的工作目录，每次编译覆盖 main.c
  const workDir = path.join(os.tmpdir(), 'ccoding');
  try { fs.mkdirSync(workDir, { recursive: true }); } catch (e) { /* 忽略 */ }

  const srcPath = path.join(workDir, 'main.c');
  const exePath = path.join(workDir, 'main.exe');

  fs.writeFileSync(srcPath, code, 'utf-8');

  // 1. 编译（UTF-8 编码，开启常见警告帮助新手发现问题）
  const compile = await runCommand(
    gcc,
    ['main.c', '-o', 'main.exe', '-finput-charset=UTF-8', '-fexec-charset=UTF-8', '-Wall'],
    workDir,
    30000
  );

  if (compile.exitCode !== 0) {
    const msg = compile.timedOut
      ? '编译超时（超过 30 秒）'
      : (compile.output || `编译失败（退出码 ${compile.exitCode}）`);
    return { success: false, compileOutput: msg, runOutput: '', error: '编译失败' };
  }

  // 2. 运行（10 秒超时，防止死循环卡死界面）
  const run = await runCommand(exePath, [], workDir, 10000);

  if (run.timedOut) {
    return {
      success: true,
      compileOutput: compile.output || '编译成功',
      runOutput: '[程序运行超过 10 秒，已被强制停止]\n\n' + (run.output || ''),
      error: '',
    };
  }

  return {
    success: true,
    compileOutput: compile.output || '编译成功',
    runOutput: run.output,
    error: '',
  };
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
