/**
 * 角色关系处理工具
 * 支持新旧格式互转、图谱同步
 */

import {
  Character,
  CharacterRelation,
  CharacterRelationType,
  ParsedLegacyRelation,
  RELATION_TYPE_LABELS,
} from '../types';

/**
 * 中文关系名到枚举类型的映射
 */
const CHINESE_TO_TYPE_MAP: Record<string, CharacterRelationType> = {
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
 * 解析旧格式关系字符串
 * @param relationships 旧格式字符串，如 "朋友: 张三；敌人: 李四"
 * @returns 解析后的关系数组
 */
export function parseLegacyRelationships(relationships: string): ParsedLegacyRelation[] {
  if (!relationships || typeof relationships !== 'string') {
    return [];
  }

  const results: ParsedLegacyRelation[] = [];

  // 支持多种分隔符：分号、顿号、逗号
  const parts = relationships.split(/[；;，,、]/).filter(p => p.trim());

  for (const part of parts) {
    // 支持多种格式：冒号、等号、空格
    const match = part.match(/^([^:=：\s]+)[:=：\s]+(.+)$/);
    if (match) {
      const type = match[1].trim();
      const targetName = match[2].trim();
      if (type && targetName) {
        results.push({ type, targetName });
      }
    }
  }

  return results;
}

/**
 * 将旧格式关系转换为新格式结构化关系
 * @param legacyRelations 旧格式关系数组
 * @param characters 角色列表（用于查找目标角色ID）
 * @returns 结构化关系数组
 */
export function convertLegacyToStructured(
  legacyRelations: ParsedLegacyRelation[],
  characters: Character[]
): CharacterRelation[] {
  return legacyRelations.map((rel, index) => {
    // 查找目标角色
    const targetChar = characters.find(
      c => c.name === rel.targetName || c.name.includes(rel.targetName)
    );

    // 推断关系类型
    const relationType = inferRelationType(rel.type);

    return {
      id: `rel_${Date.now()}_${index}`,
      targetCharacterId: targetChar?.id || rel.targetName,
      targetCharacterName: rel.targetName,
      type: relationType,
      description: rel.type,
      weight: 50,
      trajectory: 'stable',
      isBidirectional: isBidirectionalType(relationType),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  });
}

/**
 * 从中文类型推断标准关系类型
 */
export function inferRelationType(chineseType: string): CharacterRelationType {
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
 * 判断关系类型是否双向
 */
export function isBidirectionalType(type: CharacterRelationType): boolean {
  const bidirectionalTypes: CharacterRelationType[] = [
    'ALLY_OF',
    'KIN_OF',
    'FRIEND_OF',
    'RIVAL_OF',
  ];
  return bidirectionalTypes.includes(type);
}

/**
 * 将结构化关系转换为旧格式字符串（双写兼容）
 * @param relations 结构化关系数组
 * @returns 旧格式字符串
 */
export function convertStructuredToLegacy(relations: CharacterRelation[]): string {
  return relations
    .map(rel => {
      const relationType = getRelationType(rel);
      const typeLabel = RELATION_TYPE_LABELS[relationType] || rel.description || '关联';
      const targetName = getTargetName(rel) || rel.targetCharacterId;
      return `${typeLabel}: ${targetName}`;
    })
    .join('；');
}

/**
 * 检测是否为旧格式关系
 */
export function isLegacyFormat(relationships: unknown): relationships is string {
  return typeof relationships === 'string' && relationships.length > 0;
}

/**
 * 检测是否为新格式关系
 */
export function isStructuredFormat(
  relationships: unknown
): relationships is CharacterRelation[] {
  return Array.isArray(relationships) && relationships.length > 0;
}

/**
 * 合并新旧格式关系（用于增量更新）
 */
export function mergeRelations(
  existing: CharacterRelation[] | undefined,
  newRelations: CharacterRelation[]
): CharacterRelation[] {
  if (!existing) return newRelations;

  const merged = [...existing];
  const existingIds = new Set(existing.map(r => r.targetCharacterId));

  for (const newRel of newRelations) {
    if (!existingIds.has(newRel.targetCharacterId)) {
      merged.push(newRel);
    } else {
      // 更新已存在的关系
      const index = merged.findIndex(r => r.targetCharacterId === newRel.targetCharacterId);
      if (index >= 0) {
        merged[index] = { ...merged[index], ...newRel, updatedAt: Date.now() };
      }
    }
  }

  return merged;
}

/**
 * 生成关系ID
 */
export function generateRelationId(): string {
  return `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 获取关系的图谱边类型
 */
export function getGraphEdgeType(relationType: CharacterRelationType): string {
  return relationType; // 图谱中直接使用枚举值作为边类型
}

/**
 * 获取关系类型，如果未指定则返回默认值
 * @param relation 角色关系对象
 * @returns 关系类型（默认为 'RELATED_TO'）
 */
export function getRelationType(relation: CharacterRelation): CharacterRelationType {
  return relation.type || 'RELATED_TO';
}

/**
 * 获取目标角色名称（统一处理 targetName 和 targetCharacterName）
 * @param relation 角色关系对象
 * @returns 目标角色名称
 */
export function getTargetName(relation: CharacterRelation): string {
  return relation.targetName || relation.targetCharacterName || '';
}

/**
 * 规范化角色关系对象（填充默认值）
 * @param relation 原始角色关系对象
 * @returns 规范化后的角色关系对象
 */
export function normalizeRelation(relation: CharacterRelation): CharacterRelation {
  return {
    ...relation,
    type: getRelationType(relation),
    targetName: getTargetName(relation),
    weight: relation.weight ?? 50,
    trajectory: relation.trajectory || 'stable',
    isBidirectional: relation.isBidirectional ?? isBidirectionalType(getRelationType(relation)),
  };
}

/**
 * 创建新的角色关系
 */
export function createCharacterRelation(
  targetCharacterId: string,
  targetCharacterName: string,
  type: CharacterRelationType,
  options: Partial<CharacterRelation> = {}
): CharacterRelation {
  return {
    id: generateRelationId(),
    targetCharacterId,
    targetCharacterName,
    type,
    weight: 50,
    trajectory: 'stable',
    isBidirectional: isBidirectionalType(type),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...options,
  };
}
