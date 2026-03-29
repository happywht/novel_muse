/**
 * Field Mapper - 字段映射定义
 * Muse <-> inkos 字段双向映射
 */

// ============================================
// Genre 映射 (Muse 中文 -> inkos 英文)
// ============================================
export const GENRE_MAP: Record<string, string> = {
  // 玄幻类
  '玄幻': 'xuanhuan',
  '仙侠': 'xianxia',
  '武侠': 'wuxia',
  '奇幻': 'qihuan',

  // 都市类
  '都市': 'dushi',
  '都市生活': 'dushi-life',
  '都市异能': 'dushi-ability',
  '都市重生': 'dushi-rebirth',

  // 历史类
  '历史': 'lishi',
  '历史架空': 'history-fiction',
  '历史军事': 'history-military',

  // 科幻类
  '科幻': 'kehuan',
  '星际科幻': 'interstellar',
  '末世科幻': 'post-apocalyptic',

  // 游戏类
  '游戏': 'youxi',
  '游戏异界': 'game-fantasy',
  '虚拟网游': 'virtual-game',

  // 女性向
  '言情': 'yanqing',
  '古代言情': 'gu-yan',
  '现代言情': 'xian-yan',
  '幻想言情': 'huan-yan',

  // 其他
  '灵异': 'lingyi',
  '悬疑': 'xuanyi',
  '军事': 'junshi',
  '二次元': 'erciyuan',
  '轻小说': 'light-novel',
};

// 反向映射 (inkos 英文 -> Muse 中文)
export const GENRE_MAP_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(GENRE_MAP).map(([k, v]) => [v, k])
);

// ============================================
// RelationType 映射 (Muse 枚举 -> inkos 文本)
// ============================================
export const RELATION_TYPE_MAP: Record<string, string> = {
  'ENEMY_OF': '敌对',
  'ALLY_OF': '盟友',
  'LOVES': '爱慕',
  'KIN_OF': '亲属',
  'MENTORS': '师徒',
  'RIVAL_OF': '竞争',
  'SERVES': '效忠',
  'FRIEND_OF': '朋友',
  'RELATED_TO': '关联',
};

// 反向映射 (inkos 文本 -> Muse 枚举)
export const RELATION_TYPE_MAP_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(RELATION_TYPE_MAP).map(([k, v]) => [v, k])
);

// ============================================
// ArcType 映射 (Muse 枚举 -> inkos 文本)
// ============================================
export const ARC_TYPE_MAP: Record<string, string> = {
  'redemption': '救赎弧线',
  'corruption': '堕落弧线',
  'steadfast': '坚守弧线',
  'awakening': '觉醒弧线',
};

// 反向映射 (inkos 文本 -> Muse 枚举)
export const ARC_TYPE_MAP_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(ARC_TYPE_MAP).map(([k, v]) => [v, k])
);

// inkos 内部使用的 trajectory 映射
export const ARC_TYPE_TO_TRAJECTORY: Record<string, 'rising' | 'falling' | 'stable'> = {
  'redemption': 'rising',
  'corruption': 'falling',
  'steadfast': 'stable',
  'awakening': 'rising',
};

// ============================================
// ArcPhase 映射 (Muse 枚举 -> inkos 文本)
// ============================================
export const ARC_PHASE_MAP: Record<string, string> = {
  'setup': '铺垫期',
  'rising-action': '上升行动',
  'crisis': '危机点',
  'climax': '高潮',
  'resolution': '结局',
};

// 反向映射
export const ARC_PHASE_MAP_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(ARC_PHASE_MAP).map(([k, v]) => [v, k])
);

// ============================================
// WorldSetting Category 映射
// ============================================
export const WORLD_CATEGORY_MAP: Record<string, string> = {
  'Geography': '地理',
  'Magic/Tech': '魔法/科技',
  'Society': '社会',
  'History': '历史',
  'Other': '其他',
};

export const WORLD_CATEGORY_MAP_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(WORLD_CATEGORY_MAP).map(([k, v]) => [v, k])
);

// ============================================
// BeatTag 映射
// ============================================
export const BEAT_TAG_MAP: Record<string, string> = {
  'INCITING_INCIDENT': '激励事件',
  'PLOT_POINT_1': '第一情节点',
  'MIDPOINT': '中点',
  'PLOT_POINT_2': '第二情节点',
  'CLIMAX': '高潮',
  'RESOLUTION': '结局',
  'OTHER': '其他',
};

export const BEAT_TAG_MAP_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(BEAT_TAG_MAP).map(([k, v]) => [v, k])
);

// ============================================
// Platform 映射
// ============================================
export const PLATFORM_MAP: Record<string, string> = {
  'tomato': '番茄小说',
  'feilu': '飞卢小说',
  'qidian': '起点中文网',
  'other': '其他平台',
};

export const PLATFORM_MAP_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(PLATFORM_MAP).map(([k, v]) => [v, k])
);

// ============================================
// PromptProfile 映射
// ============================================
export const PROMPT_PROFILE_MAP: Record<string, string> = {
  'LITERARY': '文学风格',
  'WEB_NOVEL': '网文风格',
};

export const PROMPT_PROFILE_MAP_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(PROMPT_PROFILE_MAP).map(([k, v]) => [v, k])
);

// ============================================
// Chapter Status 映射
// ============================================
export const CHAPTER_STATUS_MAP: Record<string, string> = {
  'draft': '草稿',
  'outlining': '大纲阶段',
  'writing': '写作中',
  'revision': '修订中',
  'completed': '已完成',
  'published': '已发布',
};

export const CHAPTER_STATUS_MAP_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(CHAPTER_STATUS_MAP).map(([k, v]) => [v, k])
);

// ============================================
// Character Role 映射
// ============================================
export const CHARACTER_ROLE_MAP: Record<string, string> = {
  'Protagonist': '主角',
  'Antagonist': '反派',
  'Mentor': '导师',
  'Guardian': '守护者',
  'Shapeshifter': '变形者',
  'Trickster': '捣蛋鬼',
  'Herald': '传令官',
  'supporting': '配角',
};

export const CHARACTER_ROLE_MAP_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(CHARACTER_ROLE_MAP).map(([k, v]) => [v, k])
);

// ============================================
// 辅助函数
// ============================================

/**
 * 安全映射 - 返回原值如果映射不存在
 */
export function safeMap<K extends string, V>(
  map: Record<K, V>,
  key: K | string,
  defaultValue?: V
): V | string {
  if (key in map) {
    return map[key as K];
  }
  return defaultValue ?? key;
}

/**
 * 映射 Genre
 */
export function mapGenreToInkos(genre: string): string {
  return safeMap(GENRE_MAP, genre, 'general') as string;
}

export function mapGenreToMuse(genre: string): string {
  return safeMap(GENRE_MAP_REVERSE, genre, genre) as string;
}

/**
 * 映射 RelationType
 */
export function mapRelationTypeToInkos(type: string): string {
  return safeMap(RELATION_TYPE_MAP, type, type) as string;
}

export function mapRelationTypeToMuse(type: string): string {
  return safeMap(RELATION_TYPE_MAP_REVERSE, type, 'RELATED_TO') as string;
}

/**
 * 映射 ArcType
 */
export function mapArcTypeToInkos(arcType: string): string {
  return safeMap(ARC_TYPE_MAP, arcType, arcType) as string;
}

export function mapArcTypeToMuse(arcType: string): string {
  return safeMap(ARC_TYPE_MAP_REVERSE, arcType, 'steadfast') as string;
}

/**
 * 映射 World Category
 */
export function mapWorldCategoryToInkos(category: string): string {
  return safeMap(WORLD_CATEGORY_MAP, category, category) as string;
}

export function mapWorldCategoryToMuse(category: string): string {
  return safeMap(WORLD_CATEGORY_MAP_REVERSE, category, 'Other') as string;
}
