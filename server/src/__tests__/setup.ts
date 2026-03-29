/**
 * Jest 测试设置文件
 * 在每个测试文件运行前执行的配置
 */

// 增加测试超时时间
jest.setTimeout(30000);

// 全局错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// 抑制特定警告（用于测试环境）
const originalWarn = console.warn;
const originalLog = console.log;

console.warn = (...args: any[]) => {
  // 忽略特定警告
  const message = args[0];
  if (
    typeof message === 'string' &&
    (message.includes('Failed to parse') ||
      message.includes('not found') ||
      message.includes('Failed to sync') ||
      message.includes('Failed to create') ||
      message.includes('syncEchoToGraph') ||
      message.includes('syncChapterToGraph') ||
      message.includes('syncForgeResult'))
  ) {
    return;
  }
  originalWarn.apply(console, args);
};

console.log = (...args: any[]) => {
  // 忽略特定日志
  const message = args[0];
  if (
    typeof message === 'string' &&
    (message.includes('syncEchoToGraph') ||
      message.includes('syncChapterToGraph') ||
      message.includes('syncForgeResult') ||
      message.includes('syncChaptersToGraph'))
  ) {
    return;
  }
  originalLog.apply(console, args);
};
