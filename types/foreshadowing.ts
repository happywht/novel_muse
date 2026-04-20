/**
 * 伏笔追踪系统类型定义
 */

/**
 * 伏笔类型
 */
export enum ForeshadowingType {
  /** 悬念 - 引发读者好奇的未解之谜 */
  SUSPENSE = 'suspense',
  /** 预言 - 预示未来发展的预言或预示 */
  PROPHECY = 'prophecy',
  /** 伏线 - 后续剧情的铺垫 */
  SETUP = 'setup',
  /** 暗示 - 隐晦的提示 */
  HINT = 'hint',
  /** 伏笔 - 直接的情节伏笔 */
  FORESHADOWING = 'foreshadowing',
  /** 回报 - 前期伏笔的揭示 */
  PAYOFF = 'payoff',
  /** 反转 - 意想不到的剧情转折 */
  TWIST = 'twist',
  /** 红鲱鱼 - 误导性的线索 */
  RED_HERRING = 'red_herring',
}

/**
 * 伏笔状态
 */
export enum ForeshadowingStatus {
  /** 未揭示 - 尚未向读者展示 */
  UNREVEALED = 'unrevealed',
  /** 已揭示 - 已向读者展示，但未完全解释 */
  REVEALED = 'revealed',
  /** 已解决 - 伏笔已完全解释和解决 */
  RESOLVED = 'resolved',
  /** 已废弃 - 不再使用或已被其他情节取代 */
  ABANDONED = 'abandoned',
  /** 进行中 - 正在逐步揭示中 */
  ONGOING = 'ongoing',
}

/**
 * 伏笔优先级
 */
export enum ForeshadowingPriority {
  /** 核心 - 对主线剧情至关重要 */
  CRITICAL = 'critical',
  /** 重要 - 对剧情有重要影响 */
  HIGH = 'high',
  /** 普通 - 常规伏笔 */
  MEDIUM = 'medium',
  /** 次要 - 辅助性伏笔 */
  LOW = 'low',
}

/**
 * 伏笔重要程度
 */
export enum ForeshadowingImpact {
  /** 极高 - 影响整个故事走向 */
  EXTREME = 'extreme',
  /** 高 - 影响主要情节线 */
  HIGH = 'high',
  /** 中 - 影响部分剧情 */
  MEDIUM = 'medium',
  /** 低 - 局部影响 */
  LOW = 'low',
}

/**
 * 伏笔关联类型
 */
export enum ForeshadowingRelationType {
  /** 直接关联 - 一个伏笔直接引出另一个 */
  DIRECT = 'direct',
  /** 间接关联 - 通过中间元素关联 */
  INDIRECT = 'indirect',
  /** 互补关联 - 互相补充说明 */
  COMPLEMENTARY = 'complementary',
  /** 矛盾关联 - 可能产生冲突 */
  CONFLICTING = 'conflicting',
  /** 因果关联 - 存在因果关系 */
  CAUSAL = 'causal',
  /** 平行关联 - 平行发展的伏笔 */
  PARALLEL = 'parallel',
}

/**
 * 伏笔实体
 */
export interface Foreshadowing {
  /** 唯一标识符 */
  id: string;

  /** 标题 */
  title: string;

  /** 详细描述 */
  description: string;

  /** 伏笔类型 */
  type: ForeshadowingType;

  /** 当前状态 */
  status: ForeshadowingStatus;

  /** 优先级 */
  priority: ForeshadowingPriority;

  /** 重要程度 */
  impact: ForeshadowingImpact;

  /** 关联的角色ID列表 */
  relatedCharacters: string[];

  /** 关联的事件ID列表 */
  relatedEvents: string[];

  /** 关联的章节ID列表 */
  relatedChapters: string[];

  /** 关联的其他伏笔ID列表 */
  relatedForeshadowings: string[];

  /** 预计揭示章节ID */
  revealChapterId?: string;

  /** 实际揭示章节ID */
  actualRevealChapterId?: string;

  /** 创建时间 */
  createdAt: Date;

  /** 更新时间 */
  updatedAt: Date;

  /** 预计揭示时间（章节序号或日期） */
  estimatedRevealTime?: number | Date;

  /** 伏笔标签（用于分类和筛选） */
  tags: string[];

  /** 备注 */
  notes?: string;

  /** 矛盾检测标记 */
  hasConflicts?: boolean;

  /** 矛盾数量 */
  conflictCount?: number;

  /** 被引用次数 */
  referenceCount?: number;
}

/**
 * 伏笔关联关系
 */
export interface ForeshadowingRelationship {
  /** 唯一标识符 */
  id: string;

  /** 源伏笔ID */
  sourceId: string;

  /** 目标伏笔ID */
  targetId: string;

  /** 关联类型 */
  relationType: ForeshadowingRelationType;

  /** 关联强度（0-1） */
  strength: number;

  /** 关联描述 */
  description?: string;

  /** 创建时间 */
  createdAt: Date;
}

/**
 * 伏笔矛盾
 */
export interface ForeshadowingConflict {
  /** 唯一标识符 */
  id: string;

  /** 伏笔ID */
  foreshadowingId: string;

  /** 矛盾类型 */
  conflictType: 'timeline' | 'character' | 'plot' | 'logic' | 'world';

  /** 矛盾描述 */
  description: string;

  /** 严重程度（1-10） */
  severity: number;

  /** 冲突的目标ID（角色、事件等） */
  targetId?: string;

  /** 解决建议 */
  suggestions?: string[];

  /** 是否已解决 */
  resolved: boolean;

  /** 检测时间 */
  detectedAt: Date;
}

/**
 * 伏笔分析结果
 */
export interface ForeshadowingAnalysis {
  /** 伏笔ID */
  foreshadowingId: string;

  /** 重要程度评分（0-100） */
  importanceScore: number;

  /** 影响范围评分（0-100） */
  impactScore: number;

  /** 复杂度评分（0-100） */
  complexityScore: number;

  /** 关联数量 */
  relationshipCount: number;

  /** 建议的揭示时机 */
  suggestedRevealTime?: number;

  /** 分析备注 */
  notes?: string;

  /** 分析时间 */
  analyzedAt: Date;
}

/**
 * 伏笔统计数据
 */
export interface ForeshadowingStats {
  /** 总伏笔数 */
  total: number;

  /** 各状态数量 */
  byStatus: Record<ForeshadowingStatus, number>;

  /** 各类型数量 */
  byType: Record<ForeshadowingType, number>;

  /** 各优先级数量 */
  byPriority: Record<ForeshadowingPriority, number>;

  /** 已解决的伏笔数 */
  resolved: number;

  /** 进行中的伏笔数 */
  ongoing: number;

  /** 未揭示的伏笔数 */
  unrevealed: number;

  /** 有矛盾的伏笔数 */
  withConflicts: number;

  /** 平均重要性评分 */
  avgImportanceScore: number;

  /** 关联关系总数 */
  totalRelationships: number;

  /** 矛盾总数 */
  totalConflicts: number;
}

/**
 * 伏笔筛选条件
 */
export interface ForeshadowingFilter {
  /** 状态筛选 */
  statuses?: ForeshadowingStatus[];

  /** 类型筛选 */
  types?: ForeshadowingType[];

  /** 优先级筛选 */
  priorities?: ForeshadowingPriority[];

  /** 角色筛选 */
  characterIds?: string[];

  /** 章节筛选 */
  chapterIds?: string[];

  /** 标签筛选 */
  tags?: string[];

  /** 是否只显示有矛盾的 */
  onlyWithConflicts?: boolean;

  /** 搜索关键词 */
  searchQuery?: string;

  /** 排序方式 */
  sortBy?: 'createdAt' | 'updatedAt' | 'priority' | 'impact' | 'title';

  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 伏笔表单数据
 */
export interface ForeshadowingFormData {
  title: string;
  description: string;
  type: ForeshadowingType;
  status: ForeshadowingStatus;
  priority: ForeshadowingPriority;
  impact: ForeshadowingImpact;
  relatedCharacters: string[];
  relatedEvents: string[];
  relatedChapters: string[];
  relatedForeshadowings: string[];
  revealChapterId?: string;
  estimatedRevealTime?: number;
  tags: string[];
  notes?: string;
}
