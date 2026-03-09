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
