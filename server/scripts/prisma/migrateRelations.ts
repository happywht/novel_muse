/**
 * 数据迁移脚本：将旧 relationships 转换为 structuredRelations
 *
 * 背景:
 * - 当前系统存在数据丢失风险：MySQL 只存储 `relationships` 字符串
 * - Prisma Schema 中已添加 `structuredRelations` 字段
 * - 后端 API 需要返回 `structuredRelations`（JSON解析）
 * - `relationships` 改为计算属性
 *
 * Usage:
 *   npx ts-node server/scripts/prisma/migrateRelations.ts
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
  敌人: 'ENEMY_OF',
  敌对: 'ENEMY_OF',
  仇人: 'ENEMY_OF',
  盟友: 'ALLY_OF',
  同盟: 'ALLY_OF',
  爱: 'LOVES',
  爱慕: 'LOVES',
  恋人: 'LOVES',
  爱人: 'LOVES',
  亲人: 'KIN_OF',
  亲属: 'KIN_OF',
  家人: 'KIN_OF',
  父母: 'KIN_OF',
  兄弟: 'KIN_OF',
  姐妹: 'KIN_OF',
  师父: 'MENTORS',
  徒弟: 'MENTORS',
  师徒: 'MENTORS',
  老师: 'MENTORS',
  竞争: 'RIVAL_OF',
  对手: 'RIVAL_OF',
  效忠: 'SERVES',
  下属: 'SERVES',
  部下: 'SERVES',
  朋友: 'FRIEND_OF',
  好友: 'FRIEND_OF',
  友: 'FRIEND_OF',
};

/**
 * 从中文类型推断标准关系类型
 */
function inferRelationType(chineseType: string): string {
  // 直接匹配
  if (CHINESE_TO_TYPE_MAP[chineseType]) {
    return CHINESE_TO_TYPE_MAP[chineseType];
  }

  // 模糊匹配
  for (const [key, value] of Object.entries(CHINESE_TO_TYPE_MAP)) {
    if (chineseType.includes(key) || key.includes(chineseType)) {
      return value;
    }
  }

  return 'RELATED_TO';
}

/**
 * 解析旧格式关系字符串
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

  // 支持多种分隔符：分号、顿号、逗号
  const parts = relationships.split(/[；;，,、]/).filter((p) => p.trim());

  for (const part of parts) {
    // 支持多种格式：冒号、等号、空格
    const match = part.match(/^([^:=：\s]+)[:=：\s]+(.+)$/);
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

async function main() {
  console.log('[迁移开始] 开始迁移所有角色...');

  try {
    // 获取所有项目
    const projects = await prisma.project.findMany({
      select: { id: true, title: true },
    });

    console.log(`共发现 ${projects.length} 个项目`);

    let totalMigrated = 0;
    let totalSkipped = 0;

    for (const project of projects) {
      console.log(`\n处理项目: ${project.title} (${project.id})`);

      // 获取该项目的所有角色
      const characters = await prisma.character.findMany({
        where: { projectId: project.id },
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
          console.log(`  [跳过] ${character.name} 关系字符串解析失败`);
          totalSkipped++;
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
          },
        });

        console.log(`  [迁移] ${character.name}: ${structuredRelations.length} 条关系`);
        totalMigrated++;
      }
    }

    console.log(`\n[迁移完成] 成功迁移 ${totalMigrated} 个角色，跳过 ${totalSkipped} 个角色`);
  } catch (error) {
    console.error('[迁移错误]', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
