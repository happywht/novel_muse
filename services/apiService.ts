/**
 * @deprecated 此文件已废弃，请使用 services/api 模块
 *
 * 迁移指南：
 * - import { fetchProject } from '@/services/apiService'
 * + import { projectApi } from '@/services/api'
 * - const project = await fetchProject(id)
 * + const project = await projectApi.get(id)
 *
 * 所有 API 已拆分为以下领域模块：
 * - services/api/client.ts - HTTP 客户端
 * - services/api/projectApi.ts - 项目管理
 * - services/api/graphApi.ts - 知识图谱
 * - services/api/characterApi.ts - 角色管理
 * - services/api/echoApi.ts - Echo 操作
 * - services/api/forgeApi.ts - Forge 图谱
 * - services/api/chapterApi.ts - 章节分析
 * - services/api/systemApi.ts - 系统健康
 */

import {
    ProjectState,
    Character,
    WorldSetting,
    Draft,
    Chapter,
    Echo,
    KnowledgeTriple,
    Faction,
    PropagationRisk,
    PhysicalStatus,
    DeepPartial
} from '../types';
import {
    ApiError,
    createApiErrorFromResponse
} from './errors';
import type {
    ProjectSummary,
    ProjectDTO,
    CreateProjectResponse,
    GraphDTO,
    NodeNeighborsDTO,
    SubgraphResponse,
    CharacterTraitsDTO,
    CharacterEvolutionEntryDTO,
    CharacterForeshadowingEntryDTO,
    RelationshipTimelineEntryDTO,
    EchoForeshadowingEntryDTO,
    ContradictionEntryDTO,
    ChapterDependenciesDTO,
    ChapterCharacterNetworkDTO,
    ConflictHeatmapEntryDTO,
    ForgeGraphContextDTO,
    ForgeSyncResultDTO,
    ConsistencyIssueDTO,
    BatchOperationHistoryItemDTO,
    BatchOperationResponseDTO,
    BatchOperationHistoryResponseDTO,
    UndoBatchOperationResponseDTO,
    ProjectStatisticsDTO,
    ChapterContentDTO,
    PlotNodeContextDTO,
    NarrativeInsightDTO
} from '../types/api';

// 导出常量
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

// 导出类型
export type { GraphNodeDTO as GraphNode, GraphEdgeDTO as GraphEdge, GraphDTO as GraphData } from '../types/api';
export type { ForgeGraphContextDTO as ForgeGraphContext } from '../types/api';
export type { ConsistencyIssueDTO as ConsistencyIssue } from '../types/api';
export type { BatchOperationHistoryItemDTO as BatchOperationHistoryItem } from '../types/api';
export type { ProjectStatisticsDTO as ProjectStatistics } from '../types/api';

// 导出新的 API 模块（推荐使用）
export {
    apiClient,
    ApiClient,
    projectApi,
    graphApi,
    characterApi,
    echoApi,
    forgeApi,
    chapterApi,
    systemApi,
    api,
} from './api';

// ============================================
// 向后兼容导出（已废弃）
// ============================================

/** @deprecated 使用 systemApi.checkHealth() 代替 */
export const isBackendAvailable = () => import('./api').then(m => m.systemApi.checkHealth());

/** @deprecated 使用 projectApi.list() 代替 */
export const fetchProjectList = () => import('./api').then(m => m.projectApi.list());

/** @deprecated 使用 projectApi.get() 代替 */
export const fetchProject = (id: string) => import('./api').then(m => m.projectApi.get(id));

/** @deprecated 使用 projectApi.getChapter() 代替 */
export const fetchChapter = (projectId: string, chapterId: string) =>
    import('./api').then(m => m.projectApi.getChapter(projectId, chapterId));

/** @deprecated 使用 projectApi.getChaptersContent() 代替 */
export const fetchChaptersContent = (projectId: string) =>
    import('./api').then(m => m.projectApi.getChaptersContent(projectId));

/** @deprecated 使用 projectApi.create() 代替 */
export const createProject = () => import('./api').then(m => m.projectApi.create());

/** @deprecated 使用 projectApi.syncFull() 代替 */
export const syncProject = (project: ProjectDTO) => import('./api').then(m => m.projectApi.syncFull(project));

/** @deprecated 使用 projectApi.patch() 代替 */
export const patchProject = (id: string, delta: DeepPartial<ProjectState>) =>
    import('./api').then(m => m.projectApi.patch(id, delta));

/** @deprecated 使用 projectApi.delete() 代替 */
export const deleteProjectApi = (id: string) => import('./api').then(m => m.projectApi.delete(id));

/** @deprecated 使用 graphApi.get() 代替 */
export const fetchGraph = (projectId: string, types?: string[]) =>
    import('./api').then(m => m.graphApi.get(projectId, types));

/** @deprecated 使用 graphApi.getNeighbors() 代替 */
export const fetchNeighbors = (projectId: string, nodeId: string) =>
    import('./api').then(m => m.graphApi.getNeighbors(projectId, nodeId));

/** @deprecated 使用 graphApi.createEdge() 代替 */
export const createEdgeApi = (projectId: string, sourceId: string, targetId: string, type: string) =>
    import('./api').then(m => m.graphApi.createEdge(projectId, sourceId, targetId, type));

/** @deprecated 使用 graphApi.getSubgraph() 代替 */
export const fetchRelatedSubgraph = (projectId: string, anchors: string[], branchId: string = 'main') =>
    import('./api').then(m => m.graphApi.getSubgraph(projectId, anchors, branchId));

/** @deprecated 使用 graphApi.getNarrativeInsights() 代替 */
export const fetchNarrativeInsights = (projectId: string, branchId: string = 'main') =>
    import('./api').then(m => m.graphApi.getNarrativeInsights(projectId, branchId));

/** @deprecated 使用 graphApi.getPhysicalStatus() 代替 */
export const fetchPhysicalStatus = (projectId: string, characterNames: string[], branchId: string = 'main') =>
    import('./api').then(m => m.graphApi.getPhysicalStatus(projectId, characterNames, branchId));

/** @deprecated 使用 graphApi.getUnresolvedForeshadowing() 代替 */
export const fetchUnresolvedForeshadowing = (projectId: string, branchId: string = 'main') =>
    import('./api').then(m => m.graphApi.getUnresolvedForeshadowing(projectId, branchId));

/** @deprecated 使用 graphApi.mergeBranch() 代替 */
export const mergeBranchApi = (projectId: string, branchId: string) =>
    import('./api').then(m => m.graphApi.mergeBranch(projectId, branchId));

/** @deprecated 使用 graphApi.getFactions() 代替 */
export const fetchFactions = (projectId: string) =>
    import('./api').then(m => m.graphApi.getFactions(projectId));

/** @deprecated 使用 graphApi.simulatePropagation() 代替 */
export const simulatePropagation = (projectId: string, triggerName: string, changeDescription: string) =>
    import('./api').then(m => m.graphApi.simulatePropagation(projectId, triggerName, changeDescription));

/** @deprecated 使用 graphApi.getPlotNodeContext() 代替 */
export const fetchPlotNodeContext = (projectId: string, plotNodeId?: string) =>
    import('./api').then(m => m.graphApi.getPlotNodeContext(projectId, plotNodeId));

/** @deprecated 使用 characterApi.getTraits() 代替 */
export const fetchCharacterTraits = (projectId: string, characterId: string) =>
    import('./api').then(m => m.characterApi.getTraits(projectId, characterId));

/** @deprecated 使用 characterApi.getEvolution() 代替 */
export const fetchCharacterEvolution = (projectId: string, characterId: string) =>
    import('./api').then(m => m.characterApi.getEvolution(projectId, characterId));

/** @deprecated 使用 characterApi.getForeshadowing() 代替 */
export const fetchCharacterForeshadowing = (projectId: string, characterId: string) =>
    import('./api').then(m => m.characterApi.getForeshadowing(projectId, characterId));

/** @deprecated 使用 characterApi.getRelationshipTimeline() 代替 */
export const fetchRelationshipTimeline = (projectId: string, char1Id: string, char2Id: string) =>
    import('./api').then(m => m.characterApi.getRelationshipTimeline(projectId, char1Id, char2Id));

/** @deprecated 使用 characterApi.getEchoForeshadowing() 代替 */
export const fetchEchoForeshadowing = (projectId: string, branchId?: string) =>
    import('./api').then(m => m.characterApi.getEchoForeshadowing(projectId, branchId));

/** @deprecated 使用 characterApi.detectContradictions() 代替 */
export const detectContradictions = (projectId: string) =>
    import('./api').then(m => m.characterApi.detectContradictions(projectId));

/** @deprecated 使用 chapterApi.getDependencies() 代替 */
export const fetchChapterDependencies = (projectId: string, chapterId: string) =>
    import('./api').then(m => m.chapterApi.getDependencies(projectId, chapterId));

/** @deprecated 使用 chapterApi.getCharacterNetwork() 代替 */
export const fetchChapterCharacterNetwork = (projectId: string, chapterId: string) =>
    import('./api').then(m => m.chapterApi.getCharacterNetwork(projectId, chapterId));

/** @deprecated 使用 chapterApi.getConflictHeatmap() 代替 */
export const fetchConflictHeatmap = (projectId: string) =>
    import('./api').then(m => m.chapterApi.getConflictHeatmap(projectId));

/** @deprecated 使用 forgeApi.getContext() 代替 */
export const fetchForgeContext = (projectId: string, options?: { characterIds?: string[]; locationId?: string; plotNodeId?: string }) =>
    import('./api').then(m => m.forgeApi.getContext(projectId, options));

/** @deprecated 使用 forgeApi.syncResult() 代替 */
export const syncForgeResult = (projectId: string, result: ForgeSyncResultDTO) =>
    import('./api').then(m => m.forgeApi.syncResult(projectId, result));

/** @deprecated 使用 graphApi.checkConsistency() 代替 */
export const fetchConsistencyCheck = (projectId: string) =>
    import('./api').then(m => m.graphApi.checkConsistency(projectId));

/** @deprecated 使用 echoApi.batchAccept() 代替 */
export const batchAcceptEchoes = (projectId: string, echoIds: string[], syncToGraph: boolean = true) =>
    import('./api').then(m => m.echoApi.batchAccept(projectId, echoIds, syncToGraph));

/** @deprecated 使用 echoApi.batchReject() 代替 */
export const batchRejectEchoes = (projectId: string, echoIds: string[]) =>
    import('./api').then(m => m.echoApi.batchReject(projectId, echoIds));

/** @deprecated 使用 echoApi.undoBatch() 代替 */
export const undoBatchOperation = (projectId: string, operationId?: string) =>
    import('./api').then(m => m.echoApi.undoBatch(projectId, operationId));

/** @deprecated 使用 echoApi.getHistory() 代替 */
export const getBatchOperationHistory = (projectId: string) =>
    import('./api').then(m => m.echoApi.getHistory(projectId));

/** @deprecated 使用 projectApi.getStatistics() 代替 */
export const fetchProjectStatistics = (projectId: string) =>
    import('./api').then(m => m.projectApi.getStatistics(projectId));
