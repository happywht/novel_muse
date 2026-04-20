#!/usr/bin/env node

/**
 * 可访问性快速验证脚本
 * Accessibility Quick Verification Script
 *
 * 用途：快速检查可访问性实现是否正确部署
 */

const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileExists(filePath) {
  const fullPath = path.join(projectRoot, filePath);
  const exists = fs.existsSync(fullPath);
  return exists;
}

function checkFileContains(filePath, content) {
  const fullPath = path.join(projectRoot, filePath);
  if (!fs.existsSync(fullPath)) return false;
  const fileContent = fs.readFileSync(fullPath, 'utf-8');
  return fileContent.includes(content);
}

// 验证清单
const checks = [
  {
    name: 'useFocusTrap Hook',
    category: '核心功能',
    check: () => checkFileExists('hooks/useFocusTrap.ts'),
  },
  {
    name: '可访问性工具函数',
    category: '核心功能',
    check: () => checkFileExists('utils/accessibility.ts'),
  },
  {
    name: '可访问性CSS样式',
    category: '样式',
    check: () => checkFileExists('styles/accessibility.css'),
  },
  {
    name: 'Sidebar键盘事件处理',
    category: '组件增强',
    check: () => checkFileContains('components/Sidebar.tsx', 'handleKeyDown'),
  },
  {
    name: 'Sidebar ARIA标签',
    category: '组件增强',
    check: () => checkFileContains('components/Sidebar.tsx', 'aria-label="主导航"'),
  },
  {
    name: 'Sidebar焦点管理',
    category: '组件增强',
    check: () => checkFileContains('components/Sidebar.tsx', 'useEffect'),
  },
  {
    name: 'App模态框焦点陷阱',
    category: '组件增强',
    check: () => checkFileContains('App.tsx', 'useFocusTrap'),
  },
  {
    name: 'App模态框ARIA属性',
    category: '组件增强',
    check: () => checkFileContains('App.tsx', 'role="dialog"'),
  },
  {
    name: '主内容ID标识',
    category: '语义化',
    check: () => checkFileContains('App.tsx', 'id="main-content"'),
  },
  {
    name: 'Skip Link实现',
    category: '可访问性',
    check: () => checkFileContains('index.html', 'skip-link'),
  },
  {
    name: '焦点可视指示器',
    category: '可访问性',
    check: () => checkFileContains('index.html', 'focus-visible'),
  },
  {
    name: '可访问性CSS引入',
    category: '样式',
    check: () => checkFileContains('index.html', '/styles/accessibility.css'),
  },
  {
    name: '测试指南文档',
    category: '文档',
    check: () => checkFileExists('docs/ACCESSIBILITY_TESTING_GUIDE.md'),
  },
  {
    name: '组件示例文档',
    category: '文档',
    check: () => checkFileExists('docs/ACCESSIBILITY_COMPONENTS.md'),
  },
  {
    name: '可访问性README',
    category: '文档',
    check: () => checkFileExists('docs/ACCESSIBILITY_README.md'),
  },
];

// 按类别分组
const categories = {};
checks.forEach((check) => {
  if (!categories[check.category]) {
    categories[check.category] = [];
  }
  categories[check.category].push(check);
});

// 运行验证
console.log('\n' + '='.repeat(60));
log('🔍 Muse 小说架构师 - 可访问性验证', 'cyan');
log('   Accessibility Verification', 'cyan');
console.log('='.repeat(60) + '\n');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

Object.entries(categories).forEach(([category, checks]) => {
  log(`\n📁 ${category}`, 'blue');
  console.log('-'.repeat(60));

  checks.forEach((check) => {
    totalChecks++;
    const passed = check.check();
    if (passed) {
      passedChecks++;
      log(`  ✅ ${check.name}`, 'green');
    } else {
      failedChecks++;
      log(`  ❌ ${check.name}`, 'red');
    }
  });
});

// 总结
console.log('\n' + '='.repeat(60));
log('📊 验证结果摘要', 'cyan');
console.log('='.repeat(60));

log(`\n总检查项: ${totalChecks}`, 'yellow');
log(`通过: ${passedChecks}`, 'green');
log(`失败: ${failedChecks}`, failedChecks > 0 ? 'red' : 'green');

const successRate = ((passedChecks / totalChecks) * 100).toFixed(1);
log(`成功率: ${successRate}%`, successRate >= 80 ? 'green' : 'yellow');

if (failedChecks === 0) {
  log('\n🎉 所有可访问性检查通过！', 'green');
  log('✨ 您的应用已准备好进行可访问性测试。\n', 'green');
  process.exit(0);
} else {
  log('\n⚠️  部分检查未通过，请查看上方详情。', 'yellow');
  log('📖 请参考 docs/ACCESSIBILITY_README.md 进行修复。\n', 'yellow');
  process.exit(1);
}
