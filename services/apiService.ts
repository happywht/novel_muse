import {
    ProjectState, Character, WorldSetting, Draft, Chapter, Echo,
    KnowledgeTriple, Faction, PropagationRisk, PhysicalStatus
} from '../types';

const API_BASE = 'http://localhost:3001/api';

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
    const res = await fetch(`${API_BASE}/projects`);
    if (!res.ok) throw new Error(`Failed to fetch projects: ${res.statusText}`);
    return res.json();
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

/** Fetch the full knowledge graph for a project */
export const fetchGraph = async (projectId: string): Promise<GraphData> => {
    const res = await fetch(`${API_BASE}/graph/${projectId}`);
    if (!res.ok) throw new Error(`Failed to fetch graph: ${res.statusText}`);
    return res.json();
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
    const response = await fetch(`${API_BASE}/graph/${projectId}/subgraph?anchors=${encodeURIComponent(anchors.join(','))}&branchId=${branchId}`);
    if (!response.ok) throw new Error('Failed to fetch subgraph');
    const data = await response.json();
    return data.subgraph;
};

export const fetchNarrativeInsights = async (projectId: string, branchId: string = 'main'): Promise<any[]> => {
    const response = await fetch(`${API_BASE}/graph/${projectId}/insights?branchId=${branchId}`);
    if (!response.ok) throw new Error('Failed to fetch narrative insights');
    return await response.json();
};

export const fetchPhysicalStatus = async (projectId: string, characterNames: string[], branchId: string = 'main'): Promise<PhysicalStatus[]> => {
    const response = await fetch(`${API_BASE}/graph/${projectId}/physical-status?names=${encodeURIComponent(characterNames.join(','))}&branchId=${branchId}`);
    if (!response.ok) throw new Error('Failed to fetch physical status');
    return response.json();
};

/**
 * Task 2.1 & 2.2: Fetch pending foreshadowing hooks
 */
export const fetchUnresolvedForeshadowing = async (projectId: string, branchId: string = 'main'): Promise<KnowledgeTriple[]> => {
    const response = await fetch(`${API_BASE}/graph/${projectId}/foreshadowing?branchId=${branchId}`);
    if (!response.ok) throw new Error('Failed to fetch foreshadowing');
    return response.json();
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
    const response = await fetch(`${API_BASE}/graph/${projectId}/factions`);
    if (!response.ok) return [];
    return await response.json();
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
