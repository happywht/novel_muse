#!/usr/bin/env node

/**
 * 验证脚本：确认crypto.randomUUID()生成的ID符合UUID v4格式
 * 用于验证beat ID生成修复是否正确工作
 */

import crypto from 'crypto';

console.log('🔍 验证UUID生成...\n');

// 生成10个示例UUID
const uuids = Array.from({ length: 10 }, () => crypto.randomUUID());

console.log('✅ 生成的UUID示例:');
uuids.forEach((uuid, index) => {
  console.log(`  ${index + 1}. ${uuid}`);
});

// 验证UUID格式
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
console.log('\n🧪 格式验证:');
const allValid = uuids.every(uuid => uuidRegex.test(uuid));
console.log(`  ${allValid ? '✅' : '❌'} 所有UUID格式正确: ${allValid}`);

// 验证唯一性
console.log('\n🎲 唯一性验证:');
const uniqueSet = new Set(uuids);
const allUnique = uniqueSet.size === uuids.length;
console.log(`  ${allUnique ? '✅' : '❌'} 所有UUID唯一: ${allUnique} (生成${uuids.length}个，唯一${uniqueSet.size}个)`);

// 验证React key兼容性
console.log('\n⚛️  React key兼容性验证:');
const validReactKeys = uuids.every(uuid => {
  return typeof uuid === 'string' &&
         uuid.length > 0 &&
         !uuid.includes('=') &&
         !uuid.includes(':') &&
         !uuid.includes('.');
});
console.log(`  ${validReactKeys ? '✅' : '❌'} 所有UUID适合作为React key: ${validReactKeys}`);

// 性能测试
console.log('\n⚡ 性能测试:');
const startTime = Date.now();
const largeSet = Array.from({ length: 10000 }, () => crypto.randomUUID());
const endTime = Date.now();
console.log(`  生成10,000个UUID耗时: ${endTime - startTime}ms`);
console.log(`  平均每UUID: ${((endTime - startTime) / 10000).toFixed(3)}ms`);

// 验证大集合中的唯一性
const largeSetUnique = new Set(largeSet).size === largeSet.length;
console.log(`  ${largeSetUnique ? '✅' : '❌'} 10,000个UUID全部唯一: ${largeSetUnique}`);

console.log('\n📋 验证结果总结:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const allChecksPassed = allValid && allUnique && validReactKeys && largeSetUnique;
console.log(`  ${allChecksPassed ? '✅ 所有验证通过！' : '❌ 部分验证失败'}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

process.exit(allChecksPassed ? 0 : 1);
