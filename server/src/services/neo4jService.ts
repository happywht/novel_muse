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
                                 ON CREATE SET 
                                    r.sourceEchoId = $echoId, 
                                    r.weight = $weight, 
                                    r.trajectory = $trajectory,
                                    r.isForeshadowing = $isForeshadowing,
                                    r.status = $status,
                                    r.branchId = $branchId,
                                    r.createdAt = timestamp()
                                 ON MATCH SET 
                                    r.weight = $weight, 
                                    r.trajectory = $trajectory,
                                    r.isForeshadowing = $isForeshadowing,
                                    r.status = $status,
                                    r.branchId = $branchId`,
                                {
                                    projectId,
                                    subject: triple.subject,
                                    object: triple.object,
                                    echoId: echo.id,
                                    weight: triple.weight || 50,
                                    trajectory: triple.trajectory || 'stable',
                                    isForeshadowing: !!triple.isForeshadowing,
                                    status: triple.status || 'OPEN',
                                    branchId: triple.branchId || echo.branchId || 'main'
                                }
                            );
                        } catch (err) {
                            console.warn(`Failed to sync triple ${triple.subject}-[:${relType}]->${triple.object}:`, err);
                        }
                    }
                }
            }
        }

        // 8. Create Chapter nodes and link precedence/entities
        if (projectData.chapters?.length > 0) {
            const sortedChapters = [...projectData.chapters].sort((a, b) => a.order - b.order);
            for (let i = 0; i < sortedChapters.length; i++) {
                const ch = sortedChapters[i];
                await session.run(
                    `CREATE (c:Chapter {
                        id: $id, title: $title, order: $order, 
                        projectId: $projectId, summary: $summary, pov: $pov
                    })`,
                    {
                        id: ch.id,
                        title: ch.title,
                        order: ch.order,
                        projectId,
                        summary: (ch.summary || '').substring(0, 1000),
                        pov: ch.expectedPOV || ''
                    }
                );

                // Link to POV character
                if (ch.expectedPOV) {
                    await session.run(
                        `MATCH (ch:Chapter {id: $id, projectId: $projectId})
                         MATCH (c:Character {projectId: $projectId})
                         WHERE (toLower(c.name) CONTAINS toLower($pov)) OR (toLower($pov) CONTAINS toLower(c.name))
                         MERGE (ch)-[:POV_IS]->(c)`,
                        { id: ch.id, projectId, pov: ch.expectedPOV }
                    );
                }

                // Link precedence
                if (i > 0) {
                    await session.run(
                        `MATCH (prev:Chapter {id: $prevId, projectId: $projectId})
                         MATCH (curr:Chapter {id: $currId, projectId: $projectId})
                         MERGE (prev)-[:PRECEDES]->(curr)`,
                        { prevId: sortedChapters[i - 1].id, currId: ch.id, projectId }
                    );
                }

                // Link involved entities via PlotNode link if available
                if (ch.plotNodeId) {
                    const node = (projectData.plotNodes || []).find((n: any) => n.id === ch.plotNodeId);
                    if (node) {
                        const charIds = Array.isArray(node.relatedCharacters) ? node.relatedCharacters : [];
                        const locIds = Array.isArray(node.relatedLocations) ? node.relatedLocations : [];

                        for (const charId of charIds) {
                            await session.run(
                                `MATCH (ch:Chapter {id: $chId, projectId: $projectId})
                                 MATCH (c:Character {id: $charId, projectId: $projectId})
                                 MERGE (ch)-[:INVOLVES]->(c)`,
                                { chId: ch.id, charId, projectId }
                            );
                        }
                        for (const locId of locIds) {
                            await session.run(
                                `MATCH (ch:Chapter {id: $chId, projectId: $projectId})
                                 MATCH (l:WorldSetting {id: $locId, projectId: $projectId})
                                 MERGE (ch)-[:LOCATED_IN]->(l)`,
                                { chId: ch.id, locId, projectId }
                            );
                        }
                    }
                }
            }
        }

        console.log(`📊 Graph synced for project ${projectId}: ${projectData.characters?.length || 0} chars, ${projectData.worldSettings?.length || 0} settings, ${projectData.chapters?.length || 0} chapters`);
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
    weight?: number;
    trajectory?: string;
    isForeshadowing?: boolean; // NEW Task 2.1
    status?: 'OPEN' | 'RESOLVED' | 'ABANDONED';
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
    anchorNames: string[],
    branchId: string = 'main'
): Promise<string> => {
    const d = getDriver();
    const session = d.session();
    try {
        // Task 3.1: Optimized Multi-Anchor Subgraph Extraction
        // 1. Fetch 1-hop relationships for all anchors
        // 2. Prioritize high-weight relationships (Task 1.1)
        // 3. Intelligently include connections BETWEEN anchors (even if 2+ hops)
        const result = await session.run(
            `MATCH (n {projectId: $projectId})
             WHERE (n.name IN $anchors OR n.title IN $anchors)
             AND (n.branchId IS NULL OR n.branchId = 'main' OR n.branchId = $branchId)
             
             // Get 1-hop 
             OPTIONAL MATCH (n)-[r]-(m {projectId: $projectId})
             WHERE (r.branchId IS NULL OR r.branchId = 'main' OR r.branchId = $branchId)
             AND (m.branchId IS NULL OR m.branchId = 'main' OR m.branchId = $branchId)
             
             // Filtering Task 3.1: Only take high-weight relations for peripheral nodes
             // but keep all relationships BETWEEN primary anchors
             WITH n, r, m, 
                  (m.name IN $anchors OR m.title IN $anchors) AS isMutualAnchor,
                  coalesce(r.weight, 50) AS weight
             WHERE isMutualAnchor OR weight >= 30
             
             RETURN n, r, m, startNode(r) = n AS isOutgoing, weight
             ORDER BY weight DESC LIMIT 50`,
            { projectId, anchors: anchorNames, branchId }
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
            const weight = record.get('weight').toNumber();

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

                    const weightSuffix = weight !== 50 ? ` (Intensity: ${weight})` : "";
                    if (isOutgoing) {
                        relationshipsStr.push(`(${nName}) -[${type}]-> (${mName})${weightSuffix}`);
                    } else {
                        relationshipsStr.push(`(${mName}) -[${type}]-> (${nName})${weightSuffix}`);
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

/**
 * NEW Task 1.2: Get physical status (location, health, state) for a set of character names
 */
export interface PhysicalStatus {
    name: string;
    location: string;
    state: string;
    isDead: boolean;
}

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
        // Note: For Task 2.2, if status changes are in relationships, we might need a more complex query here.
        // For now, these are node properties, so they are shared. Character state branching might need future refactoring.

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
 * Task 2.1: Fetch pending foreshadowing hooks for a project
 */
export const getUnresolvedForeshadowing = async (projectId: string, branchId: string = 'main'): Promise<KnowledgeTriple[]> => {
    if (!driver) return [];
    const session = driver.session();
    try {
        const result = await session.run(
            `MATCH (s {projectId: $projectId})-[r]->(o {projectId: $projectId})
             WHERE r.isForeshadowing = true AND r.status = 'OPEN'
             AND (r.branchId IS NULL OR r.branchId = 'main' OR r.branchId = $branchId)
             RETURN s.name as subjectS, s.title as subjectT, 
                    type(r) as relation, 
                    o.name as objectS, o.title as objectT,
                    r.weight as weight, r.trajectory as trajectory,
                    r.status as status`,
            { projectId, branchId }
        );

        return result.records.map(record => ({
            subject: record.get('subjectS') || record.get('subjectT'),
            relation: record.get('relation'),
            object: record.get('objectS') || record.get('objectT'),
            weight: record.get('weight'),
            trajectory: record.get('trajectory'),
            isForeshadowing: true,
            status: record.get('status')
        }));
    } finally {
        await session.close();
    }
};

/**
 * Task 2.2: Merge a sandbox branch into the main branch
 * Transitions all nodes/edges from branchId to 'main'
 */
export const mergeBranch = async (projectId: string, branchId: string): Promise<void> => {
    if (!driver || branchId === 'main') return;
    const session = driver.session();
    try {
        // Update all nodes in this branch
        await session.run(
            `MATCH (n {projectId: $projectId, branchId: $branchId})
             SET n.branchId = 'main'`,
            { projectId, branchId }
        );

        // Update all relationships in this branch
        await session.run(
            `MATCH ()-[r {projectId: $projectId, branchId: $branchId}]->()
             SET r.branchId = 'main'`,
            { projectId, branchId }
        );

        console.log(`🌿 Merged graph branch '${branchId}' into 'main' for project ${projectId}`);
    } finally {
        await session.close();
    }
};

/**
 * Task 5.1: Faction Detection (阵营识别)
 * Uses relationship patterns to group characters into factions.
 * Returns a list of faction groups with their member names.
 */
export const getFactionGroups = async (projectId: string): Promise<any[]> => {
    const d = getDriver();
    const session = d.session();
    try {
        // Simple cluster discovery using Cypher: 
        // Group characters who have many positive (ALLY_OF, LOVES, KIN_OF) relations
        const result = await session.run(
            `MATCH (c:Character {projectId: $projectId})
             OPTIONAL MATCH (c)-[r]-(neighbor:Character {projectId: $projectId})
             WHERE type(r) IN ['ALLY_OF', 'LOVES', 'KIN_OF', 'MENTORS']
             WITH c, collect(DISTINCT neighbor.name) AS allies
             RETURN c.name AS name, allies`,
            { projectId }
        );

        const factions: any[] = [];
        const processed = new Set<string>();

        for (const record of result.records) {
            const name = record.get('name');
            const allies = record.get('allies');
            if (processed.has(name)) continue;

            const currentFactionMembers = [name, ...allies.filter((a: string) => !processed.has(a))];
            currentFactionMembers.forEach(n => processed.add(n as string));

            if (currentFactionMembers.length > 0) {
                factions.push({
                    id: `faction_${factions.length + 1}`,
                    members: currentFactionMembers,
                    dominantTone: "Stable"
                });
            }
        }

        return factions;
    } finally {
        await session.close();
    }
};

/**
 * Task 5.2: State Propagation Simulator (势能传播/蝴蝶效应)
 * Calculates how a change to one character affects others through the graph.
 */
export interface PropagationRisk {
    targetName: string;
    impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    magnitude: number; // 0-100
    reason: string;
}

export const simulateStatePropagation = async (
    projectId: string,
    triggerName: string,
    changeDescription: string
): Promise<PropagationRisk[]> => {
    const d = getDriver();
    const session = d.session();
    try {
        // 1. Identify if the change is positive or negative for the trigger
        const isNegative = /伤|死|败|失|弱|减|退|仇|毁|离|病/.test(changeDescription);

        // 2. Fetch direct relationships
        const result = await session.run(
            `MATCH (n {projectId: $projectId})
             WHERE n.name = $triggerName OR n.title = $triggerName
             MATCH (n)-[r]-(m {projectId: $projectId})
             RETURN n.name as source, type(r) as relType, m.name as target, coalesce(r.weight, 50) as weight`,
            { projectId, triggerName }
        );

        const risks: PropagationRisk[] = [];
        for (const record of result.records) {
            const relType = record.get('relType');
            const target = record.get('target');
            const rawWeight = record.get('weight');
            const weight = (typeof rawWeight === 'number') ? rawWeight : (rawWeight.toNumber ? rawWeight.toNumber() : 50);

            let impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' = 'NEUTRAL';
            let reason = "";

            if (['ALLY_OF', 'LOVES', 'KIN_OF', 'MENTORS'].includes(relType)) {
                impact = isNegative ? 'NEGATIVE' : 'POSITIVE';
                reason = isNegative ? `由于盟友 ${triggerName} 受损，${target} 的后援被削弱` : `${triggerName} 的好转增强了其盟友 ${target} 的地位`;
            } else if (['ENEMY_OF'].includes(relType)) {
                impact = isNegative ? 'POSITIVE' : 'NEGATIVE';
                reason = isNegative ? `宿敌 ${triggerName} 的衰落给 ${target} 留下了可乘之机` : `敌对势力 ${triggerName} 的增强对 ${target} 构成了更大威胁`;
            }

            if (impact !== 'NEUTRAL') {
                risks.push({
                    targetName: target,
                    impact,
                    magnitude: Math.round(weight * 0.6), // Impact dampening
                    reason
                });
            }
        }

        return risks.sort((a, b) => b.magnitude - a.magnitude);
    } finally {
        await session.close();
    }
};
