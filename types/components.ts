/**
 * 组件专用类型定义
 *
 * 为UI组件提供精确的类型定义，消除any类型使用
 */

import { Character, CharacterRelation, KnowledgeTriple } from './types';

// ============================================================
// 角色相关组件类型
// ============================================================

/**
 * 关系图节点
 */
export interface RelationshipGraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  type: 'character' | 'related';
}

/**
 * 关系图边
 */
export interface RelationshipGraphEdge {
  source: string;
  target: string;
  label: string;
  weight: number;
  color: string;
  type: string;
}

/**
 * 角色关系图数据
 */
export interface RelationshipGraphData {
  nodes: RelationshipGraphNode[];
  edges: RelationshipGraphEdge[];
}

/**
 * 角色三元组数据
 */
export interface CharacterTripleData {
  subject: string;
  relation: string;
  object: string;
  weight?: number;
  trajectory?: string;
}

/**
 * 角色演化历史条目
 */
export interface CharacterEvolutionEntry {
  echoId: string;
  timestamp: number;
  type: 'CHARACTER' | 'WORLD';
  description: string;
  reason: string;
  status: string;
  triples: CharacterTripleData[];
}

/**
 * 图谱查询参数
 */
export interface GraphQueryParams {
  projectId: string;
  characterId: string;
  useBackend: boolean;
}

/**
 * 图谱数据响应
 */
export interface GraphDataResponse {
  nodes: Array<{
    id: string;
    label: string;
    type: string;
    properties: Record<string, unknown>;
  }>;
  edges: Array<{
    source: string;
    target: string;
    type: string;
    properties: Record<string, unknown>;
  }>;
}

// ============================================================
// 项目数据相关类型
// ============================================================

/**
 * 项目更新函数类型
 */
export type ProjectUpdateFunction = (data: import('./types').ProjectState) => void;

/**
 * 角色更新数据
 */
export interface CharacterUpdateData {
  id: string;
  name?: string;
  description?: string;
  role?: string;
  alignment?: string;
  tags?: string[];
  desire?: string;
  fear?: string;
  signature?: string;
  contrast?: string;
  weakness?: string;
  relationships?: string;
  structuredRelations?: CharacterRelation[];
}

// ============================================================
// 错误处理类型
// ============================================================

/**
 * API错误响应
 */
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

/**
 * 异步错误类型守卫
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as ApiError).message === 'string'
  );
}

/**
 * 获取错误消息
 */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return '发生未知错误';
}

// ============================================================
// 角色关系可视化类型
// ============================================================

/**
 * 关系时间线条目
 */
export interface RelationshipTimelineEntry {
  timestamp: number;
  echoId: string;
  relation: string;
  trajectory: 'rising' | 'falling' | 'stable';
  weight: number;
  description: string;
}

/**
 * 关系统计数据
 */
export interface RelationshipStatistics {
  totalRelationships: number;
  byType: Record<string, number>;
  averageWeight: number;
  strongestRelationship?: {
    targetName: string;
    weight: number;
  };
}

// ============================================================
// 角色深度面板类型
// ============================================================

/**
 * 角色深度属性
 */
export interface CharacterDepthAttributes {
  characterId: string;
  name: string;
  alignment?: string;
  tags?: string[];
  desire?: string;
  fear?: string;
  signature?: string;
  contrast?: string;
  weakness?: string;
  relationships?: string;
  structuredRelations?: CharacterRelation[];
  originLocation?: string;
  residence?: string;
  controlledTerritories?: string[];
}

// ============================================================
// 通用组件Props类型
// ============================================================

/**
 * 加载状态Props
 */
export interface WithLoadingProps {
  loading?: boolean;
}

/**
 * 错误状态Props
 */
export interface WithErrorProps {
  error?: string | null;
}

/**
 * 项目上下文Props
 */
export interface WithProjectContextProps {
  projectId: string;
  useBackend: boolean;
}

/**
 * 可选ID Props
 */
export interface WithOptionalIdProps {
  id?: string;
}
