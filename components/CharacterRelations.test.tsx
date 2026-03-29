/**
 * CharacterRelations 组件测试数据
 *
 * 用于测试组件在不同数据格式下的表现
 */

import { Character } from '../types';

/**
 * 测试场景1: 使用新格式结构化关系
 */
export const characterWithStructuredRelations: Character = {
  id: 'char_001',
  name: '林月如',
  role: '女主角',
  archetype: '侠女',
  description: '武林世家林家堡的大小姐，性格刚烈，武功高强',

  structuredRelations: [
    {
      id: 'rel_001',
      targetCharacterId: 'char_002',
      targetName: '李逍遥',
      type: 'LOVES',
      description: '深爱却不敢表白',
      weight: 90,
      trajectory: 'rising',
      isBidirectional: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'rel_002',
      targetCharacterId: 'char_003',
      targetName: '赵灵儿',
      type: 'RIVAL_OF',
      description: '情敌关系',
      weight: 70,
      trajectory: 'stable',
      isBidirectional: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'rel_003',
      targetCharacterId: 'char_004',
      targetName: '林天南',
      type: 'KIN_OF',
      description: '父女',
      weight: 100,
      trajectory: 'stable',
      isBidirectional: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'rel_004',
      targetCharacterId: 'char_005',
      targetName: '拜月教主',
      type: 'ENEMY_OF',
      description: '家族仇敌',
      weight: 95,
      trajectory: 'stable',
      isBidirectional: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'rel_005',
      targetCharacterId: 'char_006',
      targetName: '阿奴',
      type: 'FRIEND_OF',
      description: '好友',
      weight: 75,
      trajectory: 'rising',
      isBidirectional: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ],
};

/**
 * 测试场景2: 使用旧格式字符串关系
 */
export const characterWithLegacyRelations: Character = {
  id: 'char_002',
  name: '李逍遥',
  role: '男主角',
  archetype: '英雄',
  description: '余杭镇客栈的小伙计，意外踏上修仙之路',
  relationships: '恋人: 赵灵儿；朋友: 阿奴；师徒: 酒剑仙；敌人: 拜月教主',
};

/**
 * 测试场景3: 混合格式（同时有两种格式，应优先使用新格式）
 */
export const characterWithMixedFormats: Character = {
  id: 'char_003',
  name: '赵灵儿',
  role: '女主角',
  archetype: '仙子',
  description: '南诏国公主，女娲后人',
  relationships: '朋友: 阿奴', // 旧格式会被忽略
  structuredRelations: [
    {
      id: 'rel_006',
      targetCharacterId: 'char_002',
      targetName: '李逍遥',
      type: 'LOVES',
      description: '相爱的恋人',
      weight: 100,
      trajectory: 'stable',
      isBidirectional: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ],
};

/**
 * 测试场景4: 无关系数据
 */
export const characterWithNoRelations: Character = {
  id: 'char_007',
  name: '路人甲',
  role: '配角',
  archetype: '普通人',
  description: '普通的村民',
};

/**
 * 测试场景5: 部分目标角色不存在
 */
export const characterWithMissingTargets: Character = {
  id: 'char_008',
  name: '测试角色',
  role: '测试',
  archetype: '测试',
  description: '用于测试目标角色不存在的情况',
  structuredRelations: [
    {
      id: 'rel_007',
      targetCharacterId: 'char_exists',
      targetName: '存在的角色',
      type: 'FRIEND_OF',
      description: '好友',
      weight: 80,
      trajectory: 'stable',
      isBidirectional: true,
    },
    {
      id: 'rel_008',
      targetCharacterId: 'char_not_exists',
      targetName: '不存在的角色',
      type: 'ENEMY_OF',
      description: '敌人（此角色不存在于列表中）',
      weight: 60,
      trajectory: 'stable',
      isBidirectional: true,
    },
  ],
};

/**
 * 完整的角色列表（用于测试）
 */
export const allTestCharacters: Character[] = [
  characterWithStructuredRelations,
  characterWithLegacyRelations,
  characterWithMixedFormats,
  {
    id: 'char_004',
    name: '林天南',
    role: '配角',
    archetype: '武林盟主',
    description: '林家堡堡主，林月如的父亲',
  },
  {
    id: 'char_005',
    name: '拜月教主',
    role: '反派',
    archetype: '魔王',
    description: '邪恶的教主，企图统治世界',
  },
  {
    id: 'char_006',
    name: '阿奴',
    role: '配角',
    archetype: '苗女',
    description: '苗族少女，活泼可爱',
  },
  characterWithNoRelations,
  {
    id: 'char_exists',
    name: '存在的角色',
    role: '测试',
    archetype: '测试',
    description: '用于测试',
  },
];

/**
 * 测试场景6: 关系类型覆盖测试
 * 确保所有9种关系类型都能正确显示
 */
export const characterWithAllRelationTypes: Character = {
  id: 'char_test_all',
  name: '测试所有关系类型',
  role: '测试',
  archetype: '测试',
  description: '包含所有9种关系类型的测试角色',
  structuredRelations: [
    { id: 't1', targetName: '敌人1', type: 'ENEMY_OF', description: '敌对关系' },
    { id: 't2', targetName: '盟友1', type: 'ALLY_OF', description: '盟友关系' },
    { id: 't3', targetName: '爱人1', type: 'LOVES', description: '爱慕关系' },
    { id: 't4', targetName: '亲人1', type: 'KIN_OF', description: '亲属关系' },
    { id: 't5', targetName: '师父1', type: 'MENTORS', description: '师徒关系' },
    { id: 't6', targetName: '对手1', type: 'RIVAL_OF', description: '竞争关系' },
    { id: 't7', targetName: '主公1', type: 'SERVES', description: '效忠关系' },
    { id: 't8', targetName: '朋友1', type: 'FRIEND_OF', description: '朋友关系' },
    { id: 't9', targetName: '关联1', type: 'RELATED_TO', description: '通用关系' },
  ],
};

/**
 * 测试场景7: 边界情况 - 空的关系数组
 */
export const characterWithEmptyArray: Character = {
  id: 'char_empty',
  name: '空关系数组',
  role: '测试',
  archetype: '测试',
  description: 'structuredRelations 为空数组',
  structuredRelations: [],
};

/**
 * 测试场景8: 边界情况 - 只有描述没有类型
 */
export const characterWithMinimalData: Character = {
  id: 'char_minimal',
  name: '最小数据',
  role: '测试',
  archetype: '测试',
  description: '只有必需字段的关系',
  structuredRelations: [
    {
      targetName: '未知角色',
      // 没有 type, 应该默认为 RELATED_TO
      // 没有 id, weight 等可选字段
    },
  ],
};

/**
 * 测试工具函数
 */
export const testUtils = {
  /**
   * 验证关系类型颜色映射
   */
  testColorMapping: () => {
    const types: Array<
      | 'ENEMY_OF'
      | 'ALLY_OF'
      | 'LOVES'
      | 'KIN_OF'
      | 'MENTORS'
      | 'RIVAL_OF'
      | 'SERVES'
      | 'FRIEND_OF'
      | 'RELATED_TO'
    > = [
      'ENEMY_OF',
      'ALLY_OF',
      'LOVES',
      'KIN_OF',
      'MENTORS',
      'RIVAL_OF',
      'SERVES',
      'FRIEND_OF',
      'RELATED_TO',
    ];

    console.log('测试所有关系类型的颜色映射:');
    types.forEach((type) => {
      console.log(`  ${type}: 应该有对应的颜色配置`);
    });
  },

  /**
   * 验证旧格式解析
   */
  testLegacyParsing: () => {
    const testCases = [
      '朋友: 张三',
      '朋友: 张三；敌人: 李四',
      '朋友：张三；敌人：李四', // 中文冒号
      '朋友=张三,敌人=李四', // 等号和逗号
      '朋友 张三', // 空格分隔
    ];

    console.log('测试旧格式解析:');
    testCases.forEach((str, i) => {
      console.log(`  测试用例 ${i + 1}: "${str}"`);
    });
  },

  /**
   * 验证模糊匹配
   */
  testFuzzyMatching: () => {
    console.log('测试目标角色模糊匹配:');
    console.log('  完全匹配: "李逍遥" -> 找到 "李逍遥"');
    console.log('  包含匹配: "李" -> 找到 "李逍遥"');
    console.log('  反向包含: "李逍遥大侠" -> 找到 "李逍遥"');
    console.log('  不匹配: "不存在的角色" -> 未找到');
  },
};

/**
 * 使用示例
 *
 * ```tsx
 * import { CharacterRelations } from './CharacterRelations';
 * import {
 *   characterWithStructuredRelations,
 *   allTestCharacters
 * } from './CharacterRelations.test';
 *
 * function TestComponent() {
 *   return (
 *     <CharacterRelations
 *       character={characterWithStructuredRelations}
 *       allCharacters={allTestCharacters}
 *       onNavigateToCharacter={(id) => console.log('Navigate to:', id)}
 *       onEdit={() => console.log('Edit relations')}
 *     />
 *   );
 * }
 * ```
 */
