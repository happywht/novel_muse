import { getDriver } from './client';

export interface PhysicalStatus {
    name: string;
    location: string;
    state: string;
    isDead: boolean;
}

/**
 * Get the full graph for a project
 * @param projectId Project ID
 * @param includeTypes Optional list of node labels to include (e.g., ['Character', 'WorldSetting'])
 */
export const getProjectGraph = async (projectId: string, includeTypes?: string[]): Promise<{
    nodes: any[];
    edges: any[];
}> => {
    const d = getDriver();
    const session = d.session();

    try {
        // Build the where clause for labels if provided
        const labelFilter = (includeTypes && includeTypes.length > 0)
            ? `AND any(label IN labels(n) WHERE label IN $includeTypes)`
            : '';

        // Get all nodes
        const nodesResult = await session.run(
            `MATCH (n {projectId: $projectId})
             WHERE 1=1 ${labelFilter}
             RETURN n, labels(n) as labels`,
            { projectId, includeTypes }
        );

        const nodes = nodesResult.records.map(record => {
            const node = record.get('n');
            const labels = record.get('labels') as string[];
            return {
                id: node.properties.id,
                label: node.properties.name || node.properties.title || node.properties.description?.substring(0, 30),
                type: labels[0] || 'Unknown',
                properties: { ...node.properties },
            };
        });

        // Get only edges between included nodes
        const nodeIds = nodes.map(n => n.id);
        const edgesResult = await session.run(
            `MATCH (a {projectId: $projectId})-[r]->(b {projectId: $projectId})
             WHERE a.id IN $nodeIds AND b.id IN $nodeIds
             RETURN a.id as source, b.id as target, type(r) as relType, properties(r) as props`,
            { projectId, nodeIds }
        );

        const edges = edgesResult.records.map(record => ({
            source: record.get('source'),
            target: record.get('target'),
            type: record.get('relType'),
            properties: record.get('props') || {},
        }));

        return { nodes, edges };
    } finally {
        await session.close();
    }
};

/**
 * Find shortest path between two entities
 */
export const findPath = async (
    projectId: string,
    fromId: string,
    toId: string
): Promise<any[]> => {
    const d = getDriver();
    const session = d.session();

    try {
        const result = await session.run(
            `MATCH path = shortestPath(
        (a {id: $fromId, projectId: $projectId})-[*..10]-(b {id: $toId, projectId: $projectId})
       )
       RETURN [n in nodes(path) | {id: n.id, name: coalesce(n.name, n.title), type: labels(n)[0]}] as nodes,
              [r in relationships(path) | {type: type(r)}] as rels`,
            { fromId, toId, projectId }
        );

        if (result.records.length === 0) return [];

        return result.records.map(r => ({
            nodes: r.get('nodes'),
            relationships: r.get('rels'),
        }));
    } finally {
        await session.close();
    }
};

/**
 * Get neighbors of a specific node
 */
export const getNeighbors = async (
    projectId: string,
    nodeId: string
): Promise<{ node: any; neighbors: any[] }> => {
    const d = getDriver();
    const session = d.session();

    try {
        const result = await session.run(
            `MATCH (center {id: $nodeId, projectId: $projectId})
       OPTIONAL MATCH (center)-[r]-(neighbor {projectId: $projectId})
       RETURN center,
              labels(center) as centerLabels,
              collect({
                node: neighbor,
                labels: labels(neighbor),
                relType: type(r),
                direction: CASE WHEN startNode(r) = center THEN 'OUT' ELSE 'IN' END
              }) as neighbors`,
            { nodeId, projectId }
        );

        if (result.records.length === 0) {
            return { node: null, neighbors: [] };
        }

        const record = result.records[0];
        const centerNode = record.get('center');
        const centerLabels = record.get('centerLabels') as string[];

        return {
            node: {
                id: centerNode.properties.id,
                label: centerNode.properties.name || centerNode.properties.title,
                type: centerLabels[0],
                properties: { ...centerNode.properties },
            },
            neighbors: (record.get('neighbors') as any[])
                .filter(n => n.node)
                .map(n => ({
                    id: n.node.properties.id,
                    label: n.node.properties.name || n.node.properties.title,
                    type: n.labels[0],
                    relType: n.relType,
                    direction: n.direction,
                })),
        };
    } finally {
        await session.close();
    }
};

/**
 * Create a manual edge
 */
export const createEdge = async (
    projectId: string,
    sourceId: string,
    targetId: string,
    relType: string
): Promise<void> => {
    const d = getDriver();
    const session = d.session();

    // Sanitize relType to prevent Cypher injection
    const sanitizedRelType = relType.replace(/[^A-Z_]/gi, '').toUpperCase();
    if (!sanitizedRelType) {
        throw new Error('Invalid relationship type');
    }

    try {
        await session.run(
            `MATCH (a {id: $sourceId, projectId: $projectId})
             MATCH (b {id: $targetId, projectId: $projectId})
             MERGE (a)-[r:${sanitizedRelType}]->(b)
             RETURN r`,
            { sourceId, targetId, projectId }
        );
        console.log(`🔗 Created edge ${sourceId} -[:${sanitizedRelType}]-> ${targetId} in project ${projectId}`);
    } finally {
        await session.close();
    }
};

/**
 * Get physical status (location, health, state) for a set of character names
 */
export const getPhysicalStatus = async (
    projectId: string,
    characterNames: string[],
    branchId: string = 'main'
): Promise<PhysicalStatus[]> => {
    const d = getDriver();
    const session = d.session();

    try {
        const result = await session.run(
            `MATCH (c:Character {projectId: $projectId})
             WHERE (c.branchId IS NULL OR c.branchId = 'main' OR c.branchId = $branchId)
             AND c.name IN $names
             OPTIONAL MATCH (c)-[r:LOCATED_IN]->(l:WorldSetting)
             WHERE (r.branchId IS NULL OR r.branchId = 'main' OR r.branchId = $branchId)
             AND (l.branchId IS NULL OR l.branchId = 'main' OR l.branchId = $branchId)
             RETURN c.name as name,
                    l.title as location,
                    c.state as state,
                    c.isDead as isDead`,
            { projectId, names: characterNames, branchId }
        );

        return result.records.map(record => ({
            name: record.get('name'),
            location: record.get('location') || '未知地点',
            state: record.get('state') || '正常',
            isDead: record.get('isDead') === true
        }));
    } catch (err) {
        console.error("Failed to fetch physical status:", err);
        return [];
    } finally {
        await session.close();
    }
};

/**
 * 获取情节节点的完整上下文（用于 AI 生成）
 * @param projectId 项目ID
 * @param plotNodeId 情节节点ID（可选，不传则获取整个项目的情节图）
 */
export const getPlotNodeContext = async (
    projectId: string,
    plotNodeId?: string
): Promise<{
    plotNodes: any[];
    characters: any[];
    worldSettings: any[];
    relationships: any[];
}> => {
    const d = getDriver();
    const session = d.session();

    try {
        // 如果指定了 plotNodeId，获取该节点及其关联信息
        // 否则获取整个项目的情节图

        // 1. 获取 PlotNodes
        const plotNodesResult = plotNodeId
            ? await session.run(
                `MATCH (pn:PlotNode {projectId: $projectId, id: $plotNodeId}) RETURN pn`,
                { projectId, plotNodeId }
            )
            : await session.run(
                `MATCH (pn:PlotNode {projectId: $projectId}) RETURN pn ORDER BY pn.order`,
                { projectId }
            );

        // 2. 获取关联的 Characters
        const charsResult = await session.run(
            `MATCH (pn:PlotNode {projectId: $projectId})-[:INVOLVES]->(c:Character)
             RETURN DISTINCT c`,
            { projectId }
        );

        // 3. 获取关联的 WorldSettings
        const settingsResult = await session.run(
            `MATCH (pn:PlotNode {projectId: $projectId})-[:LOCATED_AT]->(w:WorldSetting)
             RETURN DISTINCT w`,
            { projectId }
        );

        // 4. 获取角色之间的关系
        const relsResult = await session.run(
            `MATCH (c1:Character {projectId: $projectId})-[r]->(c2:Character {projectId: $projectId})
             WHERE type(r) IN ['ENEMY_OF', 'ALLY_OF', 'LOVES', 'KIN_OF', 'MENTORS', 'RIVAL_OF', 'SERVES', 'FRIEND_OF']
             RETURN c1.name as subject, type(r) as relation, c2.name as object, r.weight as weight`,
            { projectId }
        );

        return {
            plotNodes: plotNodesResult.records.map(r => r.get('pn').properties),
            characters: charsResult.records.map(r => r.get('c').properties),
            worldSettings: settingsResult.records.map(r => r.get('w').properties),
            relationships: relsResult.records.map(r => ({
                subject: r.get('subject'),
                relation: r.get('relation'),
                object: r.get('object'),
                weight: r.get('weight')
            }))
        };
    } finally {
        await session.close();
    }
};

/**
 * 获取情节的上下游链路
 */
export const getPlotLineage = async (
    projectId: string,
    plotNodeId: string
): Promise<{
    node: any;
    predecessors: any[];
    successors: any[];
}> => {
    const d = getDriver();
    const session = d.session();

    try {
        // 获取当前节点
        const nodeResult = await session.run(
            `MATCH (pn:PlotNode {projectId: $projectId, id: $plotNodeId}) RETURN pn`,
            { projectId, plotNodeId }
        );

        // 获取前驱节点
        const predResult = await session.run(
            `MATCH (prev:PlotNode {projectId: $projectId})-[:PRECEDES]->(pn:PlotNode {id: $plotNodeId})
             RETURN prev ORDER BY prev.order`,
            { projectId, plotNodeId }
        );

        // 获取后继节点
        const succResult = await session.run(
            `MATCH (pn:PlotNode {id: $plotNodeId})-[:PRECEDES]->(next:PlotNode {projectId: $projectId})
             RETURN next ORDER BY next.order`,
            { projectId, plotNodeId }
        );

        return {
            node: nodeResult.records[0]?.get('pn').properties || null,
            predecessors: predResult.records.map(r => r.get('prev').properties),
            successors: succResult.records.map(r => r.get('next').properties)
        };
    } finally {
        await session.close();
    }
};

/**
 * 获取角色参与的所有冲突场景
 */
export const getCharacterConflicts = async (
    projectId: string,
    characterId: string
): Promise<Array<{
    plotNode: any;
    conflictType: string;
    stakes: string;
    intensity: number;
    otherParticipants: any[];
}>> => {
    const d = getDriver();
    const session = d.session();

    try {
        const result = await session.run(
            `MATCH (c:Character {id: $characterId, projectId: $projectId})<-[r:HAS_CONFLICT_PARTICIPANT]-(pn:PlotNode)
             MATCH (other:Character)<-[:HAS_CONFLICT_PARTICIPANT]-(pn)
             WHERE other.id <> $characterId
             RETURN pn, r.conflictType as conflictType, r.stakes as stakes, r.intensity as intensity, collect(other) as otherParticipants
             ORDER BY r.intensity DESC`,
            { projectId, characterId }
        );

        return result.records.map(record => ({
            plotNode: record.get('pn').properties,
            conflictType: record.get('conflictType'),
            stakes: record.get('stakes'),
            intensity: record.get('intensity'),
            otherParticipants: record.get('otherParticipants').map((n: any) => n.properties)
        }));
    } finally {
        await session.close();
    }
};

/**
 * 获取项目中所有高强度的冲突场景（intensity >= 7）
 */
export const getHighIntensityConflicts = async (
    projectId: string
): Promise<Array<{
    plotNode: any;
    conflictType: string;
    stakes: string;
    intensity: number;
    participants: any[];
}>> => {
    const d = getDriver();
    const session = d.session();

    try {
        const result = await session.run(
            `MATCH (pn:PlotNode {projectId: $projectId})-[r:HAS_CONFLICT_PARTICIPANT]->(c:Character)
             WHERE r.intensity >= 7
             WITH pn, r, collect(c) as participants
             RETURN pn, r.conflictType as conflictType, r.stakes as stakes, r.intensity as intensity, participants
             ORDER BY r.intensity DESC`,
            { projectId }
        );

        return result.records.map(record => ({
            plotNode: record.get('pn').properties,
            conflictType: record.get('conflictType'),
            stakes: record.get('stakes'),
            intensity: record.get('intensity'),
            participants: record.get('participants').map((n: any) => n.properties)
        }));
    } finally {
        await session.close();
    }
};
