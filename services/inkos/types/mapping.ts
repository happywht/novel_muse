/**
 * Muse ProjectState 与 inkos Truth Files 数据映射
 *
 * 设计原则：
 * 1. Muse 作为前端交互层，inkos 作为后端持久化和 AI 写作引擎
 * 2. 双向转换：Muse -> inkos（导出/同步）和 inkos -> Muse（导入/恢复）
 * 3. 保持语义完整性，不丢失任何一方的特有信息
 */

import type {
  ProjectState,
  WorldSetting,
  Character,
  PlotNode,
  Chapter,
  Echo,
  CharacterRelation,
  CharacterArc,
  TimelineEvent,
  KnowledgeTriple,
  CharacterRelationType,
} from '../../../types';

// ============================================================
// inkos Truth Files 类型定义
// ============================================================

/**
 * inkos 7 个 Truth Files
 * 基于 Markdown 表格格式存储长期记忆
 */
export interface InkosTruthFiles {
  /** 世界状态：角色位置、关系网络、已知信息、情感弧线 */
  currentState: InkosCurrentState;
  /** 资源账本：物品、金钱、物资数量及衰减追踪（可选，仅数值体系题材） */
  particleLedger?: InkosParticleLedger;
  /** 未闭合伏笔：铺垫、对读者的承诺、未解决冲突 */
  pendingHooks: InkosPendingHook[];
  /** 各章摘要：出场人物、关键事件、状态变化、伏笔动态 */
  chapterSummaries: InkosChapterSummary[];
  /** 支线进度板：A/B/C 线状态、停滞检测 */
  subplotBoard: InkosSubplot[];
  /** 情感弧线：按角色追踪情绪变化和成长 */
  emotionalArcs: InkosEmotionalArc[];
  /** 角色交互矩阵：相遇记录、信息边界 */
  characterMatrix: InkosCharacterMatrix;
}

/**
 * current_state.md - 世界状态卡
 * Markdown 表格格式
 */
export interface InkosCurrentState {
  /** 当前章节号 */
  currentChapter: number;
  /** 当前位置（场景） */
  currentLocation: string;
  /** 主角状态描述 */
  protagonistStatus: string;
  /** 当前目标 */
  currentGoal: string;
  /** 当前限制/约束 */
  currentConstraints: string;
  /** 当前敌我关系 */
  allyEnemyStatus: string;
  /** 当前冲突 */
  currentConflict: string;
  /** 最后更新时间 */
  lastUpdated?: string;
}

/**
 * particle_ledger.md - 资源账本
 * 用于数值体系题材（玄幻、仙侠、LitRPG 等）
 */
export interface InkosParticleLedger {
  entries: InkosLedgerEntry[];
}

export interface InkosLedgerEntry {
  /** 章节号 */
  chapter: number;
  /** 期初值 */
  openingBalance: number;
  /** 来源 */
  source: string;
  /** 完整度百分比 */
  completeness?: number;
  /** 增量变化 */
  delta: number;
  /** 期末值 */
  closingBalance: number;
  /** 依据/说明 */
  reason: string;
  /** 资源类型（灵石、金币、经验值等） */
  resourceType?: string;
}

/**
 * pending_hooks.md - 伏笔池
 */
export interface InkosPendingHook {
  /** 伏笔ID */
  hookId: string;
  /** 起始章节 */
  startChapter: number;
  /** 类型：character/plot/world/mystery */
  type: 'character' | 'plot' | 'world' | 'mystery' | 'item' | 'other';
  /** 状态：OPEN/ADVANCED/RESOLVED/ABANDONED */
  status: 'OPEN' | 'ADVANCED' | 'RESOLVED' | 'ABANDONED';
  /** 最近推进章节 */
  lastAdvancedChapter?: number;
  /** 预期回收章节 */
  expectedResolution?: string;
  /** 备注/描述 */
  notes: string;
  /** 相关角色 */
  relatedCharacters?: string[];
}

/**
 * chapter_summaries.md - 章节摘要
 */
export interface InkosChapterSummary {
  /** 章节号 */
  chapter: number;
  /** 标题 */
  title: string;
  /** 出场人物（逗号分隔） */
  characters: string[];
  /** 关键事件 */
  events: string;
  /** 状态变化 */
  stateChanges: string;
  /** 伏笔动态 */
  hookActivity: string;
  /** 情绪基调 */
  mood: string;
  /** 章节类型 */
  chapterType: string;
}

/**
 * subplot_board.md - 支线进度板
 */
export interface InkosSubplot {
  /** 支线ID */
  subplotId: string;
  /** 支线名称 */
  name: string;
  /** 相关角色 */
  relatedCharacters: string[];
  /** 起始章节 */
  startChapter: number;
  /** 最近活跃章节 */
  lastActiveChapter: number;
  /** 距今章数（用于检测停滞） */
  chaptersSinceActive: number;
  /** 状态：ACTIVE/DORMANT/COMPLETED/ABANDONED */
  status: 'ACTIVE' | 'DORMANT' | 'COMPLETED' | 'ABANDONED';
  /** 进度概述 */
  progressSummary: string;
  /** 预计回收章节 */
  resolutionETA?: string;
}

/**
 * emotional_arcs.md - 情感弧线
 */
export interface InkosEmotionalArc {
  /** 角色名 */
  character: string;
  /** 章节 */
  chapter: number;
  /** 情绪状态 */
  emotionalState: string;
  /** 触发事件 */
  triggerEvent: string;
  /** 强度 1-10 */
  intensity: number;
  /** 弧线方向：rising/falling/stable */
  trajectory: 'rising' | 'falling' | 'stable';
}

/**
 * character_matrix.md - 角色交互矩阵
 */
export interface InkosCharacterMatrix {
  /** 角色档案 */
  profiles: InkosCharacterProfile[];
  /** 相遇记录 */
  encounters: InkosEncounter[];
  /** 信息边界 */
  informationBoundaries: InkosInformationBoundary[];
}

export interface InkosCharacterProfile {
  /** 角色名 */
  name: string;
  /** 核心标签 */
  coreTags: string[];
  /** 反差细节 */
  contrastDetails?: string;
  /** 说话风格 */
  speakingStyle?: string;
  /** 性格底色 */
  personalityBase: string;
  /** 与主角关系 */
  relationshipToProtagonist: string;
  /** 核心动机 */
  coreMotivation: string;
  /** 当前目标 */
  currentGoal: string;
}

export interface InkosEncounter {
  /** 角色A */
  characterA: string;
  /** 角色B */
  characterB: string;
  /** 首次相遇章节 */
  firstEncounterChapter: number;
  /** 最近交互章节 */
  lastInteractionChapter: number;
  /** 关系性质 */
  relationshipNature: string;
  /** 关系变化 */
  relationshipChange?: string;
}

export interface InkosInformationBoundary {
  /** 角色 */
  character: string;
  /** 已知信息 */
  knownInfo: string[];
  /** 未知信息 */
  unknownInfo: string[];
  /** 信息来源章节 */
  sourceChapters: number[];
}

// ============================================================
// inkos 附加文件类型
// ============================================================

/**
 * story_bible.md - 世界观设定
 */
export interface InkosStoryBible {
  /** 世界观 */
  worldBuilding: string;
  /** 主角设定 */
  protagonist: string;
  /** 势力与人物 */
  factionsAndCharacters: string;
  /** 地理与环境 */
  geographyAndEnvironment: string;
  /** 书名与简介 */
  titleAndSynopsis: string;
}

/**
 * volume_outline.md - 卷纲规划
 */
export interface InkosVolumeOutline {
  volumes: InkosVolume[];
}

export interface InkosVolume {
  /** 卷名 */
  name: string;
  /** 起始章节 */
  startChapter: number;
  /** 结束章节 */
  endChapter: number;
  /** 核心冲突 */
  coreConflict: string;
  /** 关键转折 */
  keyTurningPoints: string[];
  /** 收益目标 */
  objectives?: string;
}

/**
 * book_rules.md - 创作规则
 */
export interface InkosBookRules {
  /** 版本 */
  version: string;
  /** 主角锁定 */
  protagonist: {
    name: string;
    personalityLock: string[];
    behavioralConstraints: string[];
  };
  /** 题材锁定 */
  genreLock: {
    primary: string;
    forbidden: string[];
  };
  /** 数值系统覆盖（可选） */
  numericalSystemOverrides?: {
    hardCap?: number;
    resourceTypes?: string[];
  };
  /** 禁忌列表 */
  prohibitions: string[];
  /** 同人模式（可选） */
  fanficMode?: 'canon' | 'au' | 'ooc' | 'cp';
  /** 允许偏差（同人专用） */
  allowedDeviations?: string[];
}

// ============================================================
// Muse -> inkos 映射类型
// ============================================================

/**
 * Muse 到 inkos 的完整映射
 */
export interface MuseToInkosMapping {
  /** 项目元信息 -> book.json */
  projectMeta: InkosBookConfig;
  /** 世界设定 -> current_state.md + story_bible.md */
  worldSettings: {
    currentState: Partial<InkosCurrentState>;
    storyBible: Partial<InkosStoryBible>;
  };
  /** 角色 -> character_matrix.md */
  characters: InkosCharacterMatrix;
  /** 情节大纲 -> volume_outline.md + subplot_board.md */
  plotOutline: {
    volumeOutline: InkosVolumeOutline;
    subplotBoard: InkosSubplot[];
  };
  /** 情节节点 -> pending_hooks.md */
  plotNodes: InkosPendingHook[];
  /** 章节 -> chapter_summaries.md + 章节文件 */
  chapters: {
    summaries: InkosChapterSummary[];
    chapterFiles: InkosChapterFile[];
  };
  /** Echo（状态变更建议） -> pending_hooks.md */
  echoes: InkosPendingHook[];
  /** 时间线 -> emotional_arcs.md */
  timeline: InkosEmotionalArc[];
}

/**
 * inkos book.json 配置
 */
export interface InkosBookConfig {
  /** 书籍ID */
  id: string;
  /** 标题 */
  title: string;
  /** 题材 */
  genre: string;
  /** 平台 */
  platform: string;
  /** 目标章数 */
  targetChapters: number;
  /** 每章字数 */
  chapterWordCount: number;
  /** 语言 */
  language: 'zh' | 'en';
  /** 状态 */
  status: 'draft' | 'active' | 'completed' | 'paused';
}

/**
 * inkos 章节文件
 */
export interface InkosChapterFile {
  /** 章节号 */
  chapter: number;
  /** 标题 */
  title: string;
  /** 正文内容 */
  content: string;
  /** 文件名 */
  filename: string;
}

// ============================================================
// inkos -> Muse 映射类型
// ============================================================

/**
 * inkos 到 Muse 的完整映射
 */
export interface InkosToMuseMapping {
  /** 书籍配置 -> ProjectState 元信息 */
  bookConfig: Partial<ProjectState>;
  /** current_state.md + story_bible.md -> WorldSetting[] */
  worldState: WorldSetting[];
  /** character_matrix.md -> Character[] */
  characters: Character[];
  /** volume_outline.md -> plotOutline */
  plotOutline: string;
  /** subplot_board.md + pending_hooks.md -> PlotNode[] */
  plotNodes: PlotNode[];
  /** chapter_summaries.md + 章节文件 -> Chapter[] */
  chapters: Chapter[];
  /** pending_hooks.md -> Echo[] */
  echoes: Echo[];
  /** emotional_arcs.md -> CharacterArc[] */
  characterArcs: Map<string, CharacterArc>;
}

// ============================================================
// 双向转换器接口
// ============================================================

/**
 * Muse -> inkos 转换器
 */
export interface MuseToInkosConverter {
  /** 转换完整项目 */
  convertProject(project: ProjectState): Promise<MuseToInkosMapping>;
  /** 转换世界设定 */
  convertWorldSettings(settings: WorldSetting[]): Partial<InkosStoryBible>;
  /** 转换角色 */
  convertCharacters(characters: Character[]): InkosCharacterMatrix;
  /** 转换情节节点 */
  convertPlotNodes(nodes: PlotNode[]): InkosPendingHook[];
  /** 转换章节 */
  convertChapters(chapters: Chapter[]): { summaries: InkosChapterSummary[]; files: InkosChapterFile[] };
  /** 转换 Echo */
  convertEchoes(echoes: Echo[]): InkosPendingHook[];
}

/**
 * inkos -> Muse 转换器
 */
export interface InkosToMuseConverter {
  /** 转换完整项目 */
  convertBook(truthFiles: InkosTruthFiles, config: InkosBookConfig): Promise<InkosToMuseMapping>;
  /** 转换世界状态 */
  convertWorldState(state: InkosCurrentState, bible: InkosStoryBible): WorldSetting[];
  /** 转换角色矩阵 */
  convertCharacterMatrix(matrix: InkosCharacterMatrix): Character[];
  /** 转换伏笔 */
  convertHooks(hooks: InkosPendingHook[]): { nodes: PlotNode[]; echoes: Echo[] };
  /** 转换章节摘要 */
  convertChapterSummaries(summaries: InkosChapterSummary[]): Chapter[];
}

// ============================================================
// 映射策略配置
// ============================================================

/**
 * 字段映射策略
 */
export interface FieldMappingStrategy {
  /** 源字段路径 */
  sourceField: string;
  /** 目标字段路径 */
  targetField: string;
  /** 转换函数名 */
  transform?: string;
  /** 是否必填 */
  required?: boolean;
  /** 默认值 */
  defaultValue?: unknown;
}

/**
 * 映射配置
 */
export interface MappingConfig {
  /** Muse -> inkos 字段映射 */
  museToInkos: {
    worldSettings: FieldMappingStrategy[];
    characters: FieldMappingStrategy[];
    plotNodes: FieldMappingStrategy[];
    chapters: FieldMappingStrategy[];
    echoes: FieldMappingStrategy[];
  };
  /** inkos -> Muse 字段映射 */
  inkosToMuse: {
    currentState: FieldMappingStrategy[];
    characterMatrix: FieldMappingStrategy[];
    pendingHooks: FieldMappingStrategy[];
    chapterSummaries: FieldMappingStrategy[];
    emotionalArcs: FieldMappingStrategy[];
  };
  /** 冲突解决策略 */
  conflictResolution: 'muse_wins' | 'inkos_wins' | 'merge' | 'manual';
  /** 同步模式 */
  syncMode: 'full' | 'incremental' | 'delta';
}

// ============================================================
// 关系类型映射
// ============================================================

/**
 * Muse CharacterRelationType -> inkos 关系性质 映射
 */
export const RELATION_TYPE_TO_INKOS: Record<CharacterRelationType, string> = {
  ENEMY_OF: '敌对',
  ALLY_OF: '盟友',
  LOVES: '爱慕',
  KIN_OF: '亲属',
  MENTORS: '师徒',
  RIVAL_OF: '竞争',
  SERVES: '效忠',
  FRIEND_OF: '朋友',
  RELATED_TO: '关联',
};

/**
 * inkos 关系性质 -> Muse CharacterRelationType 映射
 */
export const INKOS_TO_RELATION_TYPE: Record<string, CharacterRelationType> = {
  '敌对': 'ENEMY_OF',
  '敌': 'ENEMY_OF',
  '仇恨': 'ENEMY_OF',
  '盟友': 'ALLY_OF',
  '盟': 'ALLY_OF',
  '战友': 'ALLY_OF',
  '爱慕': 'LOVES',
  '恋人': 'LOVES',
  '爱': 'LOVES',
  '亲属': 'KIN_OF',
  '家人': 'KIN_OF',
  '血亲': 'KIN_OF',
  '师徒': 'MENTORS',
  '师父': 'MENTORS',
  '徒弟': 'MENTORS',
  '竞争': 'RIVAL_OF',
  '对手': 'RIVAL_OF',
  '效忠': 'SERVES',
  '下属': 'SERVES',
  '朋友': 'FRIEND_OF',
  '好友': 'FRIEND_OF',
  '关联': 'RELATED_TO',
};

// ============================================================
// 默认值和辅助常量
// ============================================================

/**
 * 默认 inkos 状态卡
 */
export const DEFAULT_INKOS_STATE: InkosCurrentState = {
  currentChapter: 0,
  currentLocation: '未设定',
  protagonistStatus: '正常',
  currentGoal: '未设定',
  currentConstraints: '无',
  allyEnemyStatus: '未明确',
  currentConflict: '未设定',
};

/**
 * 默认章节摘要
 */
export const DEFAULT_CHAPTER_SUMMARY: Omit<InkosChapterSummary, 'chapter' | 'title'> = {
  characters: [],
  events: '',
  stateChanges: '',
  hookActivity: '',
  mood: 'neutral',
  chapterType: 'standard',
};

/**
 * Truth Files 文件名常量
 */
export const TRUTH_FILE_NAMES = {
  CURRENT_STATE: 'current_state.md',
  PARTICLE_LEDGER: 'particle_ledger.md',
  PENDING_HOOKS: 'pending_hooks.md',
  CHAPTER_SUMMARIES: 'chapter_summaries.md',
  SUBPLOT_BOARD: 'subplot_board.md',
  EMOTIONAL_ARCS: 'emotional_arcs.md',
  CHARACTER_MATRIX: 'character_matrix.md',
  STORY_BIBLE: 'story_bible.md',
  VOLUME_OUTLINE: 'volume_outline.md',
  BOOK_RULES: 'book_rules.md',
} as const;

/**
 * inkos 目录结构
 */
export const INKOS_DIR_STRUCTURE = {
  BOOKS: 'books',
  STORY: 'story',
  CHAPTERS: 'chapters',
  SNAPSHOTS: 'snapshots',
  ARCHIVE: 'summaries_archive',
} as const;
