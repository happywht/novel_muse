

export type BeatTag = 'INCITING_INCIDENT' | 'PLOT_POINT_1' | 'MIDPOINT' | 'PLOT_POINT_2' | 'CLIMAX' | 'RESOLUTION' | 'OTHER' | null;

/**
 * 角色关系类型枚举 - 与图谱关系类型对应
 */
export type CharacterRelationType =
  | 'ENEMY_OF'      // 敌对
  | 'ALLY_OF'       // 盟友
  | 'LOVES'         // 爱慕
  | 'KIN_OF'        // 亲属
  | 'MENTORS'       // 师徒
  | 'RIVAL_OF'      // 竞争对手
  | 'SERVES'        // 效忠
  | 'FRIEND_OF'     // 朋友
  | 'RELATED_TO';   // 通用关系（兜底）

/**
 * 结构化角色关系 - 用于图谱存储和查询
 * 支持两种格式：
 * 1. AI返回的简化格式: { targetName, type?, description? }
 * 2. 完整格式: { id, targetCharacterId, targetCharacterName, ... }
 */
export interface CharacterRelation {
  id?: string;                   // 关系唯一ID（可选，AI生成时可能没有）
  targetCharacterId?: string;    // 目标角色ID（可选，AI生成时可能只有名称）
  targetCharacterName?: string;  // 目标角色名称（旧字段名，保持向后兼容）
  targetName?: string;           // 目标角色名称（推荐使用，与AI返回字段一致）
  type?: CharacterRelationType;  // 关系类型（可选，AI生成时可能不返回，默认值为 'RELATED_TO'）
  description?: string;          // 关系描述（如 "青梅竹马"）
  weight?: number;               // 关系强度 0-100
  trajectory?: 'rising' | 'falling' | 'stable'; // 关系走向
  isBidirectional?: boolean;     // 是否双向关系
  createdAt?: number;            // 创建时间
  updatedAt?: number;            // 更新时间
}

/**
 * 关系类型中文显示名称映射
 */
export const RELATION_TYPE_LABELS: Record<CharacterRelationType, string> = {
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
 * 旧格式关系解析结果
 * 解析 "朋友: 张三；敌人: 李四" 格式
 */
export interface ParsedLegacyRelation {
  type: string;      // 原始类型名（如 "朋友"）
  targetName: string; // 目标角色名
}

export type ConflictType = 'CONFRONTATION' | 'CLIMAX' | 'TWIST' | null;

export interface PlotNode {
  id: string;
  title: string;
  content: string; // The beat/summary
  order: number;
  beatTag?: BeatTag; // NEW: Narrative milestone tag
  relatedCharacters?: string[]; // IDs
  relatedLocations?: string[]; // IDs
  relatedChapters?: string[]; // IDs of related chapters
  // NEW: 修罗场冲突场景元数据
  conflictScenario?: {
    type: ConflictType;
    participants: string[]; // 参与角色ID数组
    stakes: string; // 赌注/冲突核心
    intensity: number; // 1-10强度等级
  };
}

export interface Message {
  role: 'user' | 'model';
  content: string;
  type?: 'text' | 'image';
  imageUrl?: string;
  timestamp: number;
}

export interface Character {
  id: string;
  name: string;
  role: string; // Protagonist, Antagonist, Mentor, Guardian, Shapeshifter, Trickster, Herald
  archetype: string; // 角色原型
  description: string; // 详细描述

  // 升级: 新增角色深度字段
  alignment?: string; // 道德阵营 (守序善良/混乱邪恶等)
  tags?: string[]; // 角色标签 (高智商低情商、洁癖晚期等)
  desire?: string; // 核心欲望
  fear?: string; // 核心恐惧
  signature?: string; // 标志性特征
  contrast?: string; // 反差萌点
  weakness?: string; // 弱点/缺陷

  relationships?: string; // 人际关系（兼容旧数据，string 格式）
  structuredRelations?: CharacterRelation[]; // 结构化关系数组（新格式，用于图谱）
  imageUrl?: string;

  // 系统字段
  physicalStatus?: string; // 身体状态
  foreshadowingHooks?: string[]; // 伏笔钩子
  lastModified?: number;
}

export interface WorldSetting {
  id: string;
  category: 'Geography' | 'Magic/Tech' | 'Society' | 'History' | 'Other';
  title: string;
  content: string;
}

export interface PlotVersion {
  id: string;
  timestamp: number;
  content: string;
  note: string; // e.g., "Initial Generation", "Darker Tone Rewrite"
}

export interface ChapterBeat {
  id: string;
  type: 'CONTENT' | 'ACTION' | 'DIALOGUE' | 'TWIST';
  description: string;
  isCompleted: boolean;
}

export interface Draft {
  id: string;
  title: string;
  content: string;
  relatedPlotPoint?: string;
  lastModified: number;
  branchId?: string; // NEW Task 2.2: Identify which branch this draft belongs to
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  summary?: string;     // NEW: For chapter-level outlining
  expectedPOV?: string; // NEW: Track perspective
  plotNodeId?: string;  // NEW: Link back to a PlotNode
  order: number;
  lastModified: number;
  beats?: ChapterBeat[]; // NEW: For granular scene planning
  metadata?: Array<{key: string, value: string}>; // Chapter metadata like POV
}

export type PromptProfile = 'LITERARY' | 'WEB_NOVEL';

export interface CreativeSettings {
  tone: string;      // e.g., "Dark", "Humorous", "Epic"
  style: string;     // e.g., "Descriptive", "Concise", "Poetic"
  creativity: number; // 0.0 to 1.0 (Temperature)
  targetAudience: string;
  promptProfile?: PromptProfile; // Choice of prompt pack
  styleTags?: string[]; // NEW: Micro tag selectors
  referenceText?: string; // NEW: Few-Shot reference text
}

export interface WorldGenConfig {
  detailLevel: 'Brief' | 'Standard' | 'Detailed'; // 简短, 标准, 详尽
  focus: 'Sensory' | 'Logic' | 'History' | 'Balanced'; // 感官, 逻辑, 历史, 平衡
}

export enum AppSection {
  LOBBY = 'LOBBY',
  DASHBOARD = 'DASHBOARD',
  CREATIVE_COMPASS = 'CREATIVE_COMPASS', // NEW: Extracted from Dashboard
  WORLD = 'WORLD',
  CHARACTERS = 'CHARACTERS',
  PLOT = 'PLOT',
  OUTLINER = 'OUTLINER',
  DRAFTING = 'DRAFTING',
  ECHOES = 'ECHOES',
  GRAPH = 'GRAPH'
}

/**
 * Phase 4/5: Structural data for Knowledge Graph
 */
export interface KnowledgeTriple {
  subject: string;
  relation: string;
  object: string;
  weight?: number;      // 0-100: Intensity of relationship
  trajectory?: string;  // rising, falling, stable
  isForeshadowing?: boolean; // NEW Task 2.1: Whether this is a narrative hook
  status?: 'OPEN' | 'RESOLVED' | 'ABANDONED'; // Status of the hook
  branchId?: string; // NEW Task 2.2: Context isolation
}

export interface Echo {
  id: string;
  type: 'CHARACTER' | 'WORLD';
  targetId: string;
  targetName: string;
  description: string;
  reason: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'PREDICTION' | 'ARCHIVED' | 'AUTO_ACCEPTED';
  timestamp: number;
  triples?: KnowledgeTriple[]; // NEW: Structural changes associated with this echo
  branchId?: string; // NEW Task 2.2
  // MVP: 准确性提升字段
  confidence?: number;           // 0-1: AI置信度，用于自动处理判断
  extractionEvidence?: string;   // 原文中支持此提取的具体句子
}

export interface StateChangeRecommendation {
  targetId: string;
  targetType: 'CHARACTER' | 'WORLD';
  targetName: string;
  suggestedUpdate: string;
  reason: string;
  // MVP: 准确性提升字段
  confidence?: number;           // 0-1: AI置信度
  extractionEvidence?: string;   // 原文依据
}

export interface TimelineEvent {
  id: string;
  timestamp: number; // Real world time of creation
  worldDate: string; // In-world date (e.g., "Year 205, Winter")
  title: string;
  description: string;
  involvedEntities: string[]; // IDs of characters/settings
  type: 'SCENE' | 'BACKGROUND' | 'ECHO';
}

export interface Faction {
  id: string;
  members: string[]; // Names of characters
  dominantTone?: string;
}

export interface PropagationRisk {
  targetName: string;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  magnitude: number; // 0-100
  reason: string;
}

export interface PhysicalStatus {
  name: string;
  location: string;
  state: string;
  isDead: boolean;
}

export interface ProjectState {
  id: string; // Unique ID for persistence
  lastModified: number;
  title: string;
  genre: string;
  premise: string;
  creativeSettings: CreativeSettings;
  worldGenConfig: WorldGenConfig; // New World Builder specific settings
  characters: Character[];
  worldSettings: WorldSetting[];
  plotOutline?: string;
  plotNodes: PlotNode[]; // NEW: Structured plot card system
  plotHistory: PlotVersion[];
  drafts: Draft[]; // New: Store generated drafts
  chapters: Chapter[]; // New: Store official manuscript
  echoes: Echo[]; // NEW: Echo Engine pending state changes
  customPrompts: Record<string, string>;
  timeline: TimelineEvent[]; // NEW: Chronological history of the world
  currentWorldDate: string; // NEW: Current in-world date
  activeBranchId?: string; // NEW Task 2.2: Track current active sandbox branch
  availableBranches?: string[]; // NEW Task 2.2: List of all sandbox branches
}

export interface NarrativeInsight {
  type: 'ALLIANCE_POTENTIAL' | 'CONFLICT_WARNING' | 'SECRET_CONNECTION' | 'FACTION_SHIFT';
  description: string;
  involvedEntities: string[];
  logic: string;
}

export type PolishMode = 'SENSORY' | 'CINEMATIC' | 'PSYCHOLOGICAL' | 'MINIMALIST' | 'WEB_MEME';

export type ViewMode = 'FORGE' | 'MANUSCRIPT';

export interface LogicConflict {
  type: 'LOCATION_MISMATCH' | 'RELATIONSHIP_CONFLICT' | 'FACTUAL_INCONSISTENCY';
  description: string;
  truthInGraph: string;
  extractedFact: string;
}

/**
 * 深度部分类型 - 用于部分更新
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
