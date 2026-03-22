/**
 * 数据迁移脚本：将旧 relationships 转换为 structuredRelations (修复版)
 *
 * 背景:
 * - 当前系统存在数据丢失风险：MySQL 只存储 `relationships` 字符串
 * - Prisma Schema 中已添加 `structuredRelations` 字段
 * - 后端 API 需要返回 `structuredRelations`（JSON解析）
 * - `relationships` 改为计算属性
 *
 * 修复内容:
 * - 修复正则表达式不支持中文冒号的问题
 * - 改进空格分隔符的处理逻辑
 * - 增强模糊匹配的准确性
 *
 * Usage:
 *   npx ts-node --compiler-options '{"target":"ES2022","module":"commonjs"}' server/scripts/prisma/migrateRelations_fixed.ts
 *
 * 注意:
 *   - 保留原始 `relationships` 字符串用于向后兼容
 *   - 迁移后，relationships 字段保持不变，前端/后端会优先使用 structuredRelations
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 中文关系名到枚举类型的映射
 */
const CHINESE_TO_TYPE_MAP: Record<string, string> = {
    '敌人': 'ENEMY_OF',
    '敌对': 'ENEMY_OF',
    '仇人': 'ENEMY_OF',
    '盟友': 'ALLY_OF',
    '同盟': 'ALLY_OF',
    '爱': 'LOVES',
    '爱慕': 'LOVES',
    '恋人': 'LOVES',
    '爱人': 'LOVES',
    '亲人': 'KIN_OF',
    '亲属': 'KIN_OF',
    '家人': 'KIN_OF',
    '父母': 'KIN_OF',
    '兄弟': 'KIN_OF',
    '姐妹': 'KIN_OF',
    '师父': 'MENTORS',
    '徒弟': 'MENTORS',
    '师徒': 'MENTORS',
    '老师': 'MENTORS',
    '竞争': 'RIVAL_OF',
    '对手': 'RIVAL_OF',
    '效忠': 'SERVES',
    '下属': 'SERVES',
    '部下': 'SERVES',
    '朋友': 'FRIEND_OF',
    '好友': 'FRIEND_OF',
    '友': 'FRIEND_OF',
};

/**
 * 从中文类型推断标准关系类型
 */
function inferRelationType(chineseType: string): string {
    // 直接匹配
    if (CHINESE_TO_TYPE_MAP[chineseType]) {
        return CHINESE_TO_TYPE_MAP[chineseType];
    }

    // 模糊匹配 - 优先匹配更长的关键词
    const sortedKeys = Object.keys(CHINESE_TO_TYPE_MAP).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
        if (chineseType.includes(key)) {
            return CHINESE_TO_TYPE_MAP[key];
        }
    }

    // 反向匹配 - 如果关键词包含在类型中
    for (const [key, value] of Object.entries(CHINESE_TO_TYPE_MAP)) {
        if (key.includes(chineseType) && chineseType.length >= 2) {
            return value;
        }
    }

    return 'RELATED_TO';
}

/**
 * 解析旧格式关系字符串（修复版）
 * @param relationships 旧格式字符串，如 "朋友: 张三；敌人: 李四"
 * @returns 解析后的关系数组
 */
function parseLegacyRelationships(relationships: string): Array<{
    type: string;
    targetName: string;
    description?: string;
}> {
    if (!relationships || typeof relationships !== 'string') {
        return [];
    }

    const results: Array<{ type: string; targetName: string; description?: string }> = [];

    // 步骤 1: 按明确分隔符分割（分号、顿号、逗号）
    // 注意：需要处理分割后每个部分的 trim
    let parts = relationships.split(/[；;，,、]/).map(p => p.trim()).filter(p => p);

    // 步骤 2: 处理混合分隔符（空格+冒号的情况）
    // 例如："义兄: 大毛  义妹: 二毛" -> ["义兄: 大毛", "义妹: 二毛"]
    if (parts.length === 1 && /[:：=]/.test(parts[0]) && /\s{2,}/.test(parts[0])) {
        // 包含冒号且有多空格，尝试按多空格分割
        const spaceParts = parts[0].split(/\s{2,}/).map(p => p.trim()).filter(p => p);
        // 验证每个部分是否都包含冒号
        if (spaceParts.length > 1 && spaceParts.every(p => /[:：=]/.test(p))) {
            parts = spaceParts;
        }
    }

    // 步骤 3: 处理纯空格分隔的情况（无冒号等分隔符）
    // 例如："挚友  小明  宿敌  小强" -> ["挚友", "小明", "宿敌", "小强"]
    if (parts.length === 1 && !/[:：=]/.test(parts[0])) {
        const spaceParts = parts[0].split(/\s{2,}/).filter(p => p.trim()); // 至少2个空格才分割

        // 如果分割成偶数个部分，尝试配对解析 (类型 名字)
        if (spaceParts.length >= 2 && spaceParts.length % 2 === 0) {
            for (let i = 0; i < spaceParts.length; i += 2) {
                const typeStr = spaceParts[i].trim();
                const targetName = spaceParts[i + 1].trim();

                if (typeStr && targetName) {
                    const relationType = inferRelationType(typeStr);
                    results.push({
                        type: relationType,
                        targetName,
                        description: typeStr,
                    });
                }
            }
            return results; // 直接返回结果
        }
    }

    // 步骤 4: 解析每个部分（标准格式：包含冒号或等号）
    for (const part of parts) {
        // 修复后的正则表达式：明确支持中文冒号
        // 匹配格式: "类型: 名字" 或 "类型：名字" 或 "类型=名字"
        const match = part.match(/^([^:：=\s]+)\s*[:：=]\s*(.+)$/);

        if (match) {
            const typeStr = match[1].trim();
            const targetName = match[2].trim();

            if (typeStr && targetName) {
                const relationType = inferRelationType(typeStr);
                results.push({
                    type: relationType,
                    targetName,
                    description: typeStr,
                });
            }
        }
    }

    return results;
}

/**
 * 测试函数 - 用于验证解析逻辑
 */
function runTests() {
    console.log('\n========== 解析逻辑测试 ==========\n');

    const testCases = [
        { input: '朋友: 张三; 敌人: 李四', expected: 2, desc: '英文分号分隔' },
        { input: '师父：王五，师弟：赵六', expected: 2, desc: '中文冒号+逗号' },
        { input: '恋人=小红、仇人=小黑', expected: 2, desc: '等号+顿号' },
        { input: '义兄: 大毛  义妹: 二毛', expected: 2, desc: '两个空格分隔（带冒号）' },
        { input: '竞争对手: 龙傲天', expected: 1, desc: '单条关系' },
        { input: '生死之交：铁柱', expected: 1, desc: '四字关系类型' },
        { input: '挚友  小明  宿敌  小强', expected: 2, desc: '纯空格分隔（无冒号）' },
        { input: '', expected: 0, desc: '空字符串' },
        { input: '无格式文本', expected: 0, desc: '无分隔符文本' },
        { input: '挚友小明宿敌小强', expected: 0, desc: '无分隔符无空格' },
    ];

    let passed = 0;
    let failed = 0;

    testCases.forEach((test, i) => {
        const result = parseLegacyRelationships(test.input);
        const success = result.length === test.expected;

        console.log(`测试 ${i + 1}: ${test.desc}`);
        console.log(`  输入: "${test.input}"`);
        console.log(`  期望: ${test.expected} 条关系`);
        console.log(`  实际: ${result.length} 条关系`);

        if (success) {
            console.log(`  ✅ 通过`);
            passed++;
        } else {
            console.log(`  ❌ 失败`);
            console.log(`  详细结果:`, JSON.stringify(result, null, 2));
            failed++;
        }
        console.log('');
    });

    console.log(`========== 测试结果 ==========`);
    console.log(`通过: ${passed}/${testCases.length}`);
    console.log(`失败: ${failed}/${testCases.length}`);
    console.log(`成功率: ${((passed / testCases.length) * 100).toFixed(1)}%`);
    console.log(`==============================\n`);

    return { passed, failed, total: testCases.length };
}

async function main() {
    console.log('[迁移开始] 开始迁移所有角色...\n');

    try {
        // 可选：先运行测试
        const args = process.argv.slice(2);
        if (args.includes('--test')) {
            runTests();
            return;
        }

        // 获取所有项目
        const projects = await prisma.project.findMany({
            select: { id: true, title: true }
        });

        console.log(`共发现 ${projects.length} 个项目`);

        let totalMigrated = 0;
        let totalSkipped = 0;
        let totalFailed = 0;

        for (const project of projects) {
            console.log(`\n处理项目: ${project.title} (${project.id})`);

            // 获取该项目的所有角色
            const characters = await prisma.character.findMany({
                where: { projectId: project.id }
            });

            console.log(`  发现 ${characters.length} 个角色`);

            for (const character of characters) {
                // 如果已经有 structuredRelations，跳过
                if (character.structuredRelations) {
                    console.log(`  [跳过] ${character.name} 已有结构化关系数据`);
                    totalSkipped++;
                    continue;
                }

                // 如果没有 relationships 字符串，跳过
                if (!character.relationships) {
                    console.log(`  [跳过] ${character.name} 没有关系数据`);
                    totalSkipped++;
                    continue;
                }

                // 解析旧格式关系字符串
                const structuredRelations = parseLegacyRelationships(character.relationships);

                if (structuredRelations.length === 0) {
                    console.log(`  [警告] ${character.name} 关系字符串解析失败`);
                    console.log(`         原始字符串: "${character.relationships}"`);
                    totalFailed++;
                    continue;
                }

                // 将结构化关系保存到数据库
                const structuredRelationsJson = JSON.stringify(structuredRelations);

                // 更新数据库记录
                await prisma.character.update({
                    where: { id: character.id },
                    data: {
                        structuredRelations: structuredRelationsJson,
                        // 保留原始 relationships 字符串用于向后兼容
                    }
                });

                console.log(`  [迁移] ${character.name}: ${structuredRelations.length} 条关系`);
                console.log(`         详情: ${structuredRelations.map(r => `${r.description}(${r.targetName})`).join(', ')}`);
                totalMigrated++;
            }
        }

        console.log(`\n[迁移完成]`);
        console.log(`  成功迁移: ${totalMigrated} 个角色`);
        console.log(`  跳过: ${totalSkipped} 个角色`);
        console.log(`  失败: ${totalFailed} 个角色`);

        if (totalFailed > 0) {
            console.log(`\n⚠️  警告: 有 ${totalFailed} 个角色的关系数据解析失败，请手动检查`);
        }

    } catch (error) {
        console.error('[迁移错误]', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
