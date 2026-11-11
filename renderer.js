// ============================================
// Ccoding - 渲染进程（Renderer Process）
// 职责：处理界面交互（按钮点击、显示结果）
// ============================================

// 拿到界面上的「运行」按钮和「输出区」元素
const runBtn = document.getElementById('run-btn');
const output = document.getElementById('output');

// 监听按钮的点击事件
runBtn.addEventListener('click', () => {
  // v0.0.1：先用一段固定文本，模拟「编译并运行」的效果
  // 后续版本会真正调用 gcc 编译器，把这里替换成真实输出
  output.textContent = [
    '$ gcc main.c -o main',   // 模拟编译命令
    '编译成功！',              // 模拟编译结果
    '',
    'Hello, World!',          // 模拟程序输出
  ].join('\n');
});
