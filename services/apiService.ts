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
