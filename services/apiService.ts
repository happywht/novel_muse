import {
    ProjectState, Character, WorldSetting, Draft, Chapter, Echo,
    KnowledgeTriple, Faction, PropagationRisk, PhysicalStatus
} from '../types';
import { cacheManager, generateCacheKey } from './cacheManager';

export const API_BASE = 'http://localhost:3001/api';

interface ProjectSummary {
    id: string;
    title: string;
    genre: string;
    lastModified: number;
    characterCount: number;
    worldSettingCount: number;
    chapterCount: number;
}

/** Check if the backend server is reachable */
export const isBackendAvailable = async (): Promise<boolean> => {
    try {
        const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2000) });
        return res.ok;
    } catch {
        return false;
    }
};

/** Fetch project list from the backend */
export const fetchProjectList = async (): Promise<ProjectSummary[]> => {
    const cacheKey = generateCacheKey('projectList');
    
    const cached = await cacheManager.get<ProjectSummary[]>(cacheKey);
    if (cached) {
        return cached;
    }
    
    const res = await fetch(`${API_BASE}/projects`);
    if (!res.ok) throw new Error(`Failed to fetch projects: ${res.statusText}`);
    const data = res.json();
    
    // Cache the result
    const result = await data;
    await cacheManager.set(cacheKey, result);
    
    return result;
};

/** Fetch a full project by ID */
export const fetchProject = async (id: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/projects/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch project: ${res.statusText}`);
    return res.json();
};

/** Fetch individual chapter content from the backend */
export const fetchChapter = async (projectId: string, chapterId: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/projects/${projectId}/chapters/${chapterId}`);
    if (!res.ok) throw new Error(`Failed to fetch chapter: ${res.statusText}`);
    return res.json();
};

/** Fetch all non-empty chapter contents for a project */
export const fetchChaptersContent = async (projectId: string): Promise<{ id: string, content: string }[]> => {
    const res = await fetch(`${API_BASE}/projects/${projectId}/chapters-content`);
    if (!res.ok) throw new Error(`Failed to fetch chapters content: ${res.statusText}`);
    return res.json();
};

/** Create a new project on the backend */
export const createProject = async (): Promise<{ id: string; title: string }> => {
    const res = await fetch(`${API_BASE}/projects`, { method: 'POST' });
    if (!res.ok) throw new Error(`Failed to create project: ${res.statusText}`);
    return res.json();
};

/** Full-sync: save the entire ProjectState to the backend */
export const syncProject = async (project: any): Promise<void> => {
    const res = await fetch(`${API_BASE}/projects/${project.id}/full`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project),
    });
    if (!res.ok) throw new Error(`Failed to sync project: ${res.statusText}`);
};

/** Incremental sync: save only changed fields to the backend */
export const patchProject = async (id: string, delta: any): Promise<void> => {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(delta),
    });
    if (!res.ok) throw new Error(`Failed to patch project: ${res.statusText}`);
};

/** Delete a project on the backend */
export const deleteProjectApi = async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete project: ${res.statusText}`);
};

// ============================================
// Graph API
// ============================================
export interface GraphNode {
    id: string;
    label: string;
    type: 'Character' | 'WorldSetting' | 'Event' | 'Echo' | string;
    properties: Record<string, any>;
}

export interface GraphEdge {
    source: string;
    target: string;
    type: string;
    properties: Record<string, any>;
}

export interface GraphData {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

/** Fetch the knowledge graph for a project with optional filtering */
export const fetchGraph = async (projectId: string, types?: string[]): Promise<GraphData> => {
    const cacheKey = generateCacheKey('graph', projectId, types);
    
    const cached = await cacheManager.get<GraphData>(cacheKey);
    if (cached) {
        return cached;
    }
    
    const url = types && types.length > 0
        ? `${API_BASE}/graph/${projectId}?types=${encodeURIComponent(types.join(','))}`
        : `${API_BASE}/graph/${projectId}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch graph: ${res.statusText}`);
    const data = res.json();
    
    // Cache the result
    const result = await data;
    await cacheManager.set(cacheKey, result);
    
    return result;
};

/** Fetch neighbors of a specific node */
export const fetchNeighbors = async (projectId: string, nodeId: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/graph/${projectId}/neighbors/${nodeId}`);
    if (!res.ok) throw new Error(`Failed to fetch neighbors: ${res.statusText}`);
    return res.json();
};

/** Create a new edge (relationship) between two nodes */
export const createEdgeApi = async (projectId: string, sourceId: string, targetId: string, type: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/graph/${projectId}/edge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, targetId, type })
    });
    if (!res.ok) throw new Error(`Failed to create edge: ${res.statusText}`);
};

/** Fetch relevant subgraph for scene generation context */
export const fetchRelatedSubgraph = async (projectId: string, anchors: string[], branchId: string = 'main'): Promise<string> => {
    const cacheKey = generateCacheKey('subgraph', projectId, anchors.join(','), branchId);
    
    const cached = await cacheManager.get<string>(cacheKey);
    if (cached) {
        return cached;
    }
    
    const response = await fetch(`${API_BASE}/graph/${projectId}/subgraph?anchors=${encodeURIComponent(anchors.join(','))}&branchId=${branchId}`);
    if (!response.ok) throw new Error('Failed to fetch subgraph');
    const data = await response.json();
    
    await cacheManager.set(cacheKey, data.subgraph);
    
    return data.subgraph;
};

/** Fetch narrative insights */
export const fetchNarrativeInsights = async (projectId: string, branchId: string = 'main'): Promise<any[]> => {
    const cacheKey = generateCacheKey('narrativeInsights', projectId, branchId);
    
    const cached = await cacheManager.get<any[]>(cacheKey);
    if (cached) {
        return cached;
    }
    
    const response = await fetch(`${API_BASE}/graph/${projectId}/insights?branchId=${branchId}`);
    if (!response.ok) throw new Error('Failed to fetch narrative insights');
    
    const data = await response.json();
    await cacheManager.set(cacheKey, data);
    
    return data;
};

export const fetchPhysicalStatus = async (projectId: string, characterNames: string[], branchId: string = 'main'): Promise<PhysicalStatus[]> => {
    const cacheKey = generateCacheKey('physicalStatus', projectId, characterNames.join(','), branchId);
    
    const cached = await cacheManager.get<PhysicalStatus[]>(cacheKey);
    if (cached) {
        return cached;
    }
    
    const response = await fetch(`${API_BASE}/graph/${projectId}/physical-status?names=${encodeURIComponent(characterNames.join(','))}&branchId=${branchId}`);
    if (!response.ok) throw new Error('Failed to fetch physical status');
    
    const data = await response.json();
    await cacheManager.set(cacheKey, data);
    
    return data;
};

/**
 * Task 2.1 & 2.2: Fetch pending foreshadowing hooks
 */
export const fetchUnresolvedForeshadowing = async (projectId: string, branchId: string = 'main'): Promise<KnowledgeTriple[]> => {
    const cacheKey = generateCacheKey('foreshadowing', projectId, branchId);
    
    const cached = await cacheManager.get<KnowledgeTriple[]>(cacheKey);
    if (cached) {
        return cached;
    }
    
    const response = await fetch(`${API_BASE}/graph/${projectId}/foreshadowing?branchId=${branchId}`);
    if (!response.ok) throw new Error('Failed to fetch foreshadowing');
    
    const data = await response.json();
    await cacheManager.set(cacheKey, data);
    
    return data;
};

/**
 * Task 2.2: Merge a sandbox branch into the main branch
 */
export const mergeBranchApi = async (projectId: string, branchId: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/graph/${projectId}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchId }),
    });
    if (!response.ok) throw new Error('Failed to merge branch');
};

// Task 5.1: Fetch faction groups
export const fetchFactions = async (projectId: string): Promise<Faction[]> => {
    const cacheKey = generateCacheKey('factions', projectId);
    
    const cached = await cacheManager.get<Faction[]>(cacheKey);
    if (cached) {
        return cached;
    }
    
    const response = await fetch(`${API_BASE}/graph/${projectId}/factions`);
    if (!response.ok) return [];
    
    const data = await response.json();
    await cacheManager.set(cacheKey, data);
    
    return data;
};

// Task 5.2: Simulate state propagation (Butterfly Effect)
export const simulatePropagation = async (projectId: string, triggerName: string, changeDescription: string): Promise<PropagationRisk[]> => {
    const response = await fetch(`${API_BASE}/graph/${projectId}/propagate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggerName, changeDescription })
    });
    if (!response.ok) return [];
    return await response.json();
};

/**
 * Fetch plot node context from knowledge graph
 * Returns related plot nodes, characters, world settings, and relationships
 */
export const fetchPlotNodeContext = async (
    projectId: string,
    plotNodeId?: string
): Promise<{
    plotNodes: any[];
    characters: any[];
    worldSettings: any[];
    relationships: any[];
}> => {
    const url = plotNodeId
        ? `${API_BASE}/graph/plot-context/${projectId}/${plotNodeId}`
        : `${API_BASE}/graph/plot-context/${projectId}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch plot context');
    return response.json();
};

// ============================================
// Character Graph APIs
// ============================================

/**
 * 获取角色特质
 */
export const fetchCharacterTraits = async (
    projectId: string,
    characterId: string
): Promise<{
    characterId: string;
    characterName: string;
    desire: string | null;
    fear: string | null;
    weakness: string | null;
    signature: string | null;
    contrast: string | null;
} | null> => {
    const response = await fetch(`${API_BASE}/graph/${projectId}/characters/${characterId}/traits`);
    if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch character traits');
    }
    return response.json();
};

/**
 * 获取角色演变历史
 */
export const fetchCharacterEvolution = async (
    projectId: string,
    characterId: string
): Promise<Array<{
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
}>> => {
    const response = await fetch(`${API_BASE}/graph/${projectId}/characters/${characterId}/evolution`);
    if (!response.ok) throw new Error('Failed to fetch character evolution');
    return response.json();
};

/**
 * 获取角色伏笔
 */
export const fetchCharacterForeshadowing = async (
    projectId: string,
    characterId: string
): Promise<Array<{
    id: string;
    type: string;
    subject: string;
    relation: string;
    object: string;
    status: 'OPEN' | 'RESOLVED' | 'ABANDONED';
    weight?: number;
    relatedPlotNodes?: any[];
}>> => {
    const response = await fetch(`${API_BASE}/graph/${projectId}/characters/${characterId}/foreshadowing`);
    if (!response.ok) throw new Error('Failed to fetch character foreshadowing');
    return response.json();
};

// ============================================
// Echo Graph APIs
// ============================================

/**
 * 获取关系时间线
 */
export const fetchRelationshipTimeline = async (
    projectId: string,
    char1Id: string,
    char2Id: string
): Promise<Array<{
    timestamp: number;
    echoId: string;
    relation: string;
    trajectory: string;
    weight: number;
    description: string;
}>> => {
    const response = await fetch(
        `${API_BASE}/graph/${projectId}/relationship-timeline?char1Id=${char1Id}&char2Id=${char2Id}`
    );
    if (!response.ok) throw new Error('Failed to fetch relationship timeline');
    return response.json();
};

/**
 * 获取未回收伏笔（Echo）
 */
export const fetchEchoForeshadowing = async (
    projectId: string,
    branchId?: string
): Promise<Array<{
    subject: string;
    relation: string;
    object: string;
    echoId: string;
    createdAt: number;
    relatedChapter?: string;
}>> => {
    const url = branchId
        ? `${API_BASE}/graph/${projectId}/echo-foreshadowing?branchId=${branchId}`
        : `${API_BASE}/graph/${projectId}/echo-foreshadowing`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch echo foreshadowing');
    return response.json();
};

/**
 * 检测矛盾
 */
export const detectContradictions = async (
    projectId: string
): Promise<Array<{
    type: 'RELATIONSHIP_CONFLICT' | 'STATE_MISMATCH' | 'TEMPORAL_ERROR';
    description: string;
    entities: string[];
    conflictingEchoes: string[];
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
}>> => {
    const response = await fetch(`${API_BASE}/graph/${projectId}/contradictions`);
    if (!response.ok) throw new Error('Failed to detect contradictions');
    return response.json();
};

// ============================================
// Outliner Graph APIs
// ============================================

/**
 * 获取章节依赖
 */
export const fetchChapterDependencies = async (
    projectId: string,
    chapterId: string
): Promise<{
    chapter: any;
    plotNode?: any;
    involvedCharacters: any[];
    setLocation?: any;
    beats: any[];
    predecessor?: any;
    successor?: any;
}> => {
    const response = await fetch(`${API_BASE}/graph/${projectId}/chapters/${chapterId}/dependencies`);
    if (!response.ok) throw new Error('Failed to fetch chapter dependencies');
    return response.json();
};

/**
 * 获取章节角色网络
 */
export const fetchChapterCharacterNetwork = async (
    projectId: string,
    chapterId: string
): Promise<{
    characters: any[];
    relationships: Array<{
        subject: string;
        relation: string;
        object: string;
        weight: number;
    }>;
}> => {
    const response = await fetch(`${API_BASE}/graph/${projectId}/chapters/${chapterId}/character-network`);
    if (!response.ok) throw new Error('Failed to fetch chapter character network');
    return response.json();
};

/**
 * 获取冲突热力图
 */
export const fetchConflictHeatmap = async (
    projectId: string
): Promise<Array<{
    chapterId: string;
    chapterTitle: string;
    intensity: number;
    conflictType: string;
    participants: string[];
}>> => {
    const response = await fetch(`${API_BASE}/graph/${projectId}/conflict-heatmap`);
    if (!response.ok) throw new Error('Failed to fetch conflict heatmap');
    return response.json();
};

// ============================================
// Forge Graph APIs
// ============================================

/**
 * Forge图谱上下文类型
 */
export interface ForgeGraphContext {
    characters: Array<{
        id: string;
        name: string;
        role: string;
        physicalStatus: string;
        location?: string;
        desire?: string;
        fear?: string;
        weakness?: string;
        signature?: string;
        relationships: Array<{
            targetName: string;
            type: string;
            trajectory?: string;
            weight: number;
        }>;
    }>;
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
 * 获取Forge上下文
 */
export const fetchForgeContext = async (
    projectId: string,
    options?: {
        characterIds?: string[];
        locationId?: string;
        plotNodeId?: string;
    }
): Promise<ForgeGraphContext> => {
    const params = new URLSearchParams();
    if (options?.characterIds && options.characterIds.length > 0) {
        params.set('characterIds', options.characterIds.join(','));
    }
    if (options?.locationId) {
        params.set('locationId', options.locationId);
    }
    if (options?.plotNodeId) {
        params.set('plotNodeId', options.plotNodeId);
    }

    const url = params.toString()
        ? `${API_BASE}/graph/${projectId}/forge-context?${params.toString()}`
        : `${API_BASE}/graph/${projectId}/forge-context`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch forge context');
    return response.json();
};

/**
 * 同步Forge结果
 */
export const syncForgeResult = async (
    projectId: string,
    result: {
        chapterId: string;
        echoes: any[];
        physicalStatusUpdates?: any[];
    }
): Promise<void> => {
    const response = await fetch(`${API_BASE}/graph/${projectId}/forge-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result)
    });
    if (!response.ok) throw new Error('Failed to sync forge result');
};

// ============================================
// World Consistency Check API
// ============================================

/**
 * 一致性问题类型定义
 */
export interface ConsistencyIssue {
    type: 'SPATIAL_CONFLICT' | 'HIERARCHY_CYCLE' | 'LOGICAL_CONTRADICTION';
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
    entities: Array<{
        id: string;
        name: string;
        type: string;
    }>;
    details?: string;
    suggestion?: string;
}

/**
 * 检测世界观一致性
 * @param projectId 项目ID
 * @returns Promise<ConsistencyIssue[]> 问题列表
 */
export const fetchConsistencyCheck = async (projectId: string): Promise<ConsistencyIssue[]> => {
    const res = await fetch(`${API_BASE}/graph/${projectId}/consistency-check`);
    if (!res.ok) throw new Error(`Failed to check world consistency: ${res.statusText}`);
    return res.json();
};

// ============================================
// Echo批量操作API
// ============================================

/**
 * 批量操作历史项
 */
export interface BatchOperationHistoryItem {
    id: string;
    operation: 'BATCH_ACCEPT' | 'BATCH_REJECT';
    echoCount: number;
    timestamp: number;
    canUndo: boolean;
}

/**
 * 批量接受Echo
 * @param projectId 项目ID
 * @param echoIds Echo ID数组
 * @param syncToGraph 是否同步到图谱
 */
export const batchAcceptEchoes = async (
    projectId: string,
    echoIds: string[],
    syncToGraph: boolean = true
): Promise<{ success: boolean; operationId: string; affectedCount: number; message: string }> => {
    const response = await fetch(`${API_BASE}/projects/${projectId}/echoes/batch-accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ echoIds, syncToGraph })
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to batch accept echoes');
    }
    return response.json();
};

/**
 * 批量拒绝Echo
 * @param projectId 项目ID
 * @param echoIds Echo ID数组
 */
export const batchRejectEchoes = async (
    projectId: string,
    echoIds: string[]
): Promise<{ success: boolean; operationId: string; affectedCount: number; message: string }> => {
    const response = await fetch(`${API_BASE}/projects/${projectId}/echoes/batch-reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ echoIds })
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to batch reject echoes');
    }
    return response.json();
};

/**
 * 撤销批量操作
 * @param projectId 项目ID
 * @param operationId 操作ID（可选）
 */
export const undoBatchOperation = async (
    projectId: string,
    operationId?: string
): Promise<{ success: boolean; undoneCount: number; message: string }> => {
    const response = await fetch(`${API_BASE}/projects/${projectId}/echoes/undo-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationId })
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to undo batch operation');
    }
    return response.json();
};

/**
 * 获取批量操作历史
 * @param projectId 项目ID
 */
export const getBatchOperationHistory = async (
    projectId: string
): Promise<{ operations: BatchOperationHistoryItem[]; total: number }> => {
    const response = await fetch(`${API_BASE}/projects/${projectId}/echoes/batch-history`);
    if (!response.ok) {
        throw new Error('Failed to get batch operation history');
    }
    return response.json();
};

// ============================================
// Dashboard Statistics API
// ============================================

/**
 * 项目统计数据类型
 */
export interface ProjectStatistics {
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

/**
 * 获取仪表盘专用统计数据
 * @param projectId 项目ID
 */
export const fetchProjectStatistics = async (projectId: string): Promise<ProjectStatistics> => {
    const cacheKey = generateCacheKey('statistics', projectId);

    const cached = await cacheManager.get<ProjectStatistics>(cacheKey);
    if (cached) {
        return cached;
    }

    const response = await fetch(`${API_BASE}/projects/${projectId}/statistics`);
    if (!response.ok) {
        throw new Error('Failed to fetch project statistics');
    }

    const data = await response.json();
    await cacheManager.set(cacheKey, data);

    return data;
};
