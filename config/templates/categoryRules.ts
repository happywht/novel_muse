/**
 * 区块分类规则配置
 *
 * 用于 PromptConfirmDialog 中对模板块进行分类和样式渲染
 */

import { BlockMetadata } from '../../types/promptTemplate';

/** 区块分类类型 */
export type SectionTier = 'task' | 'context' | 'style' | 'constraint' | 'format' | 'other';

/** 分类颜色配置 */
export interface CategoryColor {
  bg: string;
  border: string;
  text: string;
  badge: string;
}

/** 分类规则配置 */
export interface CategoryRule {
  keywords: string[];
  icon: string;
  color: CategoryColor;
}

/** 分类规则定义 */
export const CATEGORY_RULES: Record<SectionTier, CategoryRule> = {
  task: {
    keywords: ['任务', '要求', '指令', '目标', '梗概', '必填', '核心', '情节', '生成', '输出'],
    icon: '🎯',
    color: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', badge: '🔴' }
  },
  context: {
    keywords: ['角色', '人物', '设定', '场景', '状态', '脉络', '逻辑', '记忆', '世界观', '图谱',
               'L1', 'L2', 'L3', '伏笔', '档案', '摘要', '背景', '前文', '变更', '动态', '实体'],
    icon: '👤',
    color: { bg: 'bg-amber-500/15', border: 'border-amber-400/50', text: 'text-amber-300', badge: '🟡' }
  },
  style: {
    keywords: ['文风', '风格', '基调', '笔迹', '技法', '题材', '类型', '规范', '指纹',
               '节奏', '句式', '段落', '词汇', '修辞', '特征', '多样性', '句首', '笔法',
               '语调', '语气', '口吻', '叙事', '视角', '人称', '文体', '表达方式',
               '特色', '调性', '氛围', '韵味'],
    icon: '🎨',
    color: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', badge: '🟣' }
  },
  constraint: {
    keywords: ['禁令', '禁忌', '约束', '限制', '铁律', '规则', '不要', '禁止', '必须', '不可'],
    icon: '🚫',
    color: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', badge: '🟠' }
  },
  format: {
    keywords: ['输出格式', '格式要求', 'JSON', '结构化', 'Schema', '格式'],
    icon: '📋',
    color: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', badge: '🔵' }
  },
  other: {
    keywords: [],
    icon: '📄',
    color: { bg: 'bg-slate-400/15', border: 'border-slate-400/50', text: 'text-slate-300', badge: '⚪' }
  }
};

/**
 * 获取区块分类颜色
 */
export function getTierColor(tier: SectionTier): CategoryColor {
  return CATEGORY_RULES[tier].color;
}

/**
 * 基于关键词的分类（Fallback）
 * 当模板元数据不可用时使用
 */
export function getTierFromKeywords(title: string): SectionTier {
  const checkTitle = title.toLowerCase();
  // 按优先级检查：任务 > 约束 > 格式 > 风格 > 上下文
  for (const keyword of CATEGORY_RULES.task.keywords) {
    if (checkTitle.includes(keyword)) return 'task';
  }
  for (const keyword of CATEGORY_RULES.constraint.keywords) {
    if (checkTitle.includes(keyword)) return 'constraint';
  }
  for (const keyword of CATEGORY_RULES.format.keywords) {
    if (checkTitle.includes(keyword)) return 'format';
  }
  for (const keyword of CATEGORY_RULES.style.keywords) {
    if (checkTitle.includes(keyword)) return 'style';
  }
  for (const keyword of CATEGORY_RULES.context.keywords) {
    if (checkTitle.includes(keyword)) return 'context';
  }
  return 'other';
}

/**
 * 混合分类逻辑
 * 优先使用模板元数据，Fallback到关键词匹配
 */
export function getTierFromClassification(
  title: string,
  metadata?: BlockMetadata
): SectionTier {
  // 优先使用模板元数据（先验分类）
  if (metadata?.tier) {
    return metadata.tier;
  }
  // Fallback到关键词匹配
  return getTierFromKeywords(title);
}

/**
 * 获取区块图标
 */
export function getTierIcon(tier: SectionTier): string {
  return CATEGORY_RULES[tier].icon;
}

/**
 * 获取所有分类层级
 */
export function getAllTiers(): SectionTier[] {
  return Object.keys(CATEGORY_RULES) as SectionTier[];
}
