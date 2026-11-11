// ============================================
// Ccoding - 渲染进程（Renderer Process）
// 职责：初始化 Monaco 编辑器，处理新建 / 打开 / 保存
// ============================================

let editor = null;          // Monaco 编辑器实例
let currentFilePath = null; // 当前文件路径（null 表示还没保存过）

// 新用户默认看到的 C 代码模板
const DEFAULT_CODE = [
  '#include <stdio.h>',
  '',
  'int main() {',
  '    printf("Hello, World!\\n");',
  '    return 0;',
  '}',
  '',
].join('\n');

// 更新标题栏右侧显示的文件名
function updateFileName(name) {
  document.getElementById('file-name').textContent = name;
}

// 初始化 Monaco 编辑器
require.config({ paths: { vs: './node_modules/monaco-editor/min/vs' } });

require(['vs/editor/editor.main'], function () {
  editor = monaco.editor.create(document.getElementById('editor'), {
    value: DEFAULT_CODE,
    language: 'c',              // C 语言语法高亮
    theme: 'vs-light',          // 浅色主题
    fontSize: 16,               // 大字号，教学 / 投影友好
    automaticLayout: true,      // 窗口大小变化时自动调整布局
    minimap: { enabled: false },// 关闭缩略图（教学场景用不上）
    scrollBeyondLastLine: false,
  });

  updateFileName('未命名.c');
});

// ===== 新建：清空为默认模板 =====
document.getElementById('btn-new').addEventListener('click', () => {
  editor.setValue(DEFAULT_CODE);
  currentFilePath = null;
  updateFileName('未命名.c');
});

// ===== 打开：弹出对话框选择文件，读入编辑器 =====
document.getElementById('btn-open').addEventListener('click', async () => {
  const result = await window.ccoding.openFile();
  if (result) {
    editor.setValue(result.content);
    currentFilePath = result.filePath;
    updateFileName(result.filePath);
  }
});

// ===== 保存：把编辑器内容写入文件 =====
document.getElementById('btn-save').addEventListener('click', async () => {
  const content = editor.getValue();
  const defaultName = currentFilePath || 'main.c';
  const savedPath = await window.ccoding.saveFile(content, defaultName);
  if (savedPath) {
    currentFilePath = savedPath;
    updateFileName(savedPath);
  }
});

// ===== 编译并运行 =====
const outputPanel = document.getElementById('output-panel');
const outputPre = document.getElementById('output');
const outputStatus = document.getElementById('output-status');

// 显示输出面板，并根据结果类型标记状态
function showOutput(text, kind) {
  outputPanel.style.display = 'flex';
  outputPre.textContent = text;
  if (kind === 'success') {
    outputStatus.textContent = '运行成功';
    outputStatus.className = 'ok';
  } else if (kind === 'error') {
    outputStatus.textContent = '编译失败';
    outputStatus.className = 'err';
  } else {
    outputStatus.textContent = '';
    outputStatus.className = '';
  }
}

document.getElementById('btn-run').addEventListener('click', async () => {
  if (!editor) return; // 编辑器还没初始化好，忽略点击
  const code = editor.getValue();

  outputPanel.style.display = 'flex';
  outputStatus.textContent = '编译运行中…';
  outputStatus.className = '';
  outputPre.textContent = '正在编译运行，请稍候…';

  const result = await window.ccoding.compileRun(code);

  if (!result.success) {
    showOutput(result.compileOutput || result.error, 'error');
  } else {
    const compileInfo = result.compileOutput ? '编译输出：\n' + result.compileOutput + '\n\n' : '';
    const runInfo = result.runOutput || '（程序无输出）';
    showOutput(compileInfo + '运行输出：\n' + runInfo, 'success');
  }
});

// 清空 / 收起输出面板
document.getElementById('btn-clear-output').addEventListener('click', () => {
  outputPre.textContent = '';
  outputStatus.textContent = '';
  outputStatus.className = '';
  outputPanel.style.display = 'none';
});
