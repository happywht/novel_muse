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

                // NEW: Process associated structural triples
                if (echo.triples && Array.isArray(echo.triples)) {
                    for (const triple of echo.triples) {
                        // Sanitize relation type for Cypher (parameterized types aren't supported)
                        const relType = triple.relation.replace(/[^A-Z0-9_]/gi, '').toUpperCase() || 'RELATED_TO';
                        try {
                            await session.run(
                                `MATCH (s {projectId: $projectId}) WHERE (s.name = $subject OR s.title = $subject)
                                 MATCH (o {projectId: $projectId}) WHERE (o.name = $object OR o.title = $object)
                                 MERGE (s)-[r:${relType}]->(o)
                                 ON CREATE SET r.sourceEchoId = $echoId`,
                                {
                                    projectId,
                                    subject: triple.subject,
                                    object: triple.object,
                                    echoId: echo.id
                                }
                            );
                        } catch (err) {
                            console.warn(`Failed to sync triple ${triple.subject}-[:${relType}]->${triple.object}:`, err);
                        }
                    }
                }
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
// ============================================
// Logic Verification: Audit triples against ground truth
// ============================================

export interface KnowledgeTriple {
    subject: string;
    relation: string;
    object: string;
}

export interface LogicConflict {
    type: 'LOCATION_MISMATCH' | 'RELATIONSHIP_CONFLICT' | 'FACTUAL_INCONSISTENCY';
    description: string;
    truthInGraph: string;
    extractedFact: string;
}

export const verifyLogicConflicts = async (
    projectId: string,
    triples: KnowledgeTriple[]
): Promise<LogicConflict[]> => {
    const d = getDriver();
    const session = d.session();
    const conflicts: LogicConflict[] = [];

    try {
        for (const triple of triples) {
            const { subject, relation, object } = triple;

            // 1. Check Location Consistency
            if (relation.toLowerCase().includes('位于') || relation.toLowerCase().includes('在')) {
                const result = await session.run(
                    `MATCH (c:Character {name: $sub, projectId: $projectId})-[:LOCATED_IN]->(l:WorldSetting)
                     WHERE l.title <> $obj
                     RETURN l.title as currentLoc`,
                    { sub: subject, obj: object, projectId }
                );

                if (result.records.length > 0) {
                    const currentLoc = result.records[0].get('currentLoc');
                    conflicts.push({
                        type: 'LOCATION_MISMATCH',
                        description: `角色 [${subject}] 在设定中位于 [${currentLoc}]，但文中写其在 [${object}]。`,
                        truthInGraph: currentLoc,
                        extractedFact: object
                    });
                }
            }

            // 2. Check Static Relationship Consistency (LOVES, ENEMY_OF, etc.)
            // Mapping common Chinese terms to relationship types
            let mappedRel = "";
            if (/仇|恨|红名|敌/.test(relation)) mappedRel = "ENEMY_OF";
            else if (/爱|喜|情/.test(relation)) mappedRel = "LOVES";
            else if (/亲|兄|弟|姐|妹|父|母|子|女/.test(relation)) mappedRel = "KIN_OF";

            if (mappedRel) {
                // Check if a different relationship exists in the graph
                const result = await session.run(
                    `MATCH (a:Character {name: $sub, projectId: $projectId})-[r]->(b:Character {name: $obj, projectId: $projectId})
                     WHERE type(r) <> $mappedRel AND type(r) <> 'RELATED_TO'
                     RETURN type(r) as existingRel`,
                    { sub: subject, obj: object, mappedRel, projectId }
                );

                if (result.records.length > 0) {
                    const existingRel = result.records[0].get('existingRel');
                    conflicts.push({
                        type: 'RELATIONSHIP_CONFLICT',
                        description: `角色 [${subject}] 与 [${object}] 的关系在设定中是 [${existingRel}]，但文中表现为 [${relation}]。`,
                        truthInGraph: existingRel,
                        extractedFact: relation
                    });
                }
            }
        }

        return conflicts;
    } finally {
        await session.close();
    }
};

/**
 * NEW: Graph-Driven Context - Retrieve a relevant subgraph for scene generation
 */
export const getRelatedSubgraph = async (
    projectId: string,
    anchorNames: string[]
): Promise<string> => {
    const d = getDriver();
    const session = d.session();
    try {
        // Find nodes matching anchors and all their 1-hop relationships
        const result = await session.run(
            `MATCH (n {projectId: $projectId})
             WHERE n.name IN $anchors OR n.title IN $anchors
             OPTIONAL MATCH (n)-[r]-(m {projectId: $projectId})
             RETURN n, r, m, startNode(r) = n AS isOutgoing`,
            { projectId, anchors: anchorNames }
        );

        if (result.records.length === 0) return "";

        const entitiesStr: string[] = [];
        const relationshipsStr: string[] = [];
        const seenEntityIds = new Set<string>();
        const seenRelationIds = new Set<string>();

        for (const record of result.records) {
            const n = record.get('n');
            const r = record.get('r');
            const m = record.get('m');
            const isOutgoing = record.get('isOutgoing');

            // Process Primary Node (n)
            if (!seenEntityIds.has(n.properties.id)) {
                const name = n.properties.name || n.properties.title;
                const desc = n.properties.description || n.properties.content || "";
                entitiesStr.push(`[${name}]: ${desc.slice(0, 300)}${desc.length > 300 ? '...' : ''}`);
                seenEntityIds.add(n.properties.id);
            }

            // Process Relationship and Neighbor (m)
            if (r && m) {
                const rId = r.identity.toString();
                if (!seenRelationIds.has(rId)) {
                    const nName = n.properties.name || n.properties.title;
                    const mName = m.properties.name || m.properties.title;
                    const type = r.type;

                    if (isOutgoing) {
                        relationshipsStr.push(`(${nName}) -[${type}]-> (${mName})`);
                    } else {
                        relationshipsStr.push(`(${mName}) -[${type}]-> (${nName})`);
                    }
                    seenRelationIds.add(rId);

                    // Also add neighbor summary if it's a character or major setting
                    if (!seenEntityIds.has(m.properties.id)) {
                        const mDesc = m.properties.description || m.properties.content || "";
                        entitiesStr.push(`[${mName}]: ${mDesc.slice(0, 150)}${mDesc.length > 150 ? '...' : ''}`);
                        seenEntityIds.add(m.properties.id);
                    }
                }
            }
        }

        if (entitiesStr.length === 0) return "";

        let output = "=== KNOWLEDGE GRAPH CONTEXT ===\\n\\n";
        output += "RELEVANT ENTITIES:\\n" + entitiesStr.join('\\n') + "\\n\\n";
        output += "RELATIONSHIPS:\\n" + relationshipsStr.join('\\n');

        return output;
    } catch (err) {
        console.error("Failed to query subgraph:", err);
        return "";
    } finally {
        await session.close();
    }
};

/**
 * NEW Phase 4: Infer narrative insights (Indirect relations, faction dynamics)
 */
export interface NarrativeInsight {
    type: 'ALLIANCE_POTENTIAL' | 'CONFLICT_WARNING' | 'SECRET_CONNECTION' | 'FACTION_SHIFT';
    description: string;
    involvedEntities: string[];
    logic: string;
}

export const inferNarrativeInsights = async (
    projectId: string
): Promise<NarrativeInsight[]> => {
    const d = getDriver();
    const session = d.session();
    const insights: NarrativeInsight[] = [];

    try {
        // 1. Enemy of my Enemy (Alliance Potential)
        const enemiesOfEnemies = await session.run(
            `MATCH (a:Character {projectId: $projectId})-[:ENEMY_OF]->(c:Character {projectId: $projectId})<-[:ENEMY_OF]-(b:Character {projectId: $projectId})
             WHERE id(a) < id(b)
             AND NOT (a)-[:ENEMY_OF]-(b)
             AND NOT (a)-[:ALLY_OF]-(b)
             RETURN a.name as nameA, b.name as nameB, c.name as commonEnemy`,
            { projectId }
        );

        enemiesOfEnemies.records.forEach(r => {
            insights.push({
                type: 'ALLIANCE_POTENTIAL',
                description: `${r.get('nameA')} 和 ${r.get('nameB')} 都视 ${r.get('commonEnemy')} 为敌。这种共同的威胁可能促使 them 达成暂时的结盟。`,
                involvedEntities: [r.get('nameA'), r.get('nameB'), r.get('commonEnemy')],
                logic: 'Enemy of my enemy'
            });
        });

        // 2. Love Triangle / Relationship Conflict (Conflict Warning)
        const triangles = await session.run(
            `MATCH (a:Character {projectId: $projectId})-[:LOVES]->(c:Character {projectId: $projectId})<-[:LOVES]-(b:Character {projectId: $projectId})
             WHERE id(a) < id(b)
             RETURN a.name as nameA, b.name as nameB, c.name as objective`,
            { projectId }
        );

        triangles.records.forEach(r => {
            insights.push({
                type: 'CONFLICT_WARNING',
                description: `${r.get('nameA')} 和 ${r.get('nameB')} 都倾慕 ${r.get('objective')}。这可能会演变成激烈的冲突或嫉妒引发的背叛。`,
                involvedEntities: [r.get('nameA'), r.get('nameB'), r.get('objective')],
                logic: 'Relationship Triangle'
            });
        });

        // 3. Hidden Network (Secret Connection)
        const hiddenLinks = await session.run(
            `MATCH (a:Character {projectId: $projectId}), (b:Character {projectId: $projectId})
             WHERE id(a) < id(b)
             AND NOT (a)--(b)
             MATCH (a)--(common)--(b)
             WITH a, b, count(common) as depth
             WHERE depth >= 2
             RETURN a.name as nameA, b.name as nameB, depth`,
            { projectId }
        );

        hiddenLinks.records.forEach(r => {
            insights.push({
                type: 'SECRET_CONNECTION',
                description: `${r.get('nameA')} 和 ${r.get('nameB')} 虽然目前没有直接交集，但他们共享 ${r.get('depth')} 个共同关系。这暗示他们之间可能存在未被察觉的隐秘联系。`,
                involvedEntities: [r.get('nameA'), r.get('nameB')],
                logic: 'High-density shared neighborhood'
            });
        });

        return insights;
    } catch (err) {
        console.error("Narrative inference failed:", err);
        return [];
    } finally {
        await session.close();
    }
};
