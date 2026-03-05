/**
 * Neo4j Graph Database Service
 * 
 * Manages the knowledge graph that models relationships between
 * characters, world settings, and story events.
 * 
 * Node Types: Character, WorldSetting, Event (from Timeline)
 * Edge Types: KNOWS, LOVES, HATES, ALLY_OF, ENEMY_OF, LOCATED_IN,
 *             GOVERNS, CAUSED, INVOLVED_IN, RELATED_TO
 */

import neo4j, { Driver, Session } from 'neo4j-driver';

let driver: Driver | null = null;

export const initNeo4j = (): Driver => {
    const uri = process.env.NEO4J_URI;
    const user = process.env.NEO4J_USER;
    const password = process.env.NEO4J_PASSWORD;

    if (!uri || !user) {
        throw new Error('Missing Neo4j connection configuration (NEO4J_URI, NEO4J_USER)');
    }

    driver = neo4j.driver(uri, neo4j.auth.basic(user, password || ''));
    console.log(`🔗 Neo4j connected to ${uri}`);
    return driver;
};

export const getDriver = (): Driver => {
    if (!driver) throw new Error('Neo4j driver not initialized');
    return driver;
};

export const closeNeo4j = async () => {
    if (driver) {
        await driver.close();
        driver = null;
    }
};

// ============================================
// Sync: Push project data from MySQL into Neo4j
// ============================================

export const syncProjectToGraph = async (projectData: any): Promise<void> => {
    const d = getDriver();
    const session = d.session();

    try {
        const projectId = projectData.id;

        // 1. Clear existing graph data for this project
        await session.run(
            `MATCH (n {projectId: $projectId}) DETACH DELETE n`,
            { projectId }
        );

        // 2. Create Character nodes
        if (projectData.characters?.length > 0) {
            for (const char of projectData.characters) {
                await session.run(
                    `CREATE (c:Character {
            id: $id, name: $name, role: $role, archetype: $archetype,
            description: $description, projectId: $projectId
          })`,
                    {
                        id: char.id,
                        name: char.name,
                        role: char.role || '',
                        archetype: char.archetype || '',
                        description: (char.description || '').substring(0, 500),
                        projectId,
                    }
                );
            }
        }

        // 3. Create WorldSetting nodes
        if (projectData.worldSettings?.length > 0) {
            for (const ws of projectData.worldSettings) {
                await session.run(
                    `CREATE (w:WorldSetting {
            id: $id, title: $title, category: $category,
            content: $content, projectId: $projectId
          })`,
                    {
                        id: ws.id,
                        title: ws.title,
                        category: ws.category || '',
                        content: (ws.content || '').substring(0, 500),
                        projectId,
                    }
                );
            }
        }

        // 4. Create TimelineEvent nodes
        if (projectData.timeline?.length > 0) {
            for (const evt of projectData.timeline) {
                await session.run(
                    `CREATE (e:Event {
            id: $id, title: $title, worldDate: $worldDate,
            description: $description, type: $type, projectId: $projectId
          })`,
                    {
                        id: evt.id,
                        title: evt.title,
                        worldDate: evt.worldDate || '',
                        description: (evt.description || '').substring(0, 500),
                        type: evt.type || 'SCENE',
                        projectId,
                    }
                );

                // Link events to involved characters
                const entities: string[] = Array.isArray(evt.involvedEntities)
                    ? evt.involvedEntities
                    : [];
                for (const entityId of entities) {
                    await session.run(
                        `MATCH (e:Event {id: $eventId, projectId: $projectId})
             MATCH (c {id: $entityId, projectId: $projectId})
             CREATE (c)-[:INVOLVED_IN]->(e)`,
                        { eventId: evt.id, entityId, projectId }
                    );
                }
            }
        }

        // 5. Create Echo-based relationships
        if (projectData.echoes?.length > 0) {
            const acceptedEchoes = projectData.echoes.filter(
                (e: any) => e.status === 'ACCEPTED'
            );
            for (const echo of acceptedEchoes) {
                // Link echo description as a relationship property
                await session.run(
                    `MATCH (target {id: $targetId, projectId: $projectId})
           CREATE (echo:Echo {
             id: $id, description: $description, reason: $reason,
             type: $type, status: $status, projectId: $projectId
           })
           CREATE (target)-[:HAS_ECHO]->(echo)`,
                    {
                        id: echo.id,
                        targetId: echo.targetId,
                        description: echo.description,
                        reason: echo.reason,
                        type: echo.type,
                        status: echo.status,
                        projectId,
                    }
                );
            }
        }

        // 6. Infer character-to-character relationships from text
        if (projectData.characters?.length > 0) {
            for (const char of projectData.characters) {
                if (!char.relationships) continue;
                const relText = char.relationships.toLowerCase();

                // Find other characters mentioned in this character's relationships
                for (const other of projectData.characters) {
                    if (other.id === char.id) continue;
                    if (relText.includes(other.name.toLowerCase())) {
                        // Determine relationship type from keywords
                        let relType = 'RELATED_TO';
                        if (/仇|恨|敌|对立|对抗|仇恨/.test(relText)) relType = 'ENEMY_OF';
                        else if (/爱|恋|喜欢|暗恋|情|爱慕/.test(relText)) relType = 'LOVES';
                        else if (/友|伙伴|盟友|同伴|挚友/.test(relText)) relType = 'ALLY_OF';
                        else if (/师|导师|徒|学生|老师/.test(relText)) relType = 'MENTORS';
                        else if (/族|亲|兄|弟|姐|妹|父|母|子|女|血缘/.test(relText)) relType = 'KIN_OF';

                        await session.run(
                            `MATCH (a:Character {id: $fromId, projectId: $projectId})
               MATCH (b:Character {id: $toId, projectId: $projectId})
               MERGE (a)-[:${relType}]->(b)`,
                            { fromId: char.id, toId: other.id, projectId }
                        );
                    }
                }
            }
        }

        // 7. Link characters to world settings by content overlap
        if (projectData.characters?.length > 0 && projectData.worldSettings?.length > 0) {
            for (const char of projectData.characters) {
                const charDesc = (char.description || '').toLowerCase();
                for (const ws of projectData.worldSettings) {
                    // Check if the world setting title appears in character description
                    if (charDesc.includes(ws.title.toLowerCase())) {
                        await session.run(
                            `MATCH (c:Character {id: $charId, projectId: $projectId})
               MATCH (w:WorldSetting {id: $wsId, projectId: $projectId})
               MERGE (c)-[:LOCATED_IN]->(w)`,
                            { charId: char.id, wsId: ws.id, projectId }
                        );
                    }
                }
            }
        }

        console.log(`📊 Graph synced for project ${projectId}: ${projectData.characters?.length || 0} chars, ${projectData.worldSettings?.length || 0} settings, ${projectData.timeline?.length || 0} events`);
    } finally {
        await session.close();
    }
};

// ============================================
// Query: Get the full graph for a project
// ============================================

export const getProjectGraph = async (projectId: string): Promise<{
    nodes: any[];
    edges: any[];
}> => {
    const d = getDriver();
    const session = d.session();

    try {
        // Get all nodes
        const nodesResult = await session.run(
            `MATCH (n {projectId: $projectId})
       RETURN n, labels(n) as labels`,
            { projectId }
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

        // Get all relationships
        const edgesResult = await session.run(
            `MATCH (a {projectId: $projectId})-[r]->(b {projectId: $projectId})
       RETURN a.id as source, b.id as target, type(r) as relType, properties(r) as props`,
            { projectId }
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

// ============================================
// Query: Find shortest path between two entities
// ============================================

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

// ============================================
// Query: Get neighbors of a specific node
// ============================================

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

// ============================================
// Mutation: Create a manual edge
// ============================================

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
