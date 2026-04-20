import { getDriver } from './client';

export interface PhysicalStatus {
    name: string;
    location: string;
    state: string;
    isDead: boolean;
}

export interface CharacterNetworkFilter {
    relationTypes?: string[];
    minWeight?: number;
    alignments?: string[];
    includeCharacterIds?: string[];
}

export interface RelationshipTimelineEntry {
    timestamp: number;
    echoId?: string;
    targetCharacterId: string;
    targetCharacterName: string;
    before?: {
        type: string;
        weight?: number;
        description?: string;
    };
    after?: {
        type: string;
        weight?: number;
        description?: string;
    };
    reason?: string;
    changeType: 'created' | 'updated' | 'deleted';
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

/**
 * 获取世界设定的关系网络
 * @param projectId 项目ID
 * @param settingId 设定ID（可选，不传则获取整个项目的设定网络）
 * @param depth 查询深度（默认2）
 */
export const getWorldSettingNetwork = async (
    projectId: string,
    settingId?: string,
    depth: number = 2
): Promise<{
    settings: any[];
    relationships: Array<{
        source: string;
        target: string;
        type: string;
    }>;
    relatedCharacters: any[];
    relatedPlotNodes: any[];
}> => {
    const d = getDriver();
    const session = d.session();

    try {
        // 1. 获取 WorldSetting 节点
        const settingsResult = settingId
            ? await session.run(
                `MATCH (w:WorldSetting {projectId: $projectId, id: $settingId}) RETURN w`,
                { projectId, settingId }
            )
            : await session.run(
                `MATCH (w:WorldSetting {projectId: $projectId}) RETURN w`,
                { projectId }
            );

        // 2. 获取 WorldSetting 之间的关系
        const relsResult = await session.run(
            `MATCH (w1:WorldSetting {projectId: $projectId})-[r:CONTAINS|DEPENDS_ON|CONFLICTS_WITH|ADJACENT_TO]-(w2:WorldSetting {projectId: $projectId})
             RETURN w1.id as source, type(r) as type, w2.id as target`,
            { projectId }
        );

        // 3. 获取关联的角色
        const charsResult = await session.run(
            `MATCH (c:Character {projectId: $projectId})-[r:RESIDES_IN|ORIGINATED_FROM|CONTROLS_TERRITORY]->(w:WorldSetting {projectId: $projectId})
             RETURN DISTINCT c`,
            { projectId }
        );

        // 4. 获取关联的情节节点
        const plotsResult = await session.run(
            `MATCH (pn:PlotNode {projectId: $projectId})-[:LOCATED_IN]->(w:WorldSetting {projectId: $projectId})
             RETURN DISTINCT pn`,
            { projectId }
        );

        return {
            settings: settingsResult.records.map(r => r.get('w').properties),
            relationships: relsResult.records.map(r => ({
                source: r.get('source'),
                target: r.get('target'),
                type: r.get('type')
            })),
            relatedCharacters: charsResult.records.map(r => r.get('c').properties),
            relatedPlotNodes: plotsResult.records.map(r => r.get('pn').properties)
        };
    } finally {
        await session.close();
    }
};

/**
 * 获取角色与世界设定的所有关联
 */
export const getCharacterWorldRelations = async (
    projectId: string,
    characterId: string
): Promise<Array<{
    setting: any;
    relationType: string;
}>> => {
    const d = getDriver();
    const session = d.session();

    try {
        const result = await session.run(
            `MATCH (c:Character {id: $characterId, projectId: $projectId})-[r:RESIDES_IN|ORIGINATED_FROM|CONTROLS_TERRITORY|EXILED_FROM]->(w:WorldSetting)
             RETURN w as setting, type(r) as relationType`,
            { projectId, characterId }
        );

        return result.records.map(r => ({
            setting: r.get('setting').properties,
            relationType: r.get('relationType')
        }));
    } finally {
        await session.close();
    }
};

/**
 * 获取世界设定的层级结构（地理层级等）
 */
export const getSettingHierarchy = async (
    projectId: string,
    rootSettingId?: string
): Promise<{
    root: any | null;
    hierarchy: any[];
}> => {
    const d = getDriver();
    const session = d.session();

    try {
        // 如果指定了根节点，从该节点开始
        // 否则查找所有顶级节点（没有父节点的）

        const rootsResult = rootSettingId
            ? await session.run(
                `MATCH (w:WorldSetting {id: $rootId, projectId: $projectId})
                 WHERE NOT (w)<-[:CONTAINS]-(:WorldSetting)
                 RETURN w`,
                { projectId, rootId: rootSettingId }
            )
            : await session.run(
                `MATCH (w:WorldSetting {projectId: $projectId})
                 WHERE NOT (w)<-[:CONTAINS]-(:WorldSetting)
                 RETURN w`,
                { projectId }
            );

        // 获取所有层级关系
        const hierarchyResult = await session.run(
            `MATCH path = (parent:WorldSetting {projectId: $projectId})-[:CONTAINS*1..5]->(child:WorldSetting)
             RETURN [node in nodes(path) | {id: node.id, title: node.title}] as path`,
            { projectId }
        );

        return {
            root: rootsResult.records[0]?.get('w').properties || null,
            hierarchy: hierarchyResult.records.map(r => r.get('path'))
        };
    } finally {
        await session.close();
    }
};

// ============================================================
// Character Module Query APIs
// ============================================================

/**
 * 角色特征接口
 */
export interface CharacterTraits {
    characterId: string;
    characterName: string;
    desire: string | null;
    fear: string | null;
    weakness: string | null;
    signature: string | null;
    contrast: string | null;
}

/**
 * 获取角色特征（desire, fear, weakness, signature, contrast）
 * @param projectId 项目ID
 * @param characterId 角色ID
 */
export const getCharacterTraits = async (
    projectId: string,
    characterId: string
): Promise<CharacterTraits | null> => {
    const d = getDriver();
    const session = d.session();

    try {
        const result = await session.run(
            `MATCH (c:Character {id: $characterId, projectId: $projectId})
             RETURN c.id as characterId,
                    c.name as characterName,
                    c.desire as desire,
                    c.fear as fear,
                    c.weakness as weakness,
                    c.signature as signature,
                    c.contrast as contrast`,
            { projectId, characterId }
        );

        if (result.records.length === 0) {
            return null;
        }

        const record = result.records[0];
        return {
            characterId: record.get('characterId'),
            characterName: record.get('characterName'),
            desire: record.get('desire'),
            fear: record.get('fear'),
            weakness: record.get('weakness'),
            signature: record.get('signature'),
            contrast: record.get('contrast')
        };
    } finally {
        await session.close();
    }
};

/**
 * 角色演变记录接口
 */
export interface CharacterEvolutionRecord {
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
}

/**
 * 获取角色演变历史（基于 Echo）
 * @param projectId 项目ID
 * @param characterId 角色ID
 */
export const getCharacterEvolution = async (
    projectId: string,
    characterId: string
): Promise<CharacterEvolutionRecord[]> => {
    const d = getDriver();
    const session = d.session();

    try {
        // 先获取角色名称
        const charResult = await session.run(
            `MATCH (c:Character {id: $characterId, projectId: $projectId})
             RETURN c.name as name`,
            { projectId, characterId }
        );

        if (charResult.records.length === 0) {
            return [];
        }

        const characterName = charResult.records[0].get('name');

        // 查找与该角色相关的所有 Echo 节点
        // Echo 通过 targetId 或 targetName 关联角色
        const result = await session.run(
            `MATCH (e:Echo {projectId: $projectId, type: 'CHARACTER'})
             WHERE e.targetId = $characterId OR e.targetName = $characterName
             RETURN e.id as echoId,
                    e.timestamp as timestamp,
                    e.type as type,
                    e.description as description,
                    e.reason as reason,
                    e.status as status,
                    e.triples as triples
             ORDER BY e.timestamp DESC`,
            { projectId, characterId, characterName }
        );

        return result.records.map(record => ({
            echoId: record.get('echoId'),
            timestamp: record.get('timestamp')?.toNumber?.() || record.get('timestamp'),
            type: record.get('type'),
            description: record.get('description'),
            reason: record.get('reason'),
            status: record.get('status'),
            triples: record.get('triples') || []
        }));
    } finally {
        await session.close();
    }
};

/**
 * 角色伏笔接口
 */
export interface CharacterForeshadowing {
    id: string;
    type: string;
    subject: string;
    relation: string;
    object: string;
    status: 'OPEN' | 'RESOLVED' | 'ABANDONED';
    weight?: number;
    relatedPlotNodes?: any[];
}

/**
 * 获取角色相关的伏笔
 * @param projectId 项目ID
 * @param characterId 角色ID
 */
export const getCharacterForeshadowing = async (
    projectId: string,
    characterId: string
): Promise<CharacterForeshadowing[]> => {
    const d = getDriver();
    const session = d.session();

    try {
        // 获取角色名称用于匹配
        const charResult = await session.run(
            `MATCH (c:Character {id: $characterId, projectId: $projectId})
             RETURN c.name as name`,
            { projectId, characterId }
        );

        if (charResult.records.length === 0) {
            return [];
        }

        const characterName = charResult.records[0].get('name');

        // 查找与该角色相关的伏笔
        // 伏笔存储在 KnowledgeTriple 中，isForeshadowing = true
        // 角色可能作为 subject 或 object 出现
        const result = await session.run(
            `MATCH (t:KnowledgeTriple {projectId: $projectId, isForeshadowing: true})
             WHERE t.subject = $characterName OR t.object = $characterName
             RETURN t.id as id,
                    t.type as type,
                    t.subject as subject,
                    t.relation as relation,
                    t.object as object,
                    t.status as status,
                    t.weight as weight`,
            { projectId, characterName }
        );

        // 获取关联的 PlotNode
        const foreshadowingList: CharacterForeshadowing[] = [];

        for (const record of result.records) {
            const foreshadowingId = record.get('id');

            // 查找关联的 PlotNode
            const plotResult = await session.run(
                `MATCH (pn:PlotNode {projectId: $projectId})-[:HAS_FORESHADOWING]->(t:KnowledgeTriple {id: $foreshadowingId})
                 RETURN pn`,
                { projectId, foreshadowingId }
            );

            foreshadowingList.push({
                id: foreshadowingId,
                type: record.get('type'),
                subject: record.get('subject'),
                relation: record.get('relation'),
                object: record.get('object'),
                status: record.get('status') || 'OPEN',
                weight: record.get('weight'),
                relatedPlotNodes: plotResult.records.map(r => r.get('pn').properties)
            });
        }

        return foreshadowingList;
    } finally {
        await session.close();
    }
};

/**
 * 角色物理状态接口（扩展版）
 */
export interface CharacterPhysicalStatus {
    characterId: string;
    characterName: string;
    location: string | null;
    locationId: string | null;
    state: string;
    isDead: boolean;
    healthStatus?: string;
}

/**
 * 获取角色物理状态（位置、健康）
 * @param projectId 项目ID
 * @param characterId 角色ID（可选，不传则返回所有角色状态）
 */
export const getCharacterPhysicalStatus = async (
    projectId: string,
    characterId?: string
): Promise<CharacterPhysicalStatus[]> => {
    const d = getDriver();
    const session = d.session();

    try {
        // 构建查询：如果指定 characterId 则只查询该角色，否则查询所有角色
        const whereClause = characterId
            ? 'AND c.id = $characterId'
            : '';

        const result = await session.run(
            `MATCH (c:Character {projectId: $projectId})
             WHERE 1=1 ${whereClause}
             OPTIONAL MATCH (c)-[r:LOCATED_IN]->(l:WorldSetting)
             WHERE (r.branchId IS NULL OR r.branchId = 'main')
             RETURN c.id as characterId,
                    c.name as characterName,
                    l.id as locationId,
                    l.title as location,
                    c.state as state,
                    c.physicalStatus as healthStatus,
                    c.isDead as isDead
             ORDER BY c.name`,
            { projectId, characterId }
        );

        return result.records.map(record => ({
            characterId: record.get('characterId'),
            characterName: record.get('characterName'),
            locationId: record.get('locationId'),
            location: record.get('location'),
            state: record.get('state') || '正常',
            healthStatus: record.get('healthStatus'),
            isDead: record.get('isDead') === true
        }));
    } finally {
        await session.close();
    }
};

// ============================================================
// PlotNode Conflict Query APIs (Enhanced)
// ============================================================

/**
 * 情节依赖关系接口
 */
export interface PlotDependencies {
    currentNode: any;
    upstreamNodes: Array<{
        node: any;
        relationshipType: string;
        distance: number;
    }>;
    downstreamNodes: Array<{
        node: any;
        relationshipType: string;
        distance: number;
    }>;
    relatedCharacters: any[];
    relatedLocations: any[];
}

/**
 * 获取情节的依赖关系（上下游情节）
 * @param projectId 项目ID
 * @param plotNodeId 情节节点ID
 * @param maxDepth 最大查询深度（默认3）
 */
export const getPlotDependencies = async (
    projectId: string,
    plotNodeId: string,
    maxDepth: number = 3
): Promise<PlotDependencies> => {
    const d = getDriver();
    const session = d.session();

    try {
        // 1. 获取当前节点
        const currentResult = await session.run(
            `MATCH (pn:PlotNode {id: $plotNodeId, projectId: $projectId}) RETURN pn`,
            { projectId, plotNodeId }
        );

        if (currentResult.records.length === 0) {
            return {
                currentNode: null,
                upstreamNodes: [],
                downstreamNodes: [],
                relatedCharacters: [],
                relatedLocations: []
            };
        }

        const currentNode = currentResult.records[0].get('pn').properties;

        // 2. 获取上游节点（通过 PRECEDES 关系）
        const upstreamResult = await session.run(
            `MATCH path = (upstream:PlotNode {projectId: $projectId})-[:PRECEDES*1..${maxDepth}]->(pn:PlotNode {id: $plotNodeId})
             RETURN upstream, length(path) as distance
             ORDER BY distance`,
            { projectId, plotNodeId }
        );

        // 3. 获取下游节点（通过 PRECEDES 关系）
        const downstreamResult = await session.run(
            `MATCH path = (pn:PlotNode {id: $plotNodeId})-[:PRECEDES*1..${maxDepth}]->(downstream:PlotNode {projectId: $projectId})
             RETURN downstream, length(path) as distance
             ORDER BY distance`,
            { projectId, plotNodeId }
        );

        // 4. 获取关联角色
        const charsResult = await session.run(
            `MATCH (pn:PlotNode {id: $plotNodeId, projectId: $projectId})-[:INVOLVES]->(c:Character)
             RETURN DISTINCT c`,
            { projectId, plotNodeId }
        );

        // 5. 获取关联地点
        const locsResult = await session.run(
            `MATCH (pn:PlotNode {id: $plotNodeId, projectId: $projectId})-[:LOCATED_IN]->(w:WorldSetting)
             RETURN DISTINCT w`,
            { projectId, plotNodeId }
        );

        return {
            currentNode,
            upstreamNodes: upstreamResult.records.map(r => ({
                node: r.get('upstream').properties,
                relationshipType: 'PRECEDES',
                distance: r.get('distance').toNumber ? r.get('distance').toNumber() : r.get('distance')
            })),
            downstreamNodes: downstreamResult.records.map(r => ({
                node: r.get('downstream').properties,
                relationshipType: 'PRECEDES',
                distance: r.get('distance').toNumber ? r.get('distance').toNumber() : r.get('distance')
            })),
            relatedCharacters: charsResult.records.map(r => r.get('c').properties),
            relatedLocations: locsResult.records.map(r => r.get('w').properties)
        };
    } finally {
        await session.close();
    }
};

/**
 * 冲突解决建议接口
 */
export interface ConflictResolutionSuggestion {
    sourcePlotNode: any;
    suggestions: Array<{
        type: 'HISTORICAL' | 'RELATIONSHIP' | 'STRUCTURAL';
        description: string;
        referenceNodes: any[];
        confidence: number;
    }>;
    relatedPatterns: Array<{
        pattern: string;
        frequency: number;
        examples: any[];
    }>;
}

/**
 * 获取冲突解决建议（基于历史数据）
 * @param projectId 项目ID
 * @param plotNodeId 情节节点ID
 */
export const getConflictResolutionSuggestions = async (
    projectId: string,
    plotNodeId: string
): Promise<ConflictResolutionSuggestion> => {
    const d = getDriver();
    const session = d.session();

    try {
        // 1. 获取当前情节节点及其冲突信息
        const nodeResult = await session.run(
            `MATCH (pn:PlotNode {id: $plotNodeId, projectId: $projectId})
             OPTIONAL MATCH (pn)-[r:HAS_CONFLICT_PARTICIPANT]->(c:Character)
             RETURN pn, collect({character: c, conflictType: r.conflictType, intensity: r.intensity, stakes: r.stakes}) as conflicts`,
            { projectId, plotNodeId }
        );

        if (nodeResult.records.length === 0) {
            return {
                sourcePlotNode: null,
                suggestions: [],
                relatedPatterns: []
            };
        }

        const sourcePlotNode = nodeResult.records[0].get('pn').properties;
        const conflicts = nodeResult.records[0].get('conflicts');

        // 2. 基于冲突类型查找类似的历史冲突
        const historicalSuggestions = await session.run(
            `MATCH (pn:PlotNode {projectId: $projectId})-[r:HAS_CONFLICT_PARTICIPANT]->(c:Character)
             WHERE pn.id <> $plotNodeId AND r.conflictType IN $conflictTypes
             WITH pn, r, c
             MATCH (pn)-[:PRECEDES]->(next:PlotNode)
             WHERE NOT (next)-[:HAS_CONFLICT_PARTICIPANT]->(c)
             RETURN DISTINCT pn as sourceNode, next as resolutionNode, r.conflictType as conflictType, r.intensity as intensity
             ORDER BY r.intensity DESC
             LIMIT 5`,
            {
                projectId,
                plotNodeId,
                conflictTypes: conflicts.filter((cf: any) => cf.character).map((cf: any) => cf.conflictType || 'CONFRONTATION')
            }
        );

        // 3. 基于角色关系分析冲突解决可能
        const relationshipSuggestions = await session.run(
            `MATCH (pn:PlotNode {id: $plotNodeId, projectId: $projectId})-[r:HAS_CONFLICT_PARTICIPANT]->(c1:Character)
             MATCH (c1)-[rel]->(c2:Character)
             WHERE type(rel) IN ['ALLY_OF', 'MENTORS', 'KIN_OF', 'FRIEND_OF']
             RETURN DISTINCT c1.name as participant, type(rel) as relationType, c2.name as relatedCharacter, rel.weight as weight
             ORDER BY rel.weight DESC`,
            { projectId, plotNodeId }
        );

        // 4. 分析冲突模式
        const patternResult = await session.run(
            `MATCH (pn:PlotNode {projectId: $projectId})-[r:HAS_CONFLICT_PARTICIPANT]->(c:Character)
             WITH r.conflictType as conflictType, count(pn) as frequency, collect(pn) as examples
             RETURN conflictType, frequency, examples[0..3] as examples
             ORDER BY frequency DESC`,
            { projectId }
        );

        // 5. 构建建议
        const suggestions: ConflictResolutionSuggestion['suggestions'] = [];

        // 添加历史建议
        if (historicalSuggestions.records.length > 0) {
            suggestions.push({
                type: 'HISTORICAL',
                description: `在项目中找到 ${historicalSuggestions.records.length} 个类似冲突的解决案例`,
                referenceNodes: historicalSuggestions.records.map(r => ({
                    sourceNode: r.get('sourceNode').properties,
                    resolutionNode: r.get('resolutionNode')?.properties,
                    conflictType: r.get('conflictType'),
                    intensity: r.get('intensity')
                })),
                confidence: 0.7
            });
        }

        // 添加关系建议
        if (relationshipSuggestions.records.length > 0) {
            const allies = relationshipSuggestions.records
                .filter(r => ['ALLY_OF', 'MENTORS', 'KIN_OF', 'FRIEND_OF'].includes(r.get('relationType')))
                .map(r => `${r.get('participant')} 与 ${r.get('relatedCharacter')} 是${r.get('relationType')}关系`);

            suggestions.push({
                type: 'RELATIONSHIP',
                description: `冲突参与者存在以下关系，可利用这些关系解决冲突: ${allies.join('; ')}`,
                referenceNodes: relationshipSuggestions.records.map(r => ({
                    participant: r.get('participant'),
                    relationType: r.get('relationType'),
                    relatedCharacter: r.get('relatedCharacter'),
                    weight: r.get('weight')
                })),
                confidence: 0.8
            });
        }

        // 添加结构性建议
        const conflictIntensity = conflicts.reduce((max: number, cf: any) =>
            Math.max(max, cf.intensity || 5), 0);

        if (conflictIntensity >= 7) {
            suggestions.push({
                type: 'STRUCTURAL',
                description: `当前冲突强度为 ${conflictIntensity}，建议在后续情节中逐步降温或提供戏剧性解决方案`,
                referenceNodes: [],
                confidence: 0.6
            });
        }

        // 构建模式数据
        const relatedPatterns = patternResult.records.map(r => ({
            pattern: r.get('conflictType') || 'CONFRONTATION',
            frequency: r.get('frequency').toNumber ? r.get('frequency').toNumber() : r.get('frequency'),
            examples: (r.get('examples') || []).map((n: any) => n.properties)
        }));

        return {
            sourcePlotNode,
            suggestions,
            relatedPatterns
        };
    } finally {
        await session.close();
    }
};

// ============================================================
// Echo Graph Query APIs (P1 Phase)
// ============================================================

/**
 * 获取角色之间的关系演变时间线
 * @param projectId 项目ID
 * @param character1Id 角色1 ID
 * @param character2Id 角色2 ID
 */
export const getRelationshipTimelineBetweenCharacters = async (
    projectId: string,
    character1Id: string,
    character2Id: string
): Promise<Array<{
    timestamp: number;
    echoId: string;
    relation: string;
    trajectory: string;
    weight: number;
    description: string;
}>> => {
    const d = getDriver();
    const session = d.session();

    try {
        // 获取两个角色的名称
        const charsResult = await session.run(
            `MATCH (c:Character {projectId: $projectId})
             WHERE c.id IN [$char1Id, $char2Id]
             RETURN c.id as id, c.name as name`,
            { projectId, char1Id: character1Id, char2Id: character2Id }
        );

        if (charsResult.records.length < 2) {
            return [];
        }

        const charNameMap: Record<string, string> = {};
        charsResult.records.forEach(r => {
            charNameMap[r.get('id')] = r.get('name');
        });

        const char1Name = charNameMap[character1Id];
        const char2Name = charNameMap[character2Id];

        // 查找两个角色之间的关系演变时间线
        // 从 Echo 节点的 triples 中提取涉及这两个角色的关系变化
        const result = await session.run(
            `MATCH (e:Echo {projectId: $projectId, status: 'ACCEPTED'})
             WHERE e.triples IS NOT NULL
             UNWIND e.triples AS triple
             WITH e, triple
             WHERE (triple.subject = $char1Name AND triple.object = $char2Name)
                OR (triple.subject = $char2Name AND triple.object = $char1Name)
             RETURN e.id as echoId,
                    e.timestamp as timestamp,
                    e.description as description,
                    triple.relation as relation,
                    triple.trajectory as trajectory,
                    triple.weight as weight
             ORDER BY e.timestamp DESC`,
            { projectId, char1Name, char2Name }
        );

        return result.records.map(record => ({
            timestamp: record.get('timestamp')?.toNumber?.() || record.get('timestamp') || 0,
            echoId: record.get('echoId'),
            relation: record.get('relation') || 'RELATED_TO',
            trajectory: record.get('trajectory') || 'stable',
            weight: record.get('weight') || 50,
            description: record.get('description') || ''
        }));
    } finally {
        await session.close();
    }
};

/**
 * 从Echo中获取未回收的伏笔
 * @param projectId 项目ID
 * @param branchId 分支ID（可选）
 */
export const getEchoForeshadowing = async (
    projectId: string,
    branchId: string = 'main'
): Promise<Array<{
    subject: string;
    relation: string;
    object: string;
    echoId: string;
    createdAt: number;
    relatedChapter?: string;
}>> => {
    const d = getDriver();
    const session = d.session();

    try {
        // 查找未回收的伏笔
        // 伏笔存储在 Echo 的 triples 中，isForeshadowing = true 且 status = 'OPEN'
        const result = await session.run(
            `MATCH (e:Echo {projectId: $projectId, status: 'ACCEPTED'})
             WHERE e.triples IS NOT NULL
             AND (e.branchId IS NULL OR e.branchId = 'main' OR e.branchId = $branchId)
             UNWIND e.triples AS triple
             WITH e, triple
             WHERE triple.isForeshadowing = true AND triple.status = 'OPEN'
             RETURN e.id as echoId,
                    e.timestamp as timestamp,
                    triple.subject as subject,
                    triple.relation as relation,
                    triple.object as object
             ORDER BY e.timestamp DESC`,
            { projectId, branchId }
        );

        const foreshadowingList: Array<{
            subject: string;
            relation: string;
            object: string;
            echoId: string;
            createdAt: number;
            relatedChapter?: string;
        }> = [];

        for (const record of result.records) {
            const echoId = record.get('echoId');

            // 查找关联的章节
            const chapterResult = await session.run(
                `MATCH (ch:Chapter {projectId: $projectId})-[:IMPLEMENTS]->(pn:PlotNode)
                 OPTIONAL MATCH (pn)-[:HAS_ECHO]->(e:Echo {id: $echoId})
                 RETURN ch.title as chapterTitle`,
                { projectId, echoId }
            );

            const relatedChapter = chapterResult.records[0]?.get('chapterTitle') || undefined;

            foreshadowingList.push({
                subject: record.get('subject'),
                relation: record.get('relation'),
                object: record.get('object'),
                echoId,
                createdAt: record.get('timestamp')?.toNumber?.() || record.get('timestamp') || 0,
                relatedChapter
            });
        }

        return foreshadowingList;
    } finally {
        await session.close();
    }
};

/**
 * 检测关系矛盾
 * @param projectId 项目ID
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
    const d = getDriver();
    const session = d.session();
    const contradictions: Array<{
        type: 'RELATIONSHIP_CONFLICT' | 'STATE_MISMATCH' | 'TEMPORAL_ERROR';
        description: string;
        entities: string[];
        conflictingEchoes: string[];
        severity: 'HIGH' | 'MEDIUM' | 'LOW';
    }> = [];

    try {
        // 1. 检测关系矛盾 (RELATIONSHIP_CONFLICT)
        // 查找同一对角色之间存在矛盾关系（如同时是敌人和盟友）
        const relationshipConflicts = await session.run(
            `MATCH (c1:Character {projectId: $projectId})-[r1:ENEMY_OF]->(c2:Character {projectId: $projectId})
             MATCH (c1)-[r2:ALLY_OF]->(c2)
             WITH c1, c2, r1, r2
             OPTIONAL MATCH (c1)<-[:HAS_ECHO]-(e1:Echo)
             OPTIONAL MATCH (c2)<-[:HAS_ECHO]-(e2:Echo)
             RETURN c1.name as char1, c2.name as char2,
                    collect(DISTINCT e1.id) + collect(DISTINCT e2.id) as echoIds`,
            { projectId }
        );

        for (const record of relationshipConflicts.records) {
            const char1 = record.get('char1');
            const char2 = record.get('char2');
            const echoIds = (record.get('echoIds') || []).filter((id: string) => id);

            contradictions.push({
                type: 'RELATIONSHIP_CONFLICT',
                description: `"${char1}" 与 "${char2}" 同时存在敌对和盟友关系，可能存在逻辑矛盾`,
                entities: [char1, char2],
                conflictingEchoes: echoIds,
                severity: 'HIGH'
            });
        }

        // 2. 检测状态不匹配 (STATE_MISMATCH)
        // 查找角色状态矛盾（如已死亡但仍有后续活动）
        const stateMismatches = await session.run(
            `MATCH (c:Character {projectId: $projectId, isDead: true})
             MATCH (pn:PlotNode {projectId: $projectId})-[:INVOLVES]->(c)
             OPTIONAL MATCH (c)<-[:HAS_ECHO]-(e:Echo)
             RETURN c.name as charName, pn.title as plotTitle,
                    collect(DISTINCT e.id) as echoIds`,
            { projectId }
        );

        for (const record of stateMismatches.records) {
            const charName = record.get('charName');
            const plotTitle = record.get('plotTitle');
            const echoIds = (record.get('echoIds') || []).filter((id: string) => id);

            contradictions.push({
                type: 'STATE_MISMATCH',
                description: `"${charName}" 已被标记为死亡，但仍参与情节 "${plotTitle}"`,
                entities: [charName, plotTitle],
                conflictingEchoes: echoIds,
                severity: 'HIGH'
            });
        }

        // 3. 检测时间线错误 (TEMPORAL_ERROR)
        // 查找时间戳顺序错误的 Echo（后创建的 Echo 但描述的是更早的事件）
        const temporalErrors = await session.run(
            `MATCH (e1:Echo {projectId: $projectId, status: 'ACCEPTED'})
             MATCH (e2:Echo {projectId: $projectId, status: 'ACCEPTED'})
             WHERE e1.timestamp > e2.timestamp
               AND e1.triples IS NOT NULL AND e2.triples IS NOT NULL
             WITH e1, e2
             UNWIND e1.triples AS t1
             UNWIND e2.triples AS t2
             WITH e1, e2, t1, t2
             WHERE t1.subject = t2.subject AND t1.object = t2.object
               AND t1.relation = t2.relation
               AND t1.trajectory <> t2.trajectory
             RETURN DISTINCT e1.id as laterEchoId, e2.id as earlierEchoId,
                    t1.subject as subject, t1.relation as relation, t1.object as object,
                    t1.trajectory as laterTrajectory, t2.trajectory as earlierTrajectory`,
            { projectId }
        );

        for (const record of temporalErrors.records) {
            const subject = record.get('subject');
            const relation = record.get('relation');
            const object = record.get('object');
            const laterTrajectory = record.get('laterTrajectory');
            const earlierTrajectory = record.get('earlierTrajectory');
            const laterEchoId = record.get('laterEchoId');
            const earlierEchoId = record.get('earlierEchoId');

            // 只有当轨迹变化不合理时才报告（如从 rising 变为 falling 又变回 rising）
            if (laterTrajectory === 'rising' && earlierTrajectory === 'falling') {
                contradictions.push({
                    type: 'TEMPORAL_ERROR',
                    description: `"${subject}" 与 "${object}" 的关系轨迹出现异常：先下降后上升，可能存在时间线错误`,
                    entities: [subject, object],
                    conflictingEchoes: [laterEchoId, earlierEchoId],
                    severity: 'MEDIUM'
                });
            }
        }

        // 4. 检测角色位置矛盾
        const locationConflicts = await session.run(
            `MATCH (c:Character {projectId: $projectId})
             MATCH (c)-[r1:LOCATED_IN]->(l1:WorldSetting {projectId: $projectId})
             MATCH (c)-[r2:LOCATED_IN]->(l2:WorldSetting {projectId: $projectId})
             WHERE l1.id <> l2.id
             OPTIONAL MATCH (c)<-[:HAS_ECHO]-(e:Echo)
             RETURN c.name as charName, l1.title as loc1, l2.title as loc2,
                    collect(DISTINCT e.id) as echoIds`,
            { projectId }
        );

        for (const record of locationConflicts.records) {
            const charName = record.get('charName');
            const loc1 = record.get('loc1');
            const loc2 = record.get('loc2');
            const echoIds = (record.get('echoIds') || []).filter((id: string) => id);

            contradictions.push({
                type: 'STATE_MISMATCH',
                description: `"${charName}" 同时位于 "${loc1}" 和 "${loc2}"，可能存在位置矛盾`,
                entities: [charName, loc1, loc2],
                conflictingEchoes: echoIds,
                severity: 'MEDIUM'
            });
        }

        return contradictions;
    } finally {
        await session.close();
    }
};

/**
 * 获取实体的Echo历史
 * @param projectId 项目ID
 * @param targetId 目标实体ID（Character或WorldSetting）
 */
export const getEchoHistory = async (
    projectId: string,
    targetId: string
): Promise<Array<{
    echoId: string;
    description: string;
    status: string;
    timestamp: number;
    triples: any[];
}>> => {
    const d = getDriver();
    const session = d.session();

    try {
        // 查找目标实体（可能是 Character 或 WorldSetting）
        const entityResult = await session.run(
            `MATCH (n {id: $targetId, projectId: $projectId})
             RETURN n.name as name, n.title as title, labels(n) as labels`,
            { projectId, targetId }
        );

        if (entityResult.records.length === 0) {
            return [];
        }

        const record = entityResult.records[0];
        const entityName = record.get('name') || record.get('title');
        const entityLabels = record.get('labels') as string[];

        // 确定实体类型
        const entityType = entityLabels.includes('Character') ? 'CHARACTER' :
                          entityLabels.includes('WorldSetting') ? 'WORLD' : 'UNKNOWN';

        // 方法1: 通过 HAS_ECHO 关系直接查找
        const directEchoes = await session.run(
            `MATCH (n {id: $targetId, projectId: $projectId})-[:HAS_ECHO]->(e:Echo)
             RETURN e.id as echoId,
                    e.description as description,
                    e.status as status,
                    e.timestamp as timestamp,
                    e.triples as triples
             ORDER BY e.timestamp DESC`,
            { projectId, targetId }
        );

        // 方法2: 通过 targetId 和 targetName 属性查找
        const indirectEchoes = await session.run(
            `MATCH (e:Echo {projectId: $projectId})
             WHERE e.targetId = $targetId OR e.targetName = $entityName
             RETURN e.id as echoId,
                    e.description as description,
                    e.status as status,
                    e.timestamp as timestamp,
                    e.triples as triples
             ORDER BY e.timestamp DESC`,
            { projectId, targetId, entityName }
        );

        // 合并结果，去重
        const echoMap = new Map<string, {
            echoId: string;
            description: string;
            status: string;
            timestamp: number;
            triples: any[];
        }>();

        // 处理直接关联的 Echo
        for (const rec of directEchoes.records) {
            const echoId = rec.get('echoId');
            echoMap.set(echoId, {
                echoId,
                description: rec.get('description') || '',
                status: rec.get('status') || 'PENDING',
                timestamp: rec.get('timestamp')?.toNumber?.() || rec.get('timestamp') || 0,
                triples: rec.get('triples') || []
            });
        }

        // 处理间接关联的 Echo（如果还没有添加）
        for (const rec of indirectEchoes.records) {
            const echoId = rec.get('echoId');
            if (!echoMap.has(echoId)) {
                echoMap.set(echoId, {
                    echoId,
                    description: rec.get('description') || '',
                    status: rec.get('status') || 'PENDING',
                    timestamp: rec.get('timestamp')?.toNumber?.() || rec.get('timestamp') || 0,
                    triples: rec.get('triples') || []
                });
            }
        }

        // 方法3: 通过 triples 中的 subject 或 object 查找
        const triplesEchoes = await session.run(
            `MATCH (e:Echo {projectId: $projectId, status: 'ACCEPTED'})
             WHERE e.triples IS NOT NULL
             UNWIND e.triples AS triple
             WITH e, triple
             WHERE triple.subject = $entityName OR triple.object = $entityName
             RETURN DISTINCT e.id as echoId,
                    e.description as description,
                    e.status as status,
                    e.timestamp as timestamp,
                    e.triples as triples
             ORDER BY e.timestamp DESC`,
            { projectId, entityName }
        );

        for (const rec of triplesEchoes.records) {
            const echoId = rec.get('echoId');
            if (!echoMap.has(echoId)) {
                echoMap.set(echoId, {
                    echoId,
                    description: rec.get('description') || '',
                    status: rec.get('status') || 'PENDING',
                    timestamp: rec.get('timestamp')?.toNumber?.() || rec.get('timestamp') || 0,
                    triples: rec.get('triples') || []
                });
            }
        }

        // 按时间戳降序排序
        const result = Array.from(echoMap.values()).sort((a, b) => b.timestamp - a.timestamp);

        return result;
    } finally {
        await session.close();
    }
};

// ============================================================
// Outliner Graph Query APIs (P1 Phase)
// ============================================================

/**
 * 获取章节的依赖关系
 * @param projectId 项目ID
 * @param chapterId 章节ID
 */
export const getChapterDependencies = async (
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
    const d = getDriver();
    const session = d.session();

    try {
        // 1. 获取章节基本信息
        const chapterResult = await session.run(
            `MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})
             RETURN ch`,
            { projectId, chapterId }
        );

        if (chapterResult.records.length === 0) {
            return {
                chapter: null,
                plotNode: undefined,
                involvedCharacters: [],
                setLocation: undefined,
                beats: [],
                predecessor: undefined,
                successor: undefined
            };
        }

        const chapter = chapterResult.records[0].get('ch').properties;

        // 2. 获取关联的 PlotNode
        const plotNodeResult = await session.run(
            `MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})-[:IMPLEMENTS]->(pn:PlotNode)
             RETURN pn`,
            { projectId, chapterId }
        );

        const plotNode = plotNodeResult.records.length > 0
            ? plotNodeResult.records[0].get('pn').properties
            : undefined;

        // 3. 获取涉及的角色
        const charsResult = await session.run(
            `MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})-[:INVOLVES]->(c:Character)
             RETURN DISTINCT c`,
            { projectId, chapterId }
        );

        const involvedCharacters = charsResult.records.map(r => r.get('c').properties);

        // 4. 获取场景地点
        const locationResult = await session.run(
            `MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})-[:LOCATED_IN]->(w:WorldSetting)
             RETURN w`,
            { projectId, chapterId }
        );

        const setLocation = locationResult.records.length > 0
            ? locationResult.records[0].get('w').properties
            : undefined;

        // 5. 获取章节的 Beats（从章节属性中提取）
        // 注意：ChapterBeat 存储在 Chapter 节点的 beats 属性中（JSON字符串）
        let beats: any[] = [];
        if (chapter.beats) {
            try {
                const beatsData = typeof chapter.beats === 'string'
                    ? JSON.parse(chapter.beats)
                    : chapter.beats;
                beats = Array.isArray(beatsData) ? beatsData : [];
            } catch (e) {
                console.warn('Failed to parse chapter beats:', e);
                beats = [];
            }
        }

        // 6. 获取前驱章节
        const predecessorResult = await session.run(
            `MATCH (prev:Chapter {projectId: $projectId})-[:PRECEDES]->(ch:Chapter {id: $chapterId, projectId: $projectId})
             RETURN prev`,
            { projectId, chapterId }
        );

        const predecessor = predecessorResult.records.length > 0
            ? predecessorResult.records[0].get('prev').properties
            : undefined;

        // 7. 获取后继章节
        const successorResult = await session.run(
            `MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})-[:PRECEDES]->(next:Chapter {projectId: $projectId})
             RETURN next`,
            { projectId, chapterId }
        );

        const successor = successorResult.records.length > 0
            ? successorResult.records[0].get('next').properties
            : undefined;

        return {
            chapter,
            plotNode,
            involvedCharacters,
            setLocation,
            beats,
            predecessor,
            successor
        };
    } finally {
        await session.close();
    }
};

/**
 * 获取章节涉及的角色网络
 * @param projectId 项目ID
 * @param chapterId 章节ID
 */
export const getChapterCharacterNetwork = async (
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
    const d = getDriver();
    const session = d.session();

    try {
        // 1. 获取章节涉及的所有角色
        const charsResult = await session.run(
            `MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})-[:INVOLVES]->(c:Character)
             RETURN DISTINCT c`,
            { projectId, chapterId }
        );

        const characters = charsResult.records.map(r => r.get('c').properties);

        if (characters.length === 0) {
            return {
                characters: [],
                relationships: []
            };
        }

        // 2. 获取这些角色之间的关系
        // 提取角色名称列表
        const charNames = characters.map(c => c.name);

        // 查询角色之间的关系（通过关系边）
        const relationshipsResult = await session.run(
            `MATCH (c1:Character {projectId: $projectId})-[r]->(c2:Character {projectId: $projectId})
             WHERE c1.name IN $charNames AND c2.name IN $charNames
             AND type(r) IN ['ENEMY_OF', 'ALLY_OF', 'LOVES', 'KIN_OF', 'MENTORS', 'RIVAL_OF', 'SERVES', 'FRIEND_OF', 'RELATED_TO']
             RETURN c1.name as subject, type(r) as relation, c2.name as object, r.weight as weight`,
            { projectId, charNames }
        );

        // 同时查询 KnowledgeTriple 中的关系（可能包含更多细节）
        const triplesResult = await session.run(
            `MATCH (t:KnowledgeTriple {projectId: $projectId})
             WHERE t.subject IN $charNames AND t.object IN $charNames
             RETURN t.subject as subject, t.relation as relation, t.object as object, t.weight as weight`,
            { projectId, charNames }
        );

        // 合并关系数据
        const relationshipMap = new Map<string, { subject: string; relation: string; object: string; weight: number }>();

        // 添加关系边数据
        for (const record of relationshipsResult.records) {
            const key = `${record.get('subject')}-${record.get('relation')}-${record.get('object')}`;
            relationshipMap.set(key, {
                subject: record.get('subject'),
                relation: record.get('relation'),
                object: record.get('object'),
                weight: record.get('weight') || 50
            });
        }

        // 添加 KnowledgeTriple 数据（如果还没有的话）
        for (const record of triplesResult.records) {
            const key = `${record.get('subject')}-${record.get('relation')}-${record.get('object')}`;
            if (!relationshipMap.has(key)) {
                relationshipMap.set(key, {
                    subject: record.get('subject'),
                    relation: record.get('relation'),
                    object: record.get('object'),
                    weight: record.get('weight') || 50
                });
            }
        }

        return {
            characters,
            relationships: Array.from(relationshipMap.values())
        };
    } finally {
        await session.close();
    }
};

/**
 * 获取伏笔链追踪
 * @param projectId 项目ID
 * @param foreshadowingId 伏笔ID
 */
export const getForeshadowingChain = async (
    projectId: string,
    foreshadowingId: string
): Promise<{
    source: any;
    chain: Array<{
        chapter: any;
        status: 'PLANTED' | 'HINTED' | 'RESOLVED';
    }>;
}> => {
    const d = getDriver();
    const session = d.session();

    try {
        // 1. 获取伏笔源信息（从 KnowledgeTriple 中查找）
        const sourceResult = await session.run(
            `MATCH (t:KnowledgeTriple {id: $foreshadowingId, projectId: $projectId, isForeshadowing: true})
             RETURN t`,
            { projectId, foreshadowingId }
        );

        if (sourceResult.records.length === 0) {
            return {
                source: null,
                chain: []
            };
        }

        const source = sourceResult.records[0].get('t').properties;

        // 2. 查找所有引用此伏笔的章节
        // 通过 PlotNode 的 HAS_FORESHADOWING 关系查找
        const chainResult = await session.run(
            `MATCH (t:KnowledgeTriple {id: $foreshadowingId, projectId: $projectId})
             OPTIONAL MATCH (pn:PlotNode {projectId: $projectId})-[:HAS_FORESHADOWING]->(t)
             OPTIONAL MATCH (ch:Chapter {projectId: $projectId})-[:IMPLEMENTS]->(pn)
             OPTIONAL MATCH (ch2:Chapter {projectId: $projectId})-[:INVOLVES]->(c:Character)
                WHERE c.name = t.subject OR c.name = t.object
             WITH COALESCE(ch, ch2) as chapter, t.status as tripleStatus
             WHERE chapter IS NOT NULL
             RETURN DISTINCT chapter,
                    CASE
                        WHEN tripleStatus = 'OPEN' THEN 'PLANTED'
                        WHEN tripleStatus = 'RESOLVED' THEN 'RESOLVED'
                        ELSE 'HINTED'
                    END as status
             ORDER BY chapter.order`,
            { projectId, foreshadowingId }
        );

        const chain = chainResult.records.map(r => ({
            chapter: r.get('chapter').properties,
            status: r.get('status') as 'PLANTED' | 'HINTED' | 'RESOLVED'
        }));

        return {
            source,
            chain
        };
    } finally {
        await session.close();
    }
};

/**
 * 获取冲突热力图数据
 * @param projectId 项目ID
 */
export const getConflictHeatmapData = async (
    projectId: string
): Promise<Array<{
    chapterId: string;
    chapterTitle: string;
    intensity: number;
    conflictType: string;
    participants: string[];
}>> => {
    const d = getDriver();
    const session = d.session();

    try {
        // 查询所有章节的冲突数据
        // 冲突信息主要存储在 PlotNode 的 conflictScenario 属性中
        const result = await session.run(
            `MATCH (ch:Chapter {projectId: $projectId})
             OPTIONAL MATCH (ch)-[:IMPLEMENTS]->(pn:PlotNode)
             OPTIONAL MATCH (ch)-[:INVOLVES]->(c:Character)
             WITH ch, pn, collect(DISTINCT c.name) as charNames
             RETURN ch.id as chapterId,
                    ch.title as chapterTitle,
                    ch.order as chapterOrder,
                    pn.conflictScenario as conflictScenario,
                    charNames as participants
             ORDER BY chapterOrder`,
            { projectId }
        );

        const heatmapData: Array<{
            chapterId: string;
            chapterTitle: string;
            intensity: number;
            conflictType: string;
            participants: string[];
        }> = [];

        for (const record of result.records) {
            const chapterId = record.get('chapterId');
            const chapterTitle = record.get('chapterTitle');
            const participants = record.get('participants') || [];
            const conflictScenario = record.get('conflictScenario');

            let intensity = 0;
            let conflictType = 'NONE';

            // 解析冲突场景数据
            if (conflictScenario) {
                try {
                    const scenario = typeof conflictScenario === 'string'
                        ? JSON.parse(conflictScenario)
                        : conflictScenario;

                    if (scenario) {
                        intensity = scenario.intensity || 0;
                        conflictType = scenario.type || 'NONE';
                    }
                } catch (e) {
                    console.warn('Failed to parse conflict scenario:', e);
                }
            }

            // 如果有参与角色但没有冲突场景，根据角色数量推断基础冲突强度
            if (intensity === 0 && participants.length >= 2) {
                intensity = 3; // 基础冲突强度
                conflictType = 'CONFRONTATION';
            }

            heatmapData.push({
                chapterId,
                chapterTitle,
                intensity,
                conflictType,
                participants
            });
        }

        return heatmapData;
    } finally {
        await session.close();
    }
};

// ==================== WorldSetting 图谱查询 API ====================

/**
 * 获取世界设定的层级树
 * @param projectId 项目ID
 * @param rootId 可选的根节点ID，不传则返回完整森林
 */
export const getWorldSettingHierarchy = async (
    projectId: string,
    rootId?: string
): Promise<Array<{
    node: any;
    children: any[];
    depth: number;
}>> => {
    const d = getDriver();
    const session = d.session();

    try {
        if (rootId) {
            // 获取指定根节点的子树（限制深度为10层）
            // 使用简单的路径查询，不依赖APOC插件
            const result = await session.run(
                `MATCH (root:WorldSetting {id: $rootId, projectId: $projectId})
                 OPTIONAL MATCH path = (root)-[:CONTAINS*0..10]->(descendant:WorldSetting)
                 WITH COALESCE(descendant, root) as node,
                      COALESCE(length(path), 0) as depth
                 WITH DISTINCT node, depth
                 RETURN node,
                        depth,
                        [(node)-[:CONTAINS]->(child:WorldSetting) | child] as children
                 ORDER BY depth, node.title`,
                { projectId, rootId }
            );

            return result.records.map(record => ({
                node: record.get('node').properties,
                children: (record.get('children') || []).map((c: any) => c.properties),
                depth: record.get('depth').toNumber ? record.get('depth').toNumber() : record.get('depth')
            }));
        } else {
            // 获取完整森林（所有根节点及其子树）
            // 首先找到所有根节点（没有parentId的节点）
            const rootsResult = await session.run(
                `MATCH (w:WorldSetting {projectId: $projectId})
                 WHERE NOT (w)<-[:CONTAINS]-(:WorldSetting)
                 RETURN w.id as rootId
                 ORDER BY w.title`,
                { projectId }
            );

            const hierarchy: Array<{
                node: any;
                children: any[];
                depth: number;
            }> = [];

            // 对每个根节点获取其子树
            for (const rootRecord of rootsResult.records) {
                const currentRootId = rootRecord.get('rootId');

                const treeResult = await session.run(
                    `MATCH (root:WorldSetting {id: $rootId, projectId: $projectId})
                     MATCH path = (root)-[:CONTAINS*0..10]->(descendant)
                     WITH nodes(path) as pathNodes, length(path) as depth
                     WITH pathNodes[-1] as node, depth
                     RETURN node,
                            depth,
                            [(node)-[:CONTAINS]->(child:WorldSetting) | child] as children
                     ORDER BY depth, node.title`,
                    { projectId, rootId: currentRootId }
                );

                for (const record of treeResult.records) {
                    hierarchy.push({
                        node: record.get('node').properties,
                        children: (record.get('children') || []).map((c: any) => c.properties),
                        depth: record.get('depth').toNumber ? record.get('depth').toNumber() : record.get('depth')
                    });
                }
            }

            return hierarchy;
        }
    } finally {
        await session.close();
    }
};

/**
 * 获取角色的地理位置上下文
 * @param projectId 项目ID
 * @param characterId 角色ID
 */
export const getCharacterLocationContext = async (
    projectId: string,
    characterId: string
): Promise<{
    origin?: any;
    residence?: any;
    controlledTerritories: any[];
    exiledFrom: any[];
}> => {
    const d = getDriver();
    const session = d.session();

    try {
        const result = await session.run(
            `MATCH (c:Character {id: $characterId, projectId: $projectId})
             OPTIONAL MATCH (c)-[:ORIGINATED_FROM]->(origin:WorldSetting)
             OPTIONAL MATCH (c)-[:RESIDES_IN]->(residence:WorldSetting)
             OPTIONAL MATCH (c)-[:CONTROLS_TERRITORY]->(territory:WorldSetting)
             OPTIONAL MATCH (c)-[:EXILED_FROM]->(exile:WorldSetting)
             RETURN origin,
                    residence,
                    collect(DISTINCT territory) as controlledTerritories,
                    collect(DISTINCT exile) as exiledFrom`,
            { projectId, characterId }
        );

        if (result.records.length === 0) {
            return {
                origin: undefined,
                residence: undefined,
                controlledTerritories: [],
                exiledFrom: []
            };
        }

        const record = result.records[0];
        const originNode = record.get('origin');
        const residenceNode = record.get('residence');
        const territories = record.get('controlledTerritories') || [];
        const exiles = record.get('exiledFrom') || [];

        return {
            origin: originNode ? originNode.properties : undefined,
            residence: residenceNode ? residenceNode.properties : undefined,
            controlledTerritories: territories.map((t: any) => t.properties).filter((t: any) => t !== null),
            exiledFrom: exiles.map((e: any) => e.properties).filter((e: any) => e !== null)
        };
    } finally {
        await session.close();
    }
};

/**
 * 获取某地点的所有关联角色
 * @param projectId 项目ID
 * @param locationId 地点ID
 */
export const getLocationCharacters = async (
    projectId: string,
    locationId: string
): Promise<Array<{
    character: any;
    relationship: 'ORIGINATED_FROM' | 'RESIDES_IN' | 'CONTROLS_TERRITORY' | 'EXILED_FROM';
}>> => {
    const d = getDriver();
    const session = d.session();

    try {
        const result = await session.run(
            `MATCH (w:WorldSetting {id: $locationId, projectId: $projectId})
             OPTIONAL MATCH (c1:Character)-[:ORIGINATED_FROM]->(w)
             OPTIONAL MATCH (c2:Character)-[:RESIDES_IN]->(w)
             OPTIONAL MATCH (c3:Character)-[:CONTROLS_TERRITORY]->(w)
             OPTIONAL MATCH (c4:Character)-[:EXILED_FROM]->(w)
             WITH c1, c2, c3, c4
             UNWIND [
                 {char: c1, rel: 'ORIGINATED_FROM'},
                 {char: c2, rel: 'RESIDES_IN'},
                 {char: c3, rel: 'CONTROLS_TERRITORY'},
                 {char: c4, rel: 'EXILED_FROM'}
             ] as item
             WHERE item.char IS NOT NULL
             RETURN DISTINCT item.char as character, item.rel as relationship
             ORDER BY relationship, character.name`,
            { projectId, locationId }
        );

        return result.records.map(record => ({
            character: record.get('character').properties,
            relationship: record.get('relationship') as 'ORIGINATED_FROM' | 'RESIDES_IN' | 'CONTROLS_TERRITORY' | 'EXILED_FROM'
        }));
    } finally {
        await session.close();
    }
};

/**
 * 获取领土控制关系
 * @param projectId 项目ID
 */
export const getTerritoryControl = async (
    projectId: string
): Promise<Array<{
    character: any;
    territories: any[];
    conflicts: Array<{
        territory: any;
        contestedBy: any[];
    }>;
}>> => {
    const d = getDriver();
    const session = d.session();

    try {
        // 1. 获取所有有领土控制权的角色及其控制的领土
        const controlResult = await session.run(
            `MATCH (c:Character {projectId: $projectId})-[:CONTROLS_TERRITORY]->(t:WorldSetting)
             WITH c, collect(DISTINCT t) as territories
             RETURN c, territories
             ORDER BY c.name`,
            { projectId }
        );

        // 2. 获取每个领土的冲突情况（多个角色控制同一领土）
        const conflictResult = await session.run(
            `MATCH (c1:Character {projectId: $projectId})-[:CONTROLS_TERRITORY]->(t:WorldSetting)
             WITH t, collect(DISTINCT c1) as controllers
             WHERE size(controllers) > 1
             RETURN t, controllers
             ORDER BY t.title`,
            { projectId }
        );

        // 构建领土冲突映射
        const territoryConflicts = new Map<string, any[]>();
        for (const record of conflictResult.records) {
            const territory = record.get('t').properties;
            const controllers = record.get('controllers').map((c: any) => c.properties);
            territoryConflicts.set(territory.id, controllers);
        }

        // 3. 组装最终结果
        const result: Array<{
            character: any;
            territories: any[];
            conflicts: Array<{
                territory: any;
                contestedBy: any[];
            }>;
        }> = [];

        for (const record of controlResult.records) {
            const character = record.get('c').properties;
            const territories = (record.get('territories') || []).map((t: any) => t.properties);

            // 找出该角色控制领土中的冲突
            const conflicts: Array<{
                territory: any;
                contestedBy: any[];
            }> = [];

            for (const territory of territories) {
                const controllers = territoryConflicts.get(territory.id);
                if (controllers && controllers.length > 1) {
                    // 排除当前角色
                    const contestedBy = controllers.filter((c: any) => c.id !== character.id);
                    if (contestedBy.length > 0) {
                        conflicts.push({
                            territory,
                            contestedBy
                        });
                    }
                }
            }

            result.push({
                character,
                territories,
                conflicts
            });
        }

        return result;
    } finally {
        await session.close();
    }
};

// ============================================================
// 世界观一致性检测 API
// ============================================================

/**
 * 一致性检测结果类型
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
 * 包括：地理空间冲突、层级循环、逻辑矛盾
 * @param projectId 项目ID
 */
export const checkWorldConsistency = async (
    projectId: string
): Promise<ConsistencyIssue[]> => {
    const d = getDriver();
    const session = d.session();
    const issues: ConsistencyIssue[] = [];

    try {
        // ============================================================
        // 1. 检测地理空间冲突（角色同时出现在两地）
        // ============================================================
        const spatialConflictResult = await session.run(
            `MATCH (c:Character {projectId: $projectId})
             WHERE c.isDead <> true OR c.isDead IS NULL
             MATCH (c)-[r1:LOCATED_IN]->(loc1:WorldSetting)
             MATCH (c)-[r2:LOCATED_IN]->(loc2:WorldSetting)
             WHERE loc1.id <> loc2.id
             AND (r1.branchId IS NULL OR r1.branchId = 'main')
             AND (r2.branchId IS NULL OR r2.branchId = 'main')
             RETURN c.id as characterId,
                    c.name as characterName,
                    loc1.id as loc1Id,
                    loc1.title as loc1Name,
                    loc2.id as loc2Id,
                    loc2.title as loc2Name`,
            { projectId }
        );

        for (const record of spatialConflictResult.records) {
            issues.push({
                type: 'SPATIAL_CONFLICT',
                severity: 'HIGH',
                description: `角色「${record.get('characterName')}」同时出现在两个不同地点`,
                entities: [
                    { id: record.get('characterId'), name: record.get('characterName'), type: 'Character' },
                    { id: record.get('loc1Id'), name: record.get('loc1Name'), type: 'WorldSetting' },
                    { id: record.get('loc2Id'), name: record.get('loc2Name'), type: 'WorldSetting' }
                ],
                details: `角色同时被标记在「${record.get('loc1Name')}」和「${record.get('loc2Name')}」，这在物理上是不可能的。`,
                suggestion: '请确认角色的当前位置，移除多余的LOCATED_IN关系，只保留一个正确的位置。'
            });
        }

        // ============================================================
        // 2. 检测层级循环（A属于B，B属于A）
        // ============================================================
        const hierarchyCycleResult = await session.run(
            `MATCH path = (a:WorldSetting {projectId: $projectId})-[:CONTAINS*]->(b:WorldSetting)
             WHERE b.id = a.id
             WITH a, nodes(path) as cycleNodes
             RETURN DISTINCT a.id as rootId,
                    a.title as rootName,
                    [n in cycleNodes | {id: n.id, name: n.title}] as cycleEntities`,
            { projectId }
        );

        for (const record of hierarchyCycleResult.records) {
            const cycleEntities = record.get('cycleEntities');
            issues.push({
                type: 'HIERARCHY_CYCLE',
                severity: 'HIGH',
                description: `检测到世界设定的层级循环：${cycleEntities.map((e: any) => e.name).join(' -> ')}`,
                entities: cycleEntities,
                details: `层级关系形成闭环，这会导致无限递归和逻辑错误。`,
                suggestion: '请检查并修正CONTAINS关系，确保层级结构是树形的（无循环）。'
            });
        }

        // 检测两节点间的相互包含（A包含B，B也包含A）
        const mutualContainResult = await session.run(
            `MATCH (a:WorldSetting {projectId: $projectId})-[:CONTAINS]->(b:WorldSetting)
             WHERE b.projectId = $projectId
             AND (b)-[:CONTAINS]->(a)
             RETURN a.id as aId, a.title as aName, b.id as bId, b.title as bName`,
            { projectId }
        );

        for (const record of mutualContainResult.records) {
            // 避免重复报告（A->B和B->A是同一个问题）
            const aId = record.get('aId');
            const bId = record.get('bId');
            const existingIssue = issues.find(i =>
                i.type === 'HIERARCHY_CYCLE' &&
                i.entities.some(e => e.id === aId) &&
                i.entities.some(e => e.id === bId)
            );
            if (!existingIssue) {
                issues.push({
                    type: 'HIERARCHY_CYCLE',
                    severity: 'HIGH',
                    description: `检测到相互包含：「${record.get('aName')}」包含「${record.get('bName')}」，而后者也包含前者`,
                    entities: [
                        { id: aId, name: record.get('aName'), type: 'WorldSetting' },
                        { id: bId, name: record.get('bName'), type: 'WorldSetting' }
                    ],
                    details: '两个设定互相包含对方，形成循环依赖。',
                    suggestion: '请移除其中一个CONTAINS关系，确保层级关系是单向的。'
                });
            }
        }

        // ============================================================
        // 3. 检测逻辑矛盾
        // ============================================================

        // 3.1 检测角色状态矛盾（已死亡角色有活动）
        const deadCharacterActivityResult = await session.run(
            `MATCH (c:Character {projectId: $projectId})
             WHERE c.isDead = true
             MATCH (pn:PlotNode {projectId: $projectId})-[:INVOLVES]->(c)
             RETURN DISTINCT c.id as characterId,
                    c.name as characterName,
                    collect(DISTINCT {id: pn.id, title: pn.title}) as involvedPlots`,
            { projectId }
        );

        for (const record of deadCharacterActivityResult.records) {
            const plots = record.get('involvedPlots');
            if (plots && plots.length > 0) {
                issues.push({
                    type: 'LOGICAL_CONTRADICTION',
                    severity: 'MEDIUM',
                    description: `已死亡角色「${record.get('characterName')}」仍被标记为参与后续情节`,
                    entities: [
                        { id: record.get('characterId'), name: record.get('characterName'), type: 'Character' },
                        ...plots.map((p: any) => ({ id: p.id, name: p.title, type: 'PlotNode' }))
                    ],
                    details: `角色已标记为死亡，但仍参与以下情节：${plots.map((p: any) => `「${p.title}」`).join('、')}`,
                    suggestion: '请确认情节时间线：如果是闪回/回忆场景则可忽略；否则请检查角色死亡状态或移除其参与关系。'
                });
            }
        }

        // 3.2 检测同一设定的冲突描述（通过Echo三元组）
        const conflictingDescriptionsResult = await session.run(
            `MATCH (e1:Echo {projectId: $projectId, status: 'ACCEPTED'})
             MATCH (e2:Echo {projectId: $projectId, status: 'ACCEPTED'})
             WHERE e1.id < e2.id
             AND e1.triples IS NOT NULL AND e2.triples IS NOT NULL
             UNWIND e1.triples AS t1
             UNWIND e2.triples AS t2
             WITH e1, e2, t1, t2
             WHERE t1.subject = t2.subject
             AND t1.relation = t2.relation
             AND t1.object <> t2.object
             AND t1.relation IN ['位于', '属于', '状态是', 'LOCATED_IN', 'BELONGS_TO', 'HAS_STATUS']
             RETURN DISTINCT t1.subject as entityName,
                    t1.relation as relation,
                    t1.object as value1,
                    t2.object as value2,
                    e1.id as echo1Id,
                    e2.id as echo2Id`,
            { projectId }
        );

        for (const record of conflictingDescriptionsResult.records) {
            issues.push({
                type: 'LOGICAL_CONTRADICTION',
                severity: 'MEDIUM',
                description: `检测到「${record.get('entityName')}」的冲突描述`,
                entities: [
                    { id: record.get('echo1Id'), name: record.get('entityName'), type: 'Echo' },
                    { id: record.get('echo2Id'), name: record.get('entityName'), type: 'Echo' }
                ],
                details: `关系「${record.get('relation')}」存在矛盾值：「${record.get('value1')}」vs「${record.get('value2')}」`,
                suggestion: '请检查两个Echo记录，确认哪个描述是正确的，并修正或拒绝错误的那条。'
            });
        }

        // 3.3 检测角色关系矛盾（A是B的敌人，同时又是B的盟友）
        const relationshipContradictionResult = await session.run(
            `MATCH (c1:Character {projectId: $projectId})-[r1:ENEMY_OF]->(c2:Character)
             WHERE c2.projectId = $projectId
             AND EXISTS((c1)-[:ALLY_OF]->(c2))
             RETURN c1.id as c1Id, c1.name as c1Name, c2.id as c2Id, c2.name as c2Name`,
            { projectId }
        );

        for (const record of relationshipContradictionResult.records) {
            issues.push({
                type: 'LOGICAL_CONTRADICTION',
                severity: 'HIGH',
                description: `角色关系矛盾：「${record.get('c1Name')}」同时是「${record.get('c2Name')}」的敌人和盟友`,
                entities: [
                    { id: record.get('c1Id'), name: record.get('c1Name'), type: 'Character' },
                    { id: record.get('c2Id'), name: record.get('c2Name'), type: 'Character' }
                ],
                details: '同时存在ENEMY_OF和ALLY_OF关系，这在逻辑上是矛盾的。',
                suggestion: '请根据剧情发展确定正确的关系类型，移除矛盾的关系边。'
            });
        }

        // 3.4 检测已删除地点的引用（孤儿引用）
        const orphanLocationRefResult = await session.run(
            `MATCH (c:Character {projectId: $projectId})-[r:LOCATED_IN|RESIDES_IN|ORIGINATED_FROM]->(w:WorldSetting)
             WHERE w.projectId IS NULL OR w.projectId <> $projectId
             RETURN DISTINCT c.id as characterId,
                    c.name as characterName,
                    type(r) as relationType,
                    coalesce(w.title, w.id, '未知地点') as locationName`,
            { projectId }
        );

        for (const record of orphanLocationRefResult.records) {
            issues.push({
                type: 'LOGICAL_CONTRADICTION',
                severity: 'LOW',
                description: `角色「${record.get('characterName')}」引用了无效的地点`,
                entities: [
                    { id: record.get('characterId'), name: record.get('characterName'), type: 'Character' }
                ],
                details: `关系类型「${record.get('relationType')}」指向了一个不存在的地点「${record.get('locationName')}」`,
                suggestion: '请检查该地点是否已被删除，如果是，请更新角色的位置信息。'
            });
        }

        return issues;
    } finally {
        await session.close();
    }
};

/**
 * 获取Forge生成所需的完整图谱上下文
 * @param projectId 项目ID
 * @param options 可选参数（角色ID列表、地点ID、情节节点ID）
 */
export const getForgeContext = async (
    projectId: string,
    options?: {
        characterIds?: string[];
        locationId?: string;
        plotNodeId?: string;
        branchId?: string;
    }
): Promise<{
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
}> => {
    const d = getDriver();
    const session = d.session();
    const branchId = options?.branchId || 'main';

    try {
        // ============================================================
        // 1. 查询角色信息（如果指定了 characterIds，只查询这些角色）
        // ============================================================
        const characterWhereClause = options?.characterIds && options.characterIds.length > 0
            ? 'AND c.id IN $characterIds'
            : '';

        const charactersResult = await session.run(
            `MATCH (c:Character {projectId: $projectId})
             WHERE 1=1 ${characterWhereClause}
             OPTIONAL MATCH (c)-[locRel:LOCATED_IN]->(l:WorldSetting)
             WHERE (locRel.branchId IS NULL OR locRel.branchId = 'main')
             RETURN c.id as id,
                    c.name as name,
                    c.role as role,
                    c.state as state,
                    c.physicalStatus as physicalStatus,
                    c.isDead as isDead,
                    l.title as location,
                    c.desire as desire,
                    c.fear as fear,
                    c.weakness as weakness,
                    c.signature as signature
             ORDER BY c.name`,
            { projectId, characterIds: options?.characterIds || [] }
        );

        // ============================================================
        // 2. 查询角色关系
        // ============================================================
        const characterNames = charactersResult.records.map(r => r.get('name'));

        // 查询角色之间的直接关系边
        const directRelsResult = await session.run(
            `MATCH (c1:Character {projectId: $projectId})-[r]->(c2:Character {projectId: $projectId})
             WHERE c1.name IN $characterNames AND c2.name IN $characterNames
             AND type(r) IN ['ENEMY_OF', 'ALLY_OF', 'LOVES', 'KIN_OF', 'MENTORS', 'RIVAL_OF', 'SERVES', 'FRIEND_OF', 'RELATED_TO']
             RETURN c1.name as subject, type(r) as relation, c2.name as object,
                    r.trajectory as trajectory, r.weight as weight`,
            { projectId, characterNames }
        );

        // 查询 Echo 中存储的关系三元组
        const tripleRelsResult = await session.run(
            `MATCH (e:Echo {projectId: $projectId, status: 'ACCEPTED'})
             WHERE e.triples IS NOT NULL
             AND (e.branchId IS NULL OR e.branchId = 'main' OR e.branchId = $branchId)
             UNWIND e.triples AS triple
             WITH e, triple
             WHERE triple.subject IN $characterNames AND triple.object IN $characterNames
             RETURN triple.subject as subject, triple.relation as relation, triple.object as object,
                    triple.trajectory as trajectory, triple.weight as weight`,
            { projectId, characterNames, branchId }
        );

        // 合并关系数据（使用 Map 去重）
        const relationshipMap = new Map<string, {
            subject: string;
            relation: string;
            object: string;
            trajectory?: string;
            weight: number;
        }>();

        // 添加直接关系边
        for (const record of directRelsResult.records) {
            const key = `${record.get('subject')}-${record.get('relation')}-${record.get('object')}`;
            if (!relationshipMap.has(key)) {
                relationshipMap.set(key, {
                    subject: record.get('subject'),
                    relation: record.get('relation'),
                    object: record.get('object'),
                    trajectory: record.get('trajectory'),
                    weight: record.get('weight')?.toNumber?.() || record.get('weight') || 50
                });
            }
        }

        // 添加三元组关系（如果不存在）
        for (const record of tripleRelsResult.records) {
            const key = `${record.get('subject')}-${record.get('relation')}-${record.get('object')}`;
            if (!relationshipMap.has(key)) {
                relationshipMap.set(key, {
                    subject: record.get('subject'),
                    relation: record.get('relation'),
                    object: record.get('object'),
                    trajectory: record.get('trajectory'),
                    weight: record.get('weight')?.toNumber?.() || record.get('weight') || 50
                });
            }
        }

        // 按角色聚合关系
        const characterRelationships = new Map<string, Array<{
            targetName: string;
            type: string;
            trajectory?: string;
            weight: number;
        }>>();

        for (const rel of Array.from(relationshipMap.values())) {
            // 添加正向关系
            if (!characterRelationships.has(rel.subject)) {
                characterRelationships.set(rel.subject, []);
            }
            characterRelationships.get(rel.subject)!.push({
                targetName: rel.object,
                type: rel.relation,
                trajectory: rel.trajectory,
                weight: rel.weight
            });

            // 如果是对称关系，也添加反向关系
            const symmetricRelations = ['ALLY_OF', 'ENEMY_OF', 'KIN_OF', 'FRIEND_OF', 'RIVAL_OF', 'RELATED_TO'];
            if (symmetricRelations.includes(rel.relation)) {
                if (!characterRelationships.has(rel.object)) {
                    characterRelationships.set(rel.object, []);
                }
                characterRelationships.get(rel.object)!.push({
                    targetName: rel.subject,
                    type: rel.relation,
                    trajectory: rel.trajectory,
                    weight: rel.weight
                });
            }
        }

        // 组装角色数据
        const characters = charactersResult.records.map(record => {
            const name = record.get('name');
            const isDead = record.get('isDead') === true;
            const state = record.get('state') || '正常';
            const physicalStatusRaw = record.get('physicalStatus');

            // 构建物理状态描述
            let physicalStatus = isDead ? '已死亡' : state;
            if (physicalStatusRaw) {
                physicalStatus = isDead ? `已死亡 (${physicalStatusRaw})` : `${state} - ${physicalStatusRaw}`;
            }

            return {
                id: record.get('id'),
                name,
                role: record.get('role') || '未知',
                physicalStatus,
                location: record.get('location') || undefined,
                desire: record.get('desire') || undefined,
                fear: record.get('fear') || undefined,
                weakness: record.get('weakness') || undefined,
                signature: record.get('signature') || undefined,
                relationships: characterRelationships.get(name) || []
            };
        });

        // ============================================================
        // 3. 查询未回收的伏笔
        // ============================================================
        const foreshadowingResult = await session.run(
            `MATCH (e:Echo {projectId: $projectId, status: 'ACCEPTED'})
             WHERE e.triples IS NOT NULL
             AND (e.branchId IS NULL OR e.branchId = 'main' OR e.branchId = $branchId)
             UNWIND e.triples AS triple
             WITH e, triple
             WHERE triple.isForeshadowing = true AND triple.status = 'OPEN'
             RETURN e.id as echoId,
                    triple.subject as subject,
                    triple.relation as relation,
                    triple.object as object,
                    triple.status as status
             ORDER BY e.timestamp DESC`,
            { projectId, branchId }
        );

        const unresolvedForeshadowing = foreshadowingResult.records.map(record => ({
            subject: record.get('subject'),
            relation: record.get('relation'),
            object: record.get('object'),
            status: record.get('status') || 'OPEN',
            echoId: record.get('echoId')
        }));

        // ============================================================
        // 4. 查询地点上下文（如果指定了 locationId）
        // ============================================================
        let locationContext: { title: string; category: string; content: string } | undefined;

        if (options?.locationId) {
            const locationResult = await session.run(
                `MATCH (w:WorldSetting {id: $locationId, projectId: $projectId})
                 RETURN w.title as title, w.category as category, w.content as content`,
                { projectId, locationId: options.locationId }
            );

            if (locationResult.records.length > 0) {
                const loc = locationResult.records[0];
                locationContext = {
                    title: loc.get('title'),
                    category: loc.get('category') || '未知',
                    content: loc.get('content') || ''
                };
            }
        }

        // ============================================================
        // 5. 查询情节上下文（如果指定了 plotNodeId）
        // ============================================================
        let plotContext: {
            title: string;
            content: string;
            beatTag?: string;
            relatedCharacters: string[];
        } | undefined;

        if (options?.plotNodeId) {
            const plotResult = await session.run(
                `MATCH (pn:PlotNode {id: $plotNodeId, projectId: $projectId})
                 OPTIONAL MATCH (pn)-[:HAS_CHARACTER]->(c:Character)
                 RETURN pn.title as title,
                        pn.content as content,
                        pn.beatTag as beatTag,
                        collect(c.name) as relatedCharacters`,
                { projectId, plotNodeId: options.plotNodeId }
            );

            if (plotResult.records.length > 0) {
                const plot = plotResult.records[0];
                plotContext = {
                    title: plot.get('title'),
                    content: plot.get('content') || '',
                    beatTag: plot.get('beatTag') || undefined,
                    relatedCharacters: plot.get('relatedCharacters') || []
                };
            }
        }

        return {
            characters,
            unresolvedForeshadowing,
            locationContext,
            plotContext
        };
    } finally {
        await session.close();
    }
};

// ============================================================
// Character Enhancement Queries (P0)
// ============================================================

/**
 * 获取角色的完整深度信息（包含属性、关系、冲突）
 *
 * 此函数返回单个角色的全方位图谱数据，包括：
 * - 节点属性（基本信息 + 深度属性）
 * - 角色间关系（双向）
 * - 角色-世界设定关系
 * - 参与的冲突场景
 *
 * @param projectId - 项目ID
 * @param characterId - 角色ID
 */
export const getCharacterWithDepth = async (
    projectId: string,
    characterId: string
): Promise<{
    character: any;
    relationships: any[];
    worldRelations: any[];
    conflicts: any[];
}> => {
    const d = getDriver();
    const session = d.session();

    try {
        // 1. 获取角色节点（包含深度属性）
        const charResult = await session.run(
            `MATCH (c:Character {id: $charId, projectId: $projectId})
             RETURN c`,
            { charId: characterId, projectId }
        );

        if (charResult.records.length === 0) {
            return { character: null, relationships: [], worldRelations: [], conflicts: [] };
        }

        const character = charResult.records[0].get('c').properties;

        // 2. 获取角色间关系（双向）
        const relsResult = await session.run(
            `MATCH (c:Character {id: $charId, projectId: $projectId})-[r]-(other:Character {projectId: $projectId})
             WHERE type(r) IN ['ENEMY_OF', 'ALLY_OF', 'LOVES', 'KIN_OF', 'MENTORS', 'RIVAL_OF', 'SERVES', 'FRIEND_OF', 'RELATED_TO']
             RETURN other.id as targetId,
                    other.name as targetName,
                    type(r) as relationType,
                    r.weight as weight,
                    r.description as description,
                    r.trajectory as trajectory,
                    CASE WHEN startNode(r) = c THEN 'OUT' ELSE 'IN' END as direction`,
            { charId: characterId, projectId }
        );

        const relationships = relsResult.records.map(r => ({
            targetId: r.get('targetId'),
            targetName: r.get('targetName'),
            relationType: r.get('relationType'),
            weight: r.get('weight')?.toNumber?.() || 50,
            description: r.get('description') || '',
            trajectory: r.get('trajectory') || 'stable',
            direction: r.get('direction'),
        }));

        // 3. 获取角色-世界设定关系
        const worldRelsResult = await session.run(
            `MATCH (c:Character {id: $charId, projectId: $projectId})-[r:ORIGINATED_FROM|RESIDES_IN|CONTROLS_TERRITORY|EXILED_FROM]->(w:WorldSetting)
             RETURN w.id as settingId,
                    w.title as settingName,
                    w.category as category,
                    type(r) as relationType,
                    properties(r) as props`,
            { charId: characterId, projectId }
        );

        const worldRelations = worldRelsResult.records.map(r => ({
            settingId: r.get('settingId'),
            settingName: r.get('settingName'),
            category: r.get('category'),
            relationType: r.get('relationType'),
            properties: r.get('props') || {},
        }));

        // 4. 获取角色参与的冲突场景
        const conflictsResult = await session.run(
            `MATCH (c:Character {id: $charId, projectId: $projectId})<-[:HAS_CONFLICT_PARTICIPANT]-(pn:PlotNode)
             RETURN pn.id as plotNodeId,
                    pn.title as plotNodeTitle,
                    pn.content as content,
                    r.conflictType as conflictType,
                    r.stakes as stakes,
                    r.intensity as intensity`,
            { charId: characterId, projectId }
        );

        const conflicts = conflictsResult.records.map(r => ({
            plotNodeId: r.get('plotNodeId'),
            plotNodeTitle: r.get('plotNodeTitle'),
            content: r.get('content') || '',
            conflictType: r.get('conflictType'),
            stakes: r.get('stakes'),
            intensity: r.get('intensity')?.toNumber?.() || 5,
        }));

        return { character, relationships, worldRelations, conflicts };
    } finally {
        await session.close();
    }
};

/**
 * 按标签搜索角色
 *
 * 支持两种匹配模式：
 * - matchAll=false: 匹配任意标签（OR逻辑）
 * - matchAll=true: 匹配所有标签（AND逻辑）
 *
 * @param projectId - 项目ID
 * @param tags - 标签数组
 * @param matchAll - 是否匹配所有标签（默认任意匹配）
 */
export const searchCharactersByTags = async (
    projectId: string,
    tags: string[],
    matchAll: boolean = false
): Promise<any[]> => {
    const d = getDriver();
    const session = d.session();

    try {
        const query = matchAll
            ? `MATCH (c:Character {projectId: $projectId})
               WHERE ALL(tag IN $tags WHERE tag IN c.tags)
               RETURN c`
            : `MATCH (c:Character {projectId: $projectId})
               WHERE ANY(tag IN $tags WHERE tag IN c.tags)
               RETURN c`;

        const result = await session.run(query, { projectId, tags });
        return result.records.map(r => r.get('c').properties);
    } finally {
        await session.close();
    }
};

/**
 * 按道德阵营查询角色
 *
 * 支持模糊匹配（CONTAINS），可以搜索阵营关键词。
 * 例如：搜索"守序"可以匹配"守序善良"、"守序中立"、"守序邪恶"。
 *
 * @param projectId - 项目ID
 * @param alignmentPattern - 阵营模式（支持模糊匹配）
 */
export const getCharactersByAlignment = async (
    projectId: string,
    alignmentPattern: string
): Promise<any[]> => {
    const d = getDriver();
    const session = d.session();

    try {
        const result = await session.run(
            `MATCH (c:Character {projectId: $projectId})
             WHERE toLower(c.alignment) CONTAINS toLower($pattern)
             RETURN c
             ORDER BY c.name`,
            { projectId, pattern: alignmentPattern }
        );
        return result.records.map(r => r.get('c').properties);
    } finally {
        await session.close();
    }
};

/**
 * 获取角色动机网络（欲望和恐惧的关系图）
 *
 * 返回项目中所有定义了欲望或恐惧的角色，用于可视化展示：
 * - 角色列表（含desire和fear字段）
 * - 去重的欲望列表
 * - 去重的恐惧列表
 *
 * @param projectId - 项目ID
 */
export const getCharacterMotivationNetwork = async (
    projectId: string
): Promise<{
    characters: Array<{
        id: string;
        name: string;
        desire?: string;
        fear?: string;
    }>;
    desires: string[];
    fears: string[];
}> => {
    const d = getDriver();
    const session = d.session();

    try {
        const result = await session.run(
            `MATCH (c:Character {projectId: $projectId})
             WHERE c.desire IS NOT NULL OR c.fear IS NOT NULL
             RETURN c.id as id, c.name as name, c.desire as desire, c.fear as fear`,
            { projectId }
        );

        const characters = result.records.map(r => ({
            id: r.get('id'),
            name: r.get('name'),
            desire: r.get('desire'),
            fear: r.get('fear'),
        }));

        const desires = [...new Set(characters.filter(c => c.desire).map(c => c.desire!))];
        const fears = [...new Set(characters.filter(c => c.fear).map(c => c.fear!))];

        return { characters, desires, fears };
    } finally {
        await session.close();
    }
};

/**
 * 获取指定地点的所有角色
 *
 * 支持两种查询模式：
 * - includeVisitors=true: 包含所有关联角色（起源地、居住地、控制领地）
 * - includeVisitors=false: 仅包含居住者（RESIDES_IN关系）
 *
 * @param projectId - 项目ID
 * @param locationId - 世界设定ID
 * @param includeVisitors - 是否包含访客（默认仅居住者）
 */
export const getCharactersAtLocation = async (
    projectId: string,
    locationId: string,
    includeVisitors: boolean = false
): Promise<Array<{
    character: any;
    relationType: string;
    since?: any;
}>> => {
    const d = getDriver();
    const session = d.session();

    try {
        const relTypes = includeVisitors
            ? 'ORIGINATED_FROM|RESIDES_IN|CONTROLS_TERRITORY'
            : 'RESIDES_IN';

        const result = await session.run(
            `MATCH (c:Character {projectId: $projectId})-[r:${relTypes}]->(w:WorldSetting {id: $locationId})
             RETURN c, type(r) as relationType, r.since as since`,
            { projectId, locationId }
        );

        return result.records.map(r => ({
            character: r.get('c').properties,
            relationType: r.get('relationType'),
            since: r.get('since'),
        }));
    } finally {
        await session.close();
    }
};

/**
 * P1 增强：获取角色关系网络
 *
 * 返回完整的角色关系图谱数据，支持多维过滤
 * 用于D3.js或react-force-graph可视化
 *
 * @param projectId - 项目ID
 * @param filters - 可选过滤条件
 *   - relationTypes: 关系类型数组（如 ['ALLY_OF', 'ENEMY_OF']）
 *   - minWeight: 最小关系权重（0-100）
 *   - alignments: 道德阵营数组（如 ['守序善良', '混乱邪恶']）
 *   - includeCharacterIds: 仅包含指定角色ID
 */
export const getCharacterNetwork = async (
    projectId: string,
    filters?: CharacterNetworkFilter
): Promise<{
    nodes: Array<{
        id: string;
        name: string;
        role: string;
        alignment?: string;
        archetype?: string;
        tags?: string[];
        desire?: string;
        fear?: string;
        [key: string]: any;
    }>;
    edges: Array<{
        source: string;
        target: string;
        type: string;
        weight?: number;
        trajectory?: string;
        isBidirectional?: boolean;
        description?: string;
    }>;
}> => {
    const d = getDriver();
    const session = d.session();

    try {
        // 构建过滤条件
        const characterFilters: string[] = [];
        const params: any = { projectId };

        if (filters?.alignments && filters.alignments.length > 0) {
            characterFilters.push('c.alignment IN $alignments');
            params.alignments = filters.alignments;
        }

        if (filters?.includeCharacterIds && filters.includeCharacterIds.length > 0) {
            characterFilters.push('c.id IN $includeCharacterIds');
            params.includeCharacterIds = filters.includeCharacterIds;
        }

        const characterWhere = characterFilters.length > 0
            ? `AND ${characterFilters.join(' AND ')}`
            : '';

        // 构建关系类型过滤
        let relTypeFilter = '';
        if (filters?.relationTypes && filters.relationTypes.length > 0) {
            const relTypes = filters.relationTypes.join('|');
            relTypeFilter = `:[${relTypes}]`;
        }

        // 构建权重过滤
        const weightFilter = filters?.minWeight
            ? `WHERE r.weight >= $minWeight`
            : '';
        if (filters?.minWeight) {
            params.minWeight = filters.minWeight;
        }

        // 获取所有符合条件的角色节点
        const nodesResult = await session.run(
            `MATCH (c:Character {projectId: $projectId})
             WHERE 1=1 ${characterWhere}
             RETURN c`,
            params
        );

        const nodes = nodesResult.records.map(record => {
            const char = record.get('c').properties;
            return {
                id: char.id,
                name: char.name || '未知角色',
                role: char.role || '未设定',
                alignment: char.alignment,
                archetype: char.archetype,
                tags: char.tags || [],
                desire: char.desire,
                fear: char.fear,
                ...char,
            };
        });

        // 如果没有节点，返回空结果
        if (nodes.length === 0) {
            return { nodes: [], edges: [] };
        }

        // 获取角色之间的关系
        const edgesResult = await session.run(
            `MATCH (c1:Character {projectId: $projectId})-[r${relTypeFilter}]->(c2:Character {projectId: $projectId})
             WHERE c1.id IN $nodeIds AND c2.id IN $nodeIds
             ${weightFilter}
             RETURN c1.id as source, c2.id as target, type(r) as type,
                    r.weight as weight, r.trajectory as trajectory,
                    r.isBidirectional as isBidirectional,
                    r.description as description`,
            {
                ...params,
                nodeIds: nodes.map(n => n.id),
            }
        );

        const edges = edgesResult.records.map(record => ({
            source: record.get('source'),
            target: record.get('target'),
            type: record.get('type'),
            weight: record.get('weight') || 50,
            trajectory: record.get('trajectory'),
            isBidirectional: record.get('isBidirectional') || false,
            description: record.get('description'),
        }));

        return { nodes, edges };
    } finally {
        await session.close();
    }
};

/**
 * P2 增强：获取角色关系时间线
 *
 * 返回指定角色的关系演化历史，追踪所有关系变化
 * 包括关系创建、更新、删除，以及触发变化的Echo
 *
 * @param projectId - 项目ID
 * @param characterId - 角色ID
 */
export const getRelationshipTimeline = async (
    projectId: string,
    characterId: string
): Promise<RelationshipTimelineEntry[]> => {
    const d = getDriver();
    const session = d.session();

    try {
        // 查询角色的所有关系（双向）
        const relationshipsResult = await session.run(
            `MATCH (c:Character {projectId: $projectId, id: $characterId})-[r]->(other:Character)
             RETURN c.id as sourceId, other.id as targetCharacterId, other.name as targetCharacterName,
                    type(r) as type, r.weight as weight, r.description as description, r
             UNION ALL
             MATCH (other:Character)-[r]->(c:Character {projectId: $projectId, id: $characterId})
             RETURN other.id as sourceId, c.id as targetCharacterId, other.name as targetCharacterName,
                    type(r) as type, r.weight as weight, r.description as description, r`,
            { projectId, characterId }
        );

        const timelineEntries: RelationshipTimelineEntry[] = [];

        // 处理每个关系，提取时间线信息
        for (const record of relationshipsResult.records) {
            const relation = record.get('r');
            const props = relation.properties;

            // 检查是否有创建时间或更新时间
            const createdAt = props.createdAt || props.timestamp;
            const updatedAt = props.updatedAt;

            if (createdAt) {
                timelineEntries.push({
                    timestamp: createdAt,
                    targetCharacterId: record.get('targetCharacterId'),
                    targetCharacterName: record.get('targetCharacterName'),
                    after: {
                        type: record.get('type'),
                        weight: record.get('weight'),
                        description: record.get('description'),
                    },
                    changeType: 'created',
                });
            }

            if (updatedAt && updatedAt !== createdAt) {
                timelineEntries.push({
                    timestamp: updatedAt,
                    targetCharacterId: record.get('targetCharacterId'),
                    targetCharacterName: record.get('targetCharacterName'),
                    after: {
                        type: record.get('type'),
                        weight: record.get('weight'),
                        description: record.get('description'),
                    },
                    changeType: 'updated',
                });
            }
        }

        // 按时间排序（最新的在前）
        timelineEntries.sort((a, b) => b.timestamp - a.timestamp);

        return timelineEntries;
    } finally {
        await session.close();
    }
};

/**
 * P2 增强：获取角色与特定目标的关系历史
 *
 * 返回指定角色与特定目标角色之间的完整关系演化历史
 *
 * @param projectId - 项目ID
 * @param characterId - 主角色ID
 * @param targetCharacterId - 目标角色ID
 */
export const getRelationshipHistory = async (
    projectId: string,
    characterId: string,
    targetCharacterId: string
): Promise<{
    timeline: RelationshipTimelineEntry[];
    currentRelationship?: {
        type: string;
        weight?: number;
        description?: string;
        isBidirectional?: boolean;
        trajectory?: string;
    };
}> => {
    const d = getDriver();
    const session = d.session();

    try {
        // 查询当前关系状态
        const currentResult = await session.run(
            `MATCH (c:Character {projectId: $projectId, id: $characterId})-[r]->(target:Character {id: $targetCharacterId})
             RETURN type(r) as type, r.weight as weight, r.description as description,
                    r.isBidirectional as isBidirectional, r.trajectory as trajectory
             UNION ALL
             MATCH (target:Character {id: $targetCharacterId})-[r]->(c:Character {projectId: $projectId, id: $characterId})
             RETURN type(r) as type, r.weight as weight, r.description as description,
                    r.isBidirectional as isBidirectional, r.trajectory as trajectory`,
            { projectId, characterId, targetCharacterId }
        );

        let currentRelationship: any = null;

        if (currentResult.records.length > 0) {
            const record = currentResult.records[0];
            currentRelationship = {
                type: record.get('type'),
                weight: record.get('weight'),
                description: record.get('description'),
                isBidirectional: record.get('isBidirectional'),
                trajectory: record.get('trajectory'),
            };
        }

        // 获取完整时间线
        const timeline = await getRelationshipTimeline(projectId, characterId);

        // 过滤出与特定目标相关的时间线条目
        const filteredTimeline = timeline.filter(
            entry => entry.targetCharacterId === targetCharacterId
        );

        return {
            timeline: filteredTimeline,
            currentRelationship,
        };
    } finally {
        await session.close();
    }
};
