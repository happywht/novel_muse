/**
 * Genre-specific rules for Muse writing pipeline.
 * Ported from InkOS genre profiles with Muse-specific adaptations.
 */

export interface GenreRule {
  id: string;
  name: string;
  fatigueWords: string[];
  satisfactionTypes: string[];
  taboos: string[];
  languageRules: string[];
  narrativeGuidance: string;
  pacingRule?: string;
  powerScaling?: boolean;
  numericalSystem?: boolean;
}

export const GENRE_RULES: Record<string, GenreRule> = {
  xuanhuan: {
    id: 'xuanhuan',
    name: '玄幻',
    fatigueWords: [
      '冷笑',
      '蝼蚁',
      '倒吸凉气',
      '瞳孔骤缩',
      '不可置信',
      '轰然炸裂',
      '满场死寂',
      '难以置信',
    ],
    satisfactionTypes: ['打脸', '升级突破', '收益兑现', '智斗碾压', '身份揭示', '底牌亮出'],
    taboos: [
      '主角为推剧情突然仁慈、犯蠢、讲武德',
      '用"暴涨""海量"跳过数值结算',
      '无铺垫的能力觉醒',
      '反派像木桩一样排队送死',
      '把所有章节都写成高爆裂战斗章',
    ],
    languageRules: [
      '力量体系的量级感用体感传达，不用抽象数字',
      '同一高潮段中，同一意象域的渲染不超过两轮',
      '搜尸/清点/装备段落禁止清单式列举，必须带入角色判断',
    ],
    narrativeGuidance:
      '以战斗和资源获取驱动剧情。主角行为由利益驱动，杀伐果断。三章内应有明确反馈。核心对手必须有脑子。',
    pacingRule: '三章内必有明确反馈：打脸、收益兑现、信息反转、地位变化',
    powerScaling: true,
    numericalSystem: true,
  },
  xianxia: {
    id: 'xianxia',
    name: '仙侠',
    fatigueWords: [
      '冷笑',
      '蝼蚁',
      '倒吸凉气',
      '瞳孔骤缩',
      '不可置信',
      '满场死寂',
      '难以置信',
      '竟然',
    ],
    satisfactionTypes: ['悟道突破', '法宝出世', '师门对决', '仙缘际遇', '渡劫飞升', '恩怨了结'],
    taboos: [
      '主角为推剧情突然仁慈、犯蠢、讲武德',
      '无铺垫的能力觉醒或境界突破',
      '反派像木桩一样排队送死',
      '境界体系设定前后矛盾',
    ],
    languageRules: [
      '修炼描写要有画面感和体感，不能只用抽象数字',
      '法术/法宝描写要各具特色，不能千篇一律',
    ],
    narrativeGuidance:
      '以修行为主线，夹杂红尘历练。注重境界突破的仪式感和因果报应。人际关系以师徒、道侣、同道为核心。',
    pacingRule: '五章内应有明确的境界或实力进展',
    powerScaling: true,
    numericalSystem: true,
  },
  dushi: {
    id: 'dushi',
    name: '都市',
    fatigueWords: [
      '冷笑',
      '蝼蚁',
      '倒吸凉气',
      '瞳孔骤缩',
      '不可置信',
      '满场死寂',
      '竟然',
      '不由得',
    ],
    satisfactionTypes: ['打脸装逼', '商业碾压', '身份揭露', '暧昧升温', '逆袭翻盘', '人脉展示'],
    taboos: [
      '主角行为不合社会常识',
      '商战逻辑严重硬伤',
      '反派降智配合主角',
      '都市中突然出现玄幻元素而无铺垫',
    ],
    languageRules: [
      '对话要符合现代都市人的说话方式',
      '不要用古代/玄幻腔调描写现代场景',
      '商业/职场场景要有基本的专业常识',
    ],
    narrativeGuidance:
      '贴近现实生活，节奏明快。以情感线和事业线双线并行。冲突来源是人际关系和利益纠葛。',
    pacingRule: '三章内应有情感或事业上的明确推进',
    powerScaling: false,
    numericalSystem: false,
  },
  kongbu: {
    id: 'kongbu',
    name: '恐怖',
    fatigueWords: ['冷笑', '蝼蚁', '倒吸凉气', '瞳孔骤缩', '满场死寂', '竟然', '不禁'],
    satisfactionTypes: ['真相揭露', '极限逃生', '反转震惊', '心理恐惧', '灵异事件', '生存抉择'],
    taboos: [
      '恐怖氛围被廉价化解',
      '怪物/鬼怪逻辑自相矛盾',
      '角色行为完全不符合求生本能',
      '突然变成动作片',
    ],
    languageRules: [
      '恐惧通过具体感官细节传递，不要直接写"恐怖"',
      '善用环境暗示和心理压力，少用直接的惊吓',
      '节奏要有呼吸感：紧张→释放→更大的紧张',
    ],
    narrativeGuidance:
      '以悬疑和恐惧感为核心。通过未知和不确定制造压迫感。角色在极端环境下的真实反应比怪物本身更重要。',
    pacingRule: '每章必须有新的恐惧元素或信息揭露',
    powerScaling: false,
    numericalSystem: false,
  },
};

/** Get genre rules by matching genre string (fuzzy match) */
export function getGenreRules(genre: string): GenreRule | null {
  if (GENRE_RULES[genre]) return GENRE_RULES[genre];
  for (const rule of Object.values(GENRE_RULES)) {
    if (genre.includes(rule.id) || genre.includes(rule.name)) return rule;
  }
  return null;
}

/** Build post-write validator options from genre rules */
export function getPostWriteOptionsFromGenre(genre: string): {
  fatigueWords: string[];
  prohibitions: string[];
} {
  const rules = getGenreRules(genre);
  return {
    fatigueWords: rules?.fatigueWords ?? [],
    prohibitions: rules?.taboos ?? [],
  };
}

/** Build genre context string to inject into scene generation prompts */
export function buildGenreContext(genre: string): string {
  const rules = getGenreRules(genre);
  if (!rules) return '';

  const parts: string[] = [];
  parts.push(`【题材规则：${rules.name}】`);

  if (rules.pacingRule) {
    parts.push(`节奏铁律：${rules.pacingRule}`);
  }

  if (rules.taboos.length > 0) {
    parts.push(`题材禁忌：`);
    rules.taboos.forEach((t) => parts.push(`  - ${t}`));
  }

  if (rules.languageRules.length > 0) {
    parts.push(`语言铁律：`);
    rules.languageRules.forEach((r) => parts.push(`  - ${r}`));
  }

  parts.push(`叙事指导：${rules.narrativeGuidance}`);

  return parts.join('\n');
}
