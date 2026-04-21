/**
 * API 类型定义
 *
 * 定义所有 API 相关的 DTO 接口，消除 any 类型的使用
 */

import {
  ProjectState,
  Character,
  WorldSetting,
  PlotNode,
  Chapter,
  Echo,
  KnowledgeTriple,
  Faction,
  PropagationRisk,
  PhysicalStatus
} from '../types';

// ============================================================
// API 响应包装类型
// ============================================================

/**
 * 标准 API 响应包装
 */
export interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ============================================================
// 项目相关 DTO
// ============================================================

/**
 * 项目摘要信息
 */
export interface ProjectSummary {
  id: string;
  title: string;
  genre: string;
  lastModified: number;
  characterCount: number;
  worldSettingCount: number;
  chapterCount: number;
}

/**
 * 完整项目 DTO（与 ProjectState 一致）
 */
export type ProjectDTO = ProjectState;

/**
 * 创建项目响应
 */
export interface CreateProjectResponse {
  id: string;
  title: string;
}

// ============================================================
// 图谱相关 DTO
// ============================================================

/**
 * 图谱节点
 */
export interface GraphNodeDTO {
  id: string;
  label: string;
  type: 'Character' | 'WorldSetting' | 'Event' | 'Echo' | string;
  properties: Record<string, unknown>;
}

/**
 * 图谱边
 */
export interface GraphEdgeDTO {
  source: string;
  target: string;
  type: string;
  properties: Record<string, unknown>;
}

/**
 * 图谱数据
 */
export interface GraphDTO {
  nodes: GraphNodeDTO[];
  edges: GraphEdgeDTO[];
}

/**
 * 节点邻居查询结果
 */
export interface NodeNeighborsDTO {
  node: GraphNodeDTO;
  neighbors: Array<{
    node: GraphNodeDTO;
    edge: GraphEdgeDTO;
  }>;
}

/**
 * 子图查询响应
 */
export interface SubgraphResponse {
  subgraph: string;
  nodes: GraphNodeDTO[];
  edges: GraphEdgeDTO[];
}

// ============================================================
// 角色图谱 DTO
// ============================================================

/**
 * 角色特质 DTO
 */
export interface CharacterTraitsDTO {
  characterId: string;
  characterName: string;
  desire: string | null;
  fear: string | null;
  weakness: string | null;
  signature: string | null;
  contrast: string | null;
}

/**
 * 角色演变历史条目
 */
export interface CharacterEvolutionEntryDTO {
  echoId: string;
  timestamp: number;
  type: 'CHARACTER' | 'WORLD';
  description: string;
  reason: string;
  status: string;
  triples: Array<{
    subject: string;
    relation: string;
    object: string;
    weight?: number;
    trajectory?: string;
  }>;
}

/**
 * 角色伏笔条目
 */
export interface CharacterForeshadowingEntryDTO {
  id: string;
  type: string;
  subject: string;
  relation: string;
  object: string;
  status: 'OPEN' | 'RESOLVED' | 'ABANDONED';
  weight?: number;
  relatedPlotNodes?: PlotNode[];
}

// ============================================================
// Echo 图谱 DTO
// ============================================================

/**
 * 关系时间线索目
 */
export interface RelationshipTimelineEntryDTO {
  timestamp: number;
  echoId: string;
  relation: string;
  trajectory: string;
  weight: number;
  description: string;
}

/**
 * Echo 伏笔条目
 */
export interface EchoForeshadowingEntryDTO {
  subject: string;
  relation: string;
  object: string;
  echoId: string;
  createdAt: number;
  relatedChapter?: string;
}

/**
 * 矛盾检测条目
 */
export interface ContradictionEntryDTO {
  type: 'RELATIONSHIP_CONFLICT' | 'STATE_MISMATCH' | 'TEMPORAL_ERROR';
  description: string;
  entities: string[];
  conflictingEchoes: string[];
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

// ============================================================
// Outliner 图谱 DTO
// ============================================================

/**
 * 章节依赖关系
 */
export interface ChapterDependenciesDTO {
  chapter: Chapter;
  plotNode?: PlotNode;
  involvedCharacters: Character[];
  setLocation?: WorldSetting;
  beats: Array<{
    id: string;
    type: string;
    description: string;
    isCompleted: boolean;
  }>;
  predecessor?: Chapter;
  successor?: Chapter;
}

/**
 * 章节角色网络
 */
export interface ChapterCharacterNetworkDTO {
  characters: Character[];
  relationships: Array<{
    subject: string;
    relation: string;
    object: string;
    weight: number;
  }>;
}

/**
 * 冲突热力图条目
 */
export interface ConflictHeatmapEntryDTO {
  chapterId: string;
  chapterTitle: string;
  intensity: number;
  conflictType: string;
  participants: string[];
}

// ============================================================
// Forge 图谱 DTO
// ============================================================

/**
 * Forge 角色关系
 */
export interface ForgeCharacterRelationDTO {
  targetName: string;
  type: string;
  trajectory?: string;
  weight: number;
}

/**
 * Forge 角色
 */
export interface ForgeCharacterDTO {
  id: string;
  name: string;
  role: string;
  physicalStatus: string;
  location?: string;
  desire?: string;
  fear?: string;
  weakness?: string;
  signature?: string;
  relationships: ForgeCharacterRelationDTO[];
}

/**
 * Forge 上下文
 */
export interface ForgeGraphContextDTO {
  characters: ForgeCharacterDTO[];
  unresolvedForeshadowing: Array<{
    subject: string;
    relation: string;
    object: string;
    status: string;
    echoId: string;
  }>;
  locationContext?: {
    title: string;
    category: string;
    content: string;
  };
  plotContext?: {
    title: string;
    content: string;
    beatTag?: string;
    relatedCharacters: string[];
  };
}

/**
 * Forge 同步结果
 */
export interface ForgeSyncResultDTO {
  chapterId: string;
  echoes: Echo[];
  physicalStatusUpdates?: PhysicalStatus[];
}

// ============================================================
// 世界观一致性 DTO
// ============================================================

/**
 * 一致性问题实体
 */
export interface ConsistencyIssueEntityDTO {
  id: string;
  name: string;
  type: string;
}

/**
 * 一致性问题
 */
export interface ConsistencyIssueDTO {
  type: 'SPATIAL_CONFLICT' | 'HIERARCHY_CYCLE' | 'LOGICAL_CONTRADICTION';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  entities: ConsistencyIssueEntityDTO[];
  details?: string;
  suggestion?: string;
}

// ============================================================
// 批量操作 DTO
// ============================================================

/**
 * 批量操作历史条目
 */
export interface BatchOperationHistoryItemDTO {
  id: string;
  operation: 'BATCH_ACCEPT' | 'BATCH_REJECT';
  echoCount: number;
  timestamp: number;
  canUndo: boolean;
}

/**
 * 批量操作响应
 */
export interface BatchOperationResponseDTO {
  success: boolean;
  operationId: string;
  affectedCount: number;
  message: string;
}

/**
 * 批量操作历史响应
 */
export interface BatchOperationHistoryResponseDTO {
  operations: BatchOperationHistoryItemDTO[];
  total: number;
}

/**
 * 撤销批量操作响应
 */
export interface UndoBatchOperationResponseDTO {
  success: boolean;
  undoneCount: number;
  message: string;
}

// ============================================================
// 统计数据 DTO
// ============================================================

/**
 * 项目统计数据
 */
export interface ProjectStatisticsDTO {
  totalWords: number;
  chapterCount: number;
  characterCount: number;
  worldSettingCount: number;
  plotNodeCount: number;
  echoCount: number;
  pendingEchoCount: number;
  relationshipCount: number;
  timelineCount: number;
  lastModified: number;
}

// ============================================================
// 章节内容 DTO
// ============================================================

/**
 * 章节内容
 */
export interface ChapterContentDTO {
  id: string;
  content: string;
}

// ============================================================
// Plot 节点上下文 DTO
// ============================================================

/**
 * Plot 节点上下文
 */
export interface PlotNodeContextDTO {
  plotNodes: PlotNode[];
  characters: Character[];
  worldSettings: WorldSetting[];
  relationships: Array<{
    subject: string;
    relation: string;
    object: string;
    weight?: number;
    trajectory?: string;
  }>;
}

// ============================================================
// 叙事洞察 DTO
// ============================================================

/**
 * 叙事洞察
 */
export interface NarrativeInsightDTO {
  type: 'ALLIANCE_POTENTIAL' | 'CONFLICT_WARNING' | 'SECRET_CONNECTION' | 'FACTION_SHIFT';
  description: string;
  involvedEntities: string[];
  logic: string;
}

// ============================================================
// 角色深度查询 DTO (P0 增强)
// ============================================================

/**
 * 结构化关系
 */
export interface StructuredRelationDTO {
  targetName: string;
  type: 'ENEMY_OF' | 'ALLY_OF' | 'LOVES' | 'KIN_OF' | 'MENTORS' | 'RIVAL_OF' | 'SERVES' | 'FRIEND_OF' | 'RELATED_TO';
  description?: string;
}

/**
 * 角色深度信息
 */
export interface CharacterDepthDTO {
  characterId: string;
  name: string;
  role: string;
  archetype?: string;
  description?: string;

  // 深度属性
  alignment?: string;
  tags?: string[];
  desire?: string;
  fear?: string;
  signature?: string;
  contrast?: string;
  weakness?: string;

  // 关系信息
  relationships?: string;
  structuredRelations?: StructuredRelationDTO[];

  // 世界关联
  originLocation?: string;
  residence?: string;
  controlledTerritories?: string[];

  // 图谱扩展信息
  tripleCount?: number;
  relationshipCount?: number;
}

/**
 * 角色搜索结果
 */
export interface CharacterSearchResultDTO {
  characterId: string;
  name: string;
  role: string;
  alignment?: string;
  tags?: string[];
  matchScore?: number;
}

/**
 * 动机网络节点
 */
export interface MotivationNetworkNodeDTO {
  characterId: string;
  name: string;
  desire?: string;
  fear?: string;
  color?: string;
}

/**
 * 动机网络边
 */
export interface MotivationNetworkEdgeDTO {
  source: string;
  target: string;
  type: 'CONFLICT' | 'SYNERGY' | 'COMPLEX';
  weight: number;
}

/**
 * 动机网络
 */
export interface MotivationNetworkDTO {
  nodes: MotivationNetworkNodeDTO[];
  edges: MotivationNetworkEdgeDTO[];
}

/**
 * 位置角色信息
 */
export interface LocationCharacterDTO {
  characterId: string;
  name: string;
  role: string;
  reason?: string; // 为什么在这个位置
  isVisitor?: boolean; // 是否是访问者
}

// ============================================================
// 角色关系网络 DTO (P1 增强)
// ============================================================

/**
 * 关系网络节点
 */
export interface RelationshipNetworkNodeDTO {
  id: string;
  name: string;
  type: 'Character';
  alignment?: string;
  role?: string;
  weight?: number;
}

/**
 * 关系网络边
 */
export interface RelationshipNetworkEdgeDTO {
  source: string;
  target: string;
  type: string;
  weight: number;
  trajectory?: string;
}

/**
 * 关系网络响应
 */
export interface RelationshipNetworkDTO {
  nodes: RelationshipNetworkNodeDTO[];
  edges: RelationshipNetworkEdgeDTO[];
}
