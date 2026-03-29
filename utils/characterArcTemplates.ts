/**
 * 角色弧线模板工具
 * 帮助新手设计高质量角色成长路径
 */

import { ArcType, ArcPhase, CharacterArcTemplate, CharacterArc } from '../types';

// ============================================================
// 弧线类型标签映射
// ============================================================

export const ARC_TYPE_LABELS: Record<ArcType, string> = {
  redemption: '救赎弧线',
  corruption: '堕落弧线',
  steadfast: '坚守弧线',
  awakening: '觉醒弧线',
};

export const ARC_PHASE_LABELS: Record<ArcPhase, string> = {
  setup: '铺垫期',
  'rising-action': '上升行动',
  crisis: '危机点',
  climax: '高潮',
  resolution: '结局',
};

// ============================================================
// 预设弧线模板
// ============================================================

export const ARC_TEMPLATES: CharacterArcTemplate[] = [
  {
    type: 'redemption',
    name: '救赎弧线',
    description:
      '有缺陷的角色经历艰难困苦，最终获得救赎，从黑暗走向光明。经典如《绝命毒师》沃尔特·怀特、《星球大战》达斯·维达。',
    phases: ['setup', 'rising-action', 'crisis', 'climax', 'resolution'],
    keyQuestions: [
      '角色最初处于什么黑暗状态？',
      '什么事件触发了改变的可能？',
      '角色在哪个关键时刻做出了牺牲？',
      '最终的救赎是什么？',
    ],
    tips: [
      '前期充分展示角色的缺陷，让观众"恨铁不成钢"',
      '转折点需要强烈的情感冲击，让角色意识到错误',
      '救赎需要付出代价，不是轻易的洗白',
      '结局要展示角色的内心变化，而不仅仅是行为改变',
    ],
  },
  {
    type: 'corruption',
    name: '堕落弧线',
    description:
      '正直的角色因野心、恐惧或外部压力而逐渐堕落，从光明走向黑暗。经典如《绝命毒师》沃尔特·怀特、《星球大战》安纳金。',
    phases: ['setup', 'rising-action', 'crisis', 'climax', 'resolution'],
    keyQuestions: [
      '角色最初的道德底线是什么？',
      '什么诱惑/威胁触发了堕落？',
      '角色如何为自己的堕落找借口？',
      '堕落是突然的还是渐进的？',
    ],
    tips: [
      '堕落往往是渐进的，展示"滑坡效应"',
      '给角色一个合理的动机（野心、恐惧、爱）',
      '每个小妥协都是通向深渊的一步',
      '堕落过程中保留人性，让读者理解而非原谅',
    ],
  },
  {
    type: 'steadfast',
    name: '坚守弧线',
    description: '角色在面对巨大考验时坚守信念，不被动摇。经典如《蝙蝠侠》、《美国队长》。',
    phases: ['setup', 'rising-action', 'crisis', 'climax', 'resolution'],
    keyQuestions: [
      '角色的核心信念是什么？',
      '最大的考验是什么？',
      '角色是否动摇过？为什么？',
      '坚守带来了什么结果？',
    ],
    tips: [
      '信念必须是具体的，不是空洞的口号',
      '考验要逐步升级，不能一开始就太极端',
      '展示角色的内心挣扎，增加真实感',
      '坚守的胜利要有代价',
    ],
  },
  {
    type: 'awakening',
    name: '觉醒弧线',
    description:
      '角色从无知/偏见/错误认知中觉醒，获得新的理解和力量。经典如《黑客帝国》尼奥、《冰雪奇缘》艾莎。',
    phases: ['setup', 'rising-action', 'crisis', 'climax', 'resolution'],
    keyQuestions: [
      '角色最初的错误认知/无知是什么？',
      '什么事件触发了觉醒？',
      '觉醒是瞬间还是渐进的？',
      '觉醒后角色如何行动？',
    ],
    tips: [
      '错误认知需要具体的体现，不能只靠说',
      '觉醒往往需要外部冲击 + 内心挣扎',
      '觉醒后的第一个行动很重要，展示真正的改变',
      '觉醒可能会带来与过去的割裂',
    ],
  },
];

// ============================================================
// 辅助函数
// ============================================================

/**
 * 根据弧线类型获取模板
 */
export function getArcTemplate(type: ArcType): CharacterArcTemplate | undefined {
  return ARC_TEMPLATES.find((t) => t.type === type);
}

/**
 * 创建新的角色弧线
 */
export function createCharacterArc(type: ArcType): CharacterArc {
  return {
    arcType: type,
    currentPhase: 'setup',
    phaseProgress: 0,
    startDate: Date.now(),
    lastUpdated: Date.now(),
    notes: '',
  };
}

/**
 * 获取当前阶段在模板中的索引
 */
export function getPhaseIndex(phase: ArcPhase, template: CharacterArcTemplate): number {
  return template.phases.indexOf(phase);
}

/**
 * 检查是否可以进入下一阶段
 */
export function canAdvanceToNextPhase(arc: CharacterArc, template: CharacterArcTemplate): boolean {
  const currentIndex = getPhaseIndex(arc.currentPhase, template);
  return currentIndex < template.phases.length - 1 && arc.phaseProgress >= 100;
}

/**
 * 获取下一个阶段
 */
export function getNextPhase(arc: CharacterArc, template: CharacterArcTemplate): ArcPhase | null {
  const currentIndex = getPhaseIndex(arc.currentPhase, template);
  if (currentIndex < template.phases.length - 1) {
    return template.phases[currentIndex + 1];
  }
  return null;
}

/**
 * 更新弧线进度
 */
export function updateArcProgress(arc: CharacterArc, progress: number): CharacterArc {
  const template = getArcTemplate(arc.arcType);
  if (!template) return arc;

  let newPhase = arc.currentPhase;
  let newProgress = Math.min(100, Math.max(0, progress));

  // 如果进度达到100%，自动进入下一阶段
  if (newProgress >= 100) {
    const nextPhase = getNextPhase(arc, template);
    if (nextPhase) {
      newPhase = nextPhase;
      newProgress = 0;
    }
  }

  return {
    ...arc,
    currentPhase: newPhase,
    phaseProgress: newProgress,
    lastUpdated: Date.now(),
  };
}

/**
 * 获取弧线完成度百分比
 */
export function getArcCompletionPercentage(arc: CharacterArc): number {
  const template = getArcTemplate(arc.arcType);
  if (!template) return 0;

  const phaseIndex = getPhaseIndex(arc.currentPhase, template);
  const totalPhases = template.phases.length;

  // 每个阶段占相等的百分比
  const basePercentage = (phaseIndex / totalPhases) * 100;
  const currentPhaseContribution = (arc.phaseProgress / 100) * (100 / totalPhases);

  return Math.round(basePercentage + currentPhaseContribution);
}
