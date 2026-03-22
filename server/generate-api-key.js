#!/usr/bin/env node

/**
 * API Key 生成工具
 * 用于生成安全的 API Key 供 .env 配置使用
 */

const crypto = require('crypto');

function generateApiKey(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

console.log('🔐 API Key 生成工具\n');
console.log('生成的 API Keys:\n');

// 生成 3 个 API Keys
const keys = [];
for (let i = 0; i < 3; i++) {
  const key = generateApiKey();
  keys.push(key);
  console.log(`Key ${i + 1}: ${key}`);
}

console.log('\n将以下行添加到你的 .env 文件中:\n');
console.log(`API_KEYS=${keys.join(',')}`);
console.log('\n提示: 请妥善保管这些密钥，不要提交到版本控制系统！');
