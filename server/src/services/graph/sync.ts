import { getDriver } from './client';
import { graphLlm } from './llm';

const syncLocks = new Map<string, Promise<void>>();

// ============================================================
// Security: Relation Type Whitelist and Mapping
// ============================================================

/**
 * 中文关系名到英文枚举的映射
 * 与前端 schemas.ts 保持一致
 */
const CHINESE_TO_TYPE_MAP: Record<string, string> = {
    // 敌对关系
    '敌人': 'ENEMY_OF',
    '敌对': 'ENEMY_OF',
    '仇人': 'ENEMY_OF',
    '仇敌': 'ENEMY_OF',
    '死敌': 'ENEMY_OF',
    '宿敌': 'ENEMY_OF',
    'nemesis': 'ENEMY_OF',
    'archenemy': 'ENEMY_OF',

    // 盟友关系
    '盟友': 'ALLY_OF',
    '同盟': 'ALLY_OF',
    '伙伴': 'ALLY_OF',
    '同伴': 'ALLY_OF',
    '同僚': 'ALLY_OF',
    'ally': 'ALLY_OF',
    'companion': 'ALLY_OF',

    // 爱情关系
    '爱': 'LOVES',
    '爱慕': 'LOVES',
    '恋人': 'LOVES',
    '情人': 'LOVES',
    '暗恋': 'LOVES',
    '喜欢': 'LOVES',
    'loves': 'LOVES',
    'lover': 'LOVES',
    'crush': 'LOVES',

    // 亲情关系
    '亲人': 'KIN_OF',
    '亲属': 'KIN_OF',
    '家人': 'KIN_OF',
    '亲戚': 'KIN_OF',
    'kin': 'KIN_OF',
    'family': 'KIN_OF',

    // 师徒关系
    '师父': 'MENTORS',
    '师傅': 'MENTORS',
    '徒弟': 'MENTORS',
    '师徒': 'MENTORS',
    '导师': 'MENTORS',
    '学生': 'MENTORS',
    'mentor': 'MENTORS',
    'student': 'MENTORS',

    // 竞争关系
    '竞争': 'RIVAL_OF',
    '对手': 'RIVAL_OF',
    '敌手': 'RIVAL_OF',
    'rival': 'RIVAL_OF',

    // 效忠关系
    '效忠': 'SERVES',
    '下属': 'SERVES',
    '仆人': 'SERVES',
    '臣服': 'SERVES',
    'serves': 'SERVES',
    'servant': 'SERVES',
    'subordinate': 'SERVES',

    // 友谊关系
    '朋友': 'FRIEND_OF',
    '好友': 'FRIEND_OF',
    '友情': 'FRIEND_OF',
    'friend': 'FRIEND_OF',
};

/**
 * 有效的关系类型白名单
 * 这些是 Neo4j 图数据库中允许的关系类型
 */
const VALID_RELATION_TYPES = new Set([
    'ENEMY_OF',
    'ALLY_OF',
    'LOVES',
    'KIN_OF',
    'MENTORS',
    'RIVAL_OF',
    'SERVES',
    'FRIEND_OF',
    'RELATED_TO',  // 默认/后备类型
    // 系统内置关系类型
    'INVOLVED_IN',
    'HAS_ECHO',
    'POV_IS',
    'PRECEDES',
    'IMPLEMENTS',
    'INVOLVES',
    'LOCATED_IN',
    // WorldSetting 相关关系类型
    'CONTAINS',        // WorldSetting 层级包含关系
    'ORIGINATED_FROM', // 角色-WorldSetting 起源关系
    'RESIDES_IN',      // 角色-WorldSetting 居住关系
    'CONTROLS_TERRITORY', // 角色-WorldSetting 领地控制关系
    'EXILED_FROM',     // 角色-WorldSetting 流放关系
    'HAS_CONFLICT_PARTICIPANT', // PlotNode-Character 冲突参与关系
    // Chapter 相关关系类型
    'EXPANDS_TO',       // PlotNode-Chapter 扩展关系
    'CONTAINS_BEAT',    // Chapter-ChapterBeat 包含关系
]);

/**
 * 安全地将关系类型字符串转换为有效的 Cypher 关系类型
 *
 * @param relation - 原始关系类型字符串（可能是中文、英文或混合）
 * @returns 经过白名单验证的安全关系类型
 *
 * Security:
 * - 使用白名单验证，防止 Cypher 注入
 * - 支持中文关系名到英文枚举的转换
 * - 任何不在白名单中的类型都回退到 RELATED_TO
 */
function sanitizeRelationType(relation: string): string {
    if (!relation || typeof relation !== 'string') {
        return 'RELATED_TO';
    }

    // 1. 尝试从中文映射表查找
    const normalizedInput = relation.trim();
    if (CHINESE_TO_TYPE_MAP[normalizedInput]) {
        return CHINESE_TO_TYPE_MAP[normalizedInput];
    }

    // 2. 标准化英文输入（转大写，替换空格为下划线）
    const normalized = normalizedInput
        .toUpperCase()
        .replace(/\s+/g, '_')
        .replace(/[^A-Z0-9_]/g, '');

    // 3. 检查是否在白名单中
    if (VALID_RELATION_TYPES.has(normalized)) {
        return normalized;
    }

    // 4. 处理 AI 可能返回的简化格式（如 ENEMY -> ENEMY_OF）
    const simplifiedMapping: Record<string, string> = {
        'ENEMY': 'ENEMY_OF',
        'ALLY': 'ALLY_OF',
        'LOVE': 'LOVES',
        'KIN': 'KIN_OF',
        'MENTOR': 'MENTORS',
        'RIVAL': 'RIVAL_OF',
        'SERVE': 'SERVES',
        'FRIEND': 'FRIEND_OF',
    };

    if (simplifiedMapping[normalized]) {
        return simplifiedMapping[normalized];
    }

    // 5. 不在白名单中，使用默认类型
    console.warn(`[Graph Security] Unknown relation type "${relation}" -> normalized to "${normalized}" -> fallback to RELATED_TO`);
    return 'RELATED_TO';
}

/**
 * Sync: Push project data from MySQL into Neo4j
 */
export const syncProjectToGraph = async (projectData: any): Promise<void> => {
    const projectId = projectData.id;

    // Mutex lock to prevent duplicate nodes from concurrent frontend requests
    if (syncLocks.has(projectId)) {
        try {
            await syncLocks.get(projectId);
        } catch (e) {
            // Ignore previous errors to try again
        }
    }

    const syncPromise = doSyncProject(projectData);
    syncLocks.set(projectId, syncPromise);

    try {
        await syncPromise;
    } finally {
        if (syncLocks.get(projectId) === syncPromise) {
            syncLocks.delete(projectId);
        }
    }
};

const doSyncProject = async (projectData: any): Promise<void> => {
    const d = getDriver();
    const session = d.session();

    try {
        const projectId = projectData.id;

        // 1. Clear existing graph data for this project
        await session.run(
            `MATCH (n {projectId: $projectId}) DETACH DELETE n`,
            { projectId }
        );

        // 2. Create Character nodes with enhanced fields
        if (projectData.characters?.length > 0) {
            for (const char of projectData.characters) {
                await session.run(
                    `CREATE (c:Character {
            id: $id, name: $name, role: $role, archetype: $archetype,
            description: $description, projectId: $projectId,
            alignment: $alignment, tags: $tags, desire: $desire, fear: $fear,
            signature: $signature, contrast: $contrast, weakness: $weakness,
            physicalStatus: $physicalStatus, foreshadowingHooks: $foreshadowingHooks,
            arc: $arc
          })`,
                    {
                        id: char.id,
                        name: char.name,
                        role: char.role || '',
                        archetype: char.archetype || '',
                        description: (char.description || '').substring(0, 500),
                        projectId,
                        // 新增: 角色深度字段
                        alignment: char.alignment || '',
                        tags: char.tags || [],
                        desire: char.desire || '',
                        fear: char.fear || '',
                        signature: char.signature || '',
                        contrast: char.contrast || '',
                        weakness: char.weakness || '',
                        physicalStatus: char.physicalStatus || '',
                        foreshadowingHooks: char.foreshadowingHooks || [],
                        // 新增: 角色弧线字段 (JSON序列化)
                        arc: char.arc ? JSON.stringify(char.arc) : null,
                    }
                );
            }

            // [P0] Sync character relationships - prioritize structuredRelations over AI extraction
            try {
                let triplesToSync: Array<{
                    subject: string;
                    relation: string;
                    object: string;
                    weight: number;
                    reason: string;
                    source: 'STRUCTURED_DATA' | 'AI_EXTRACTED';
                }> = [];

                // Step 1: Try to use structuredRelations from frontend
                let hasStructuredData = false;
                for (const char of projectData.characters) {
                    if (char.structuredRelations && Array.isArray(char.structuredRelations) && char.structuredRelations.length > 0) {
                        hasStructuredData = true;
                        for (const rel of char.structuredRelations) {
                            // Get target character name - support both targetName and targetCharacterName
                            const targetName = rel.targetName || rel.targetCharacterName;
                            if (!targetName) continue;

                            // Security: Use whitelist validation instead of regex filtering
                            const relType = sanitizeRelationType(rel.type || 'RELATED_TO');

                            triplesToSync.push({
                                subject: char.name,
                                relation: relType,
                                object: targetName,
                                weight: rel.weight || 50,
                                reason: rel.description || '',
                                source: 'STRUCTURED_DATA'
                            });
                        }
                    }
                }

                // Step 2: Fallback to AI extraction only if no structured data exists
                if (!hasStructuredData) {
                    console.log(`🔄 No structuredRelations found, falling back to AI extraction for project ${projectId}`);
                    const extractedRelations = await graphLlm.extractCharacterRelationships(projectData.characters);
                    if (extractedRelations.length > 0) {
                        triplesToSync = extractedRelations.map(rel => ({
                            subject: rel.subject,
                            // Security: Use whitelist validation instead of regex filtering
                            relation: sanitizeRelationType(rel.relation),
                            object: rel.object,
                            weight: rel.weight || 50,
                            reason: rel.reason || '',
                            source: 'AI_EXTRACTED' as const
                        }));
                    }
                }

                // Step 3: Sync all triples to Neo4j
                if (triplesToSync.length > 0) {
                    for (const triple of triplesToSync) {
                        try {
                            await session.run(
                                `MATCH (s:Character {projectId: $projectId, name: $subject})
                                 MATCH (o:Character {projectId: $projectId, name: $object})
                                 MERGE (s)-[r:${triple.relation}]->(o)
                                 ON CREATE SET r.weight = $weight, r.reason = $reason, r.source = $source, r.createdAt = timestamp()
                                 ON MATCH SET r.weight = $weight, r.reason = $reason, r.source = $source, r.updatedAt = timestamp()`,
                                {
                                    projectId,
                                    subject: triple.subject,
                                    object: triple.object,
                                    weight: triple.weight,
                                    reason: triple.reason,
                                    source: triple.source
                                }
                            );
                        } catch (err) {
                            console.warn(`Failed to sync relation ${triple.subject}-[:${triple.relation}]->${triple.object}:`, err);
                        }
                    }
                    console.log(`✅ Synced ${triplesToSync.length} character relationships for project ${projectId} (source: ${hasStructuredData ? 'STRUCTURED_DATA' : 'AI_EXTRACTED'})`);
                }
            } catch (syncErr) {
                console.warn("⚠️ Character relationship sync failed, skipping structural edges.", syncErr);
            }
        }

        // 2.5. Create PlotNode nodes and relationships
        if (projectData.plotNodes?.length > 0) {
            try {
                // 2.5.1. Create PlotNode nodes
                for (const node of projectData.plotNodes) {
                    await session.run(
                        `MERGE (pn:PlotNode {id: $id, projectId: $projectId})
                         SET pn.title = $title, pn.content = $content,
                             pn.order = $order, pn.beatTag = $beatTag,
                             pn.conflictScenario = $conflictScenario,
                             pn.relatedChapters = $relatedChapters`,
                        {
                            id: node.id,
                            projectId,
                            title: node.title,
                            content: node.content?.substring(0, 500),
                            order: node.order,
                            beatTag: node.beatTag,
                            // 新增: 冲突场景 (JSON序列化，支持null)
                            conflictScenario: node.conflictScenario ? JSON.stringify(node.conflictScenario) : null,
                            // 新增: 关联章节 (JSON数组)
                            relatedChapters: JSON.stringify(node.relatedChapters || []),
                        }
                    );

                    // 2.5.2. Create PlotNode-Character relationships
                    if (node.relatedCharacters?.length > 0) {
                        for (const charId of node.relatedCharacters) {
                            try {
                                await session.run(
                                    `MATCH (pn:PlotNode {id: $plotNodeId, projectId: $projectId})
                                     MATCH (c:Character {id: $charId, projectId: $projectId})
                                     MERGE (pn)-[:INVOLVES]->(c)`,
                                    { plotNodeId: node.id, projectId, charId }
                                );
                            } catch (charRelErr) {
                                console.warn(`Failed to link PlotNode ${node.id} to Character ${charId}:`, charRelErr);
                            }
                        }
                    }

                    // 2.5.3. Create PlotNode-WorldSetting relationships
                    if (node.relatedLocations?.length > 0) {
                        for (const locId of node.relatedLocations) {
                            try {
                                await session.run(
                                    `MATCH (pn:PlotNode {id: $plotNodeId, projectId: $projectId})
                                     MATCH (w:WorldSetting {id: $locId, projectId: $projectId})
                                     MERGE (pn)-[:LOCATED_IN]->(w)`,
                                    { plotNodeId: node.id, projectId, locId }
                                );
                            } catch (locRelErr) {
                                console.warn(`Failed to link PlotNode ${node.id} to WorldSetting ${locId}:`, locRelErr);
                            }
                        }
                    }
                }

                // 2.5.4. Create PRECEDES relationships between consecutive PlotNodes
                const sortedNodes = [...projectData.plotNodes].sort((a, b) => a.order - b.order);
                for (let i = 0; i < sortedNodes.length - 1; i++) {
                    try {
                        await session.run(
                            `MATCH (a:PlotNode {id: $idA, projectId: $projectId})
                             MATCH (b:PlotNode {id: $idB, projectId: $projectId})
                             MERGE (a)-[:PRECEDES]->(b)`,
                            { idA: sortedNodes[i].id, idB: sortedNodes[i + 1].id, projectId }
                        );
                    } catch (precErr) {
                        console.warn(`Failed to create PRECEDES relationship for PlotNodes ${sortedNodes[i].id} -> ${sortedNodes[i + 1].id}:`, precErr);
                    }
                }

                // 2.5.5. Create ConflictScenario relationships (Enhanced)
                for (const node of projectData.plotNodes) {
                    // 支持冲突场景为 null 的情况（允许清空冲突）
                    if (node.conflictScenario !== null && node.conflictScenario !== undefined) {
                        if (node.conflictScenario.participants?.length > 0) {
                            const conflict = node.conflictScenario;

                            // 为每个参与者创建冲突关系
                            for (const participantId of conflict.participants) {
                                try {
                                    await session.run(
                                        `MATCH (pn:PlotNode {id: $plotNodeId, projectId: $projectId})
                                         MATCH (c:Character {id: $participantId, projectId: $projectId})
                                         MERGE (pn)-[r:HAS_CONFLICT_PARTICIPANT]->(c)
                                         SET r.conflictType = $conflictType,
                                             r.stakes = $stakes,
                                             r.intensity = $intensity,
                                             r.updatedAt = timestamp()`,
                                        {
                                            plotNodeId: node.id,
                                            projectId,
                                            participantId,
                                            conflictType: conflict.type || 'CONFRONTATION',
                                            stakes: (conflict.stakes || '').substring(0, 500),
                                            intensity: conflict.intensity || 5
                                        }
                                    );
                                } catch (conflictErr) {
                                    console.warn(`Failed to create conflict relationship for PlotNode ${node.id} -> Character ${participantId}:`, conflictErr);
                                }
                            }

                            console.log(`  └─ Conflict scenario: ${conflict.participants.length} participants, intensity ${conflict.intensity}, type ${conflict.type}`);
                        }
                    }
                }

                console.log(`✅ Synced ${sortedNodes.length} PlotNodes with relationships`);
            } catch (plotNodeErr) {
                console.warn("⚠️ PlotNode sync failed:", plotNodeErr);
            }
        }

        // 3. Create WorldSetting nodes with category as label
        if (projectData.worldSettings?.length > 0) {
            for (const ws of projectData.worldSettings) {
                // 将 category 也作为节点标签（替换特殊字符为下划线）
                const categoryLabel = (ws.category?.replace(/[^a-zA-Z0-9_]/g, '_') || 'Other').replace(/^_+|_+$/g, '') || 'Other';
                await session.run(
                    `MERGE (w:WorldSetting:${categoryLabel} {id: $id, projectId: $projectId})
                     SET w.title = $title, w.category = $category, w.content = $content,
                         w.parentId = $parentId, w.importance = $importance, w.tags = $tags`,
                    {
                        id: ws.id,
                        title: ws.title,
                        category: ws.category || '',
                        content: (ws.content || '').substring(0, 500),
                        projectId,
                        // 新增: 层级关系字段
                        parentId: ws.parentId || null,
                        importance: ws.importance || null,
                        tags: JSON.stringify(ws.tags || []),
                    }
                );
            }

            // 3.5. Create WorldSetting relationships
            try {
                // 3.5.1. Create CONTAINS relationships (层级包含)
                // 如果 WorldSetting 有 parentId 字段，创建父子关系
                for (const ws of projectData.worldSettings) {
                    if (ws.parentId) {
                        try {
                            await session.run(
                                `MATCH (parent:WorldSetting {id: $parentId, projectId: $projectId})
                                 MATCH (child:WorldSetting {id: $childId, projectId: $projectId})
                                 MERGE (parent)-[:CONTAINS]->(child)`,
                                { parentId: ws.parentId, childId: ws.id, projectId }
                            );
                        } catch (err) {
                            console.warn(`Failed to create CONTAINS relationship for ${ws.title}:`, err);
                        }
                    }
                }

                // 3.5.2. Create Character-WorldSetting relationships (角色与设定关联)
                // 从 characters 中提取与 WorldSetting 的关联
                if (projectData.characters?.length > 0) {
                    for (const char of projectData.characters) {
                        // 如果角色有 originLocation 字段，创建 ORIGINATED_FROM 关系
                        if (char.originLocation) {
                            try {
                                await session.run(
                                    `MATCH (c:Character {id: $charId, projectId: $projectId})
                                     MATCH (w:WorldSetting {id: $locId, projectId: $projectId})
                                     MERGE (c)-[:ORIGINATED_FROM]->(w)`,
                                    { charId: char.id, locId: char.originLocation, projectId }
                                );
                            } catch (err) {
                                console.warn(`Failed to create ORIGINATED_FROM for ${char.name}:`, err);
                            }
                        }

                        // 如果角色有 residence 字段，创建 RESIDES_IN 关系
                        if (char.residence) {
                            try {
                                await session.run(
                                    `MATCH (c:Character {id: $charId, projectId: $projectId})
                                     MATCH (w:WorldSetting {id: $resId, projectId: $projectId})
                                     MERGE (c)-[:RESIDES_IN]->(w)`,
                                    { charId: char.id, resId: char.residence, projectId }
                                );
                            } catch (err) {
                                console.warn(`Failed to create RESIDES_IN for ${char.name}:`, err);
                            }
                        }

                        // 新增: 如果角色有 controlledTerritories 字段，创建 CONTROLS_TERRITORY 关系
                        if (char.controlledTerritories && Array.isArray(char.controlledTerritories)) {
                            for (const territoryId of char.controlledTerritories) {
                                try {
                                    await session.run(
                                        `MATCH (c:Character {id: $charId, projectId: $projectId})
                                         MATCH (w:WorldSetting {id: $territoryId, projectId: $projectId})
                                         MERGE (c)-[:CONTROLS_TERRITORY]->(w)`,
                                        { charId: char.id, territoryId, projectId }
                                    );
                                } catch (err) {
                                    console.warn(`Failed to create CONTROLS_TERRITORY for ${char.name}:`, err);
                                }
                            }
                        }

                        // 新增: 如果角色有 exiledFrom 字段，创建 EXILED_FROM 关系
                        if (char.exiledFrom && Array.isArray(char.exiledFrom)) {
                            for (const exiledLocationId of char.exiledFrom) {
                                try {
                                    await session.run(
                                        `MATCH (c:Character {id: $charId, projectId: $projectId})
                                         MATCH (w:WorldSetting {id: $exiledLocationId, projectId: $projectId})
                                         MERGE (c)-[:EXILED_FROM]->(w)`,
                                        { charId: char.id, exiledLocationId, projectId }
                                    );
                                } catch (err) {
                                    console.warn(`Failed to create EXILED_FROM for ${char.name}:`, err);
                                }
                            }
                        }
                    }
                }

                console.log(`✅ Synced WorldSetting relationships for project ${projectId}`);
            } catch (relErr) {
                console.warn("⚠️ WorldSetting relationship sync failed:", relErr);
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
                        // Security: Use whitelist validation instead of regex filtering
                        const relType = sanitizeRelationType(triple.relation);
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
                        projectId: $projectId, summary: $summary, pov: $pov,
                        metadata: $metadata, targetWordCount: $targetWordCount
                    })`,
                    {
                        id: ch.id,
                        title: ch.title,
                        order: ch.order,
                        projectId,
                        summary: (ch.summary || '').substring(0, 1000),
                        pov: ch.expectedPOV || '',
                        // 新增: 章节元数据 (JSON对象)
                        metadata: JSON.stringify(ch.metadata || []),
                        // 新增: 目标字数
                        targetWordCount: ch.targetWordCount || null,
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

                // 9. Create PlotNode and Link involved entities via PlotNode link if available
                if (ch.plotNodeId) {
                    const node = (projectData.plotNodes || []).find((n: any) => n.id === ch.plotNodeId);
                    if (node) {
                        // Create the PlotNode itself in Neo4j
                        await session.run(
                            `MERGE (pn:PlotNode {id: $id, projectId: $projectId})
                             ON CREATE SET pn.title = $title, pn.type = $type, pn.description = $description, pn.status = $status
                             ON MATCH SET pn.title = $title, pn.type = $type, pn.description = $description, pn.status = $status`,
                            {
                                id: node.id,
                                projectId,
                                title: node.title || 'Unknown Plot Beat',
                                type: node.type || 'MAIN',
                                description: (node.description || '').substring(0, 500),
                                status: node.status || 'DRAFT'
                            }
                        );

                        // Link Chapter to PlotNode
                        await session.run(
                            `MATCH (ch:Chapter {id: $chId, projectId: $projectId})
                             MATCH (pn:PlotNode {id: $pnId, projectId: $projectId})
                             MERGE (ch)-[:IMPLEMENTS]->(pn)`,
                            { chId: ch.id, pnId: node.id, projectId }
                        );

                        const charIds = Array.isArray(node.relatedCharacters) ? node.relatedCharacters : [];
                        const locIds = Array.isArray(node.relatedLocations) ? node.relatedLocations : [];

                        for (const charId of charIds) {
                            await session.run(
                                `MATCH (ch:Chapter {id: $chId, projectId: $projectId})
                                 MATCH (c:Character {id: $charId, projectId: $projectId})
                                 MERGE (ch)-[:INVOLVES]->(c)`,
                                { chId: ch.id, charId, projectId }
                            );

                            // Also link PlotNode to Character
                            await session.run(
                                `MATCH (pn:PlotNode {id: $pnId, projectId: $projectId})
                                 MATCH (c:Character {id: $charId, projectId: $projectId})
                                 MERGE (pn)-[:INVOLVES]->(c)`,
                                { pnId: node.id, charId, projectId }
                            );
                        }
                        for (const locId of locIds) {
                            await session.run(
                                `MATCH (ch:Chapter {id: $chId, projectId: $projectId})
                                 MATCH (l:WorldSetting {id: $locId, projectId: $projectId})
                                 MERGE (ch)-[:LOCATED_IN]->(l)`,
                                { chId: ch.id, locId, projectId }
                            );

                            // Also link PlotNode to Location
                            await session.run(
                                `MATCH (pn:PlotNode {id: $pnId, projectId: $projectId})
                                 MATCH (l:WorldSetting {id: $locId, projectId: $projectId})
                                 MERGE (pn)-[:LOCATED_IN]->(l)`,
                                { pnId: node.id, locId, projectId }
                            );
                        }
                    }
                }
            }
        }

        console.log(`📊 Graph synced for project ${projectId}: ${projectData.characters?.length || 0} chars, ${projectData.worldSettings?.length || 0} settings, ${projectData.chapters?.length || 0} chapters, ${projectData.plotNodes?.length || 0} plot nodes`);
    } finally {
        await session.close();
    }
};

/**
 * Sync a single Echo to Neo4j graph database
 *
 * This function creates an Echo node and its relationships without requiring
 * a full project resync. It supports:
 * - Echo node creation with all properties
 * - AFFECTS relationship to Character or WorldSetting
 * - Triple relationships (create or update existing)
 * - Trajectory tracking (rising/falling/stable)
 * - Foreshadowing markers
 *
 * @param echo - Echo data object containing all necessary properties
 */
export const syncEchoToGraph = async (
    echo: {
        id: string;
        projectId: string;
        type: 'CHARACTER' | 'WORLD';
        targetId: string;
        targetName: string;
        description: string;
        status: string;
        timestamp: number;
        triples?: Array<{
            subject: string;
            relation: string;
            object: string;
            weight?: number;
            trajectory?: string;
            isForeshadowing?: boolean;
        }>;
        confidence?: number;
    }
): Promise<void> => {
    const d = getDriver();
    const session = d.session();

    try {
        const { id, projectId, type, targetId, targetName, description, status, timestamp, triples, confidence } = echo;

        // 1. Create Echo node with all properties
        try {
            await session.run(
                `MERGE (e:Echo {id: $id, projectId: $projectId})
                 SET e.type = $type,
                     e.targetId = $targetId,
                     e.targetName = $targetName,
                     e.description = $description,
                     e.status = $status,
                     e.timestamp = $timestamp,
                     e.confidence = $confidence,
                     e.updatedAt = timestamp()`,
                {
                    id,
                    projectId,
                    type,
                    targetId,
                    targetName,
                    description: description.substring(0, 1000),
                    status,
                    timestamp,
                    confidence: confidence || 0.5
                }
            );
            console.log(`[syncEchoToGraph] Created/Updated Echo node: ${id}`);
        } catch (err) {
            console.warn(`[syncEchoToGraph] Failed to create Echo node ${id}:`, err);
            return; // If we can't create the Echo node, there's no point continuing
        }

        // 2. Create AFFECTS relationship to Character or WorldSetting
        try {
            const targetLabel = type === 'CHARACTER' ? 'Character' : 'WorldSetting';
            await session.run(
                `MATCH (e:Echo {id: $echoId, projectId: $projectId})
                 MATCH (target:${targetLabel} {id: $targetId, projectId: $projectId})
                 MERGE (e)-[r:AFFECTS]->(target)
                 SET r.status = $status, r.timestamp = $timestamp`,
                {
                    echoId: id,
                    projectId,
                    targetId,
                    status,
                    timestamp
                }
            );
            console.log(`[syncEchoToGraph] Created AFFECTS relationship: Echo ${id} -> ${targetLabel} ${targetId}`);
        } catch (err) {
            console.warn(`[syncEchoToGraph] Failed to create AFFECTS relationship for Echo ${id}:`, err);
            // Continue even if this fails - the Echo node is still valuable
        }

        // 3. Process triples - create or update relationship edges
        if (triples && Array.isArray(triples) && triples.length > 0) {
            let successCount = 0;
            let failCount = 0;

            for (const triple of triples) {
                try {
                    // Security: Use whitelist validation for relation type
                    const relType = sanitizeRelationType(triple.relation);

                    // Validate trajectory value
                    const validTrajectories = ['rising', 'falling', 'stable'];
                    const trajectory = validTrajectories.includes(triple.trajectory || '')
                        ? triple.trajectory
                        : 'stable';

                    // Create or update relationship between entities
                    // Support both Character (name) and WorldSetting (title) as entity identifiers
                    await session.run(
                        `MATCH (s {projectId: $projectId}) WHERE (s.name = $subject OR s.title = $subject)
                         MATCH (o {projectId: $projectId}) WHERE (o.name = $object OR o.title = $object)
                         MERGE (s)-[r:${relType}]->(o)
                         ON CREATE SET
                            r.sourceEchoId = $echoId,
                            r.weight = $weight,
                            r.trajectory = $trajectory,
                            r.isForeshadowing = $isForeshadowing,
                            r.status = 'OPEN',
                            r.createdAt = timestamp()
                         ON MATCH SET
                            r.sourceEchoId = $echoId,
                            r.weight = $weight,
                            r.trajectory = $trajectory,
                            r.isForeshadowing = $isForeshadowing,
                            r.updatedAt = timestamp()`,
                        {
                            projectId,
                            subject: triple.subject,
                            object: triple.object,
                            echoId: id,
                            weight: triple.weight || 50,
                            trajectory,
                            isForeshadowing: !!triple.isForeshadowing
                        }
                    );
                    successCount++;

                    // Log foreshadowing markers
                    if (triple.isForeshadowing) {
                        console.log(`[syncEchoToGraph] Foreshadowing detected: ${triple.subject} -[${relType}]-> ${triple.object}`);
                    }
                } catch (err) {
                    failCount++;
                    console.warn(
                        `[syncEchoToGraph] Failed to sync triple ${triple.subject}-[:${triple.relation}]->${triple.object}:`,
                        err
                    );
                }
            }

            console.log(
                `[syncEchoToGraph] Triple sync complete for Echo ${id}: ${successCount} succeeded, ${failCount} failed`
            );
        }

        console.log(`[syncEchoToGraph] Echo ${id} synced successfully to graph`);
    } finally {
        await session.close();
    }
};

/**
 * 同步章节到图谱
 *
 * 此函数创建或更新Chapter节点及其相关关系，支持：
 * - Chapter节点创建（包含所有属性）
 * - EXPANDS_TO关系：PlotNode -> Chapter
 * - ChapterBeat节点创建及CONTAINS_BEAT关系
 *
 * @param chapter - 章节数据对象
 */
export const syncChapterToGraph = async (
    chapter: {
        id: string;
        projectId: string;
        title: string;
        content?: string;
        summary?: string;
        order: number;
        expectedPOV?: string;
        plotNodeId?: string;
        wordCount?: number;
        status?: string;
        beats?: Array<{
            id: string;
            type: 'CONTENT' | 'ACTION' | 'DIALOGUE' | 'TWIST';
            description: string;
            isCompleted: boolean;
        }>;
    }
): Promise<void> => {
    const d = getDriver();
    const session = d.session();

    try {
        const { id, projectId, title, content, summary, order, expectedPOV, plotNodeId, wordCount, status, beats } = chapter;

        // 1. 创建或更新Chapter节点
        try {
            await session.run(
                `MERGE (ch:Chapter {id: $id, projectId: $projectId})
                 SET ch.title = $title,
                     ch.content = $content,
                     ch.summary = $summary,
                     ch.order = $order,
                     ch.expectedPOV = $expectedPOV,
                     ch.wordCount = $wordCount,
                     ch.status = $status,
                     ch.updatedAt = timestamp()`,
                {
                    id,
                    projectId,
                    title,
                    content: (content || '').substring(0, 5000),
                    summary: (summary || '').substring(0, 1000),
                    order,
                    expectedPOV: expectedPOV || '',
                    wordCount: wordCount || 0,
                    status: status || 'DRAFT'
                }
            );
            console.log(`[syncChapterToGraph] Created/Updated Chapter node: ${id} - ${title}`);
        } catch (err) {
            console.warn(`[syncChapterToGraph] Failed to create Chapter node ${id}:`, err);
            return; // 如果无法创建Chapter节点，没有必要继续
        }

        // 2. 如果有plotNodeId，创建EXPANDS_TO关系 (PlotNode)-[:EXPANDS_TO]->(Chapter)
        if (plotNodeId) {
            try {
                await session.run(
                    `MATCH (pn:PlotNode {id: $plotNodeId, projectId: $projectId})
                     MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})
                     MERGE (pn)-[r:EXPANDS_TO]->(ch)
                     SET r.updatedAt = timestamp()`,
                    {
                        plotNodeId,
                        chapterId: id,
                        projectId
                    }
                );
                console.log(`[syncChapterToGraph] Created EXPANDS_TO relationship: PlotNode ${plotNodeId} -> Chapter ${id}`);
            } catch (err) {
                console.warn(`[syncChapterToGraph] Failed to create EXPANDS_TO relationship for Chapter ${id}:`, err);
                // 继续执行，即使关系创建失败
            }
        }

        // 3. 如果有expectedPOV，创建POV_IS关系
        if (expectedPOV) {
            try {
                await session.run(
                    `MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})
                     MATCH (c:Character {projectId: $projectId})
                     WHERE (toLower(c.name) CONTAINS toLower($pov)) OR (toLower($pov) CONTAINS toLower(c.name))
                     MERGE (ch)-[r:POV_IS]->(c)
                     SET r.updatedAt = timestamp()`,
                    {
                        chapterId: id,
                        projectId,
                        pov: expectedPOV
                    }
                );
                console.log(`[syncChapterToGraph] Created POV_IS relationship: Chapter ${id} -> Character ${expectedPOV}`);
            } catch (err) {
                console.warn(`[syncChapterToGraph] Failed to create POV_IS relationship for Chapter ${id}:`, err);
                // 继续执行，即使关系创建失败
            }
        }

        // 4. 如果有beats，创建ChapterBeat节点并建立CONTAINS_BEAT关系
        if (beats && Array.isArray(beats) && beats.length > 0) {
            let successCount = 0;
            let failCount = 0;

            for (let i = 0; i < beats.length; i++) {
                const beat = beats[i];
                try {
                    // 创建ChapterBeat节点并建立关系
                    await session.run(
                        `MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})
                         MERGE (b:ChapterBeat {id: $beatId, projectId: $projectId})
                         SET b.type = $type,
                             b.description = $description,
                             b.isCompleted = $isCompleted,
                             b.order = $order,
                             b.updatedAt = timestamp()
                         MERGE (ch)-[r:CONTAINS_BEAT]->(b)
                         SET r.order = $order`,
                        {
                            chapterId: id,
                            beatId: beat.id,
                            projectId,
                            type: beat.type,
                            description: beat.description.substring(0, 500),
                            isCompleted: beat.isCompleted,
                            order: i
                        }
                    );
                    successCount++;
                } catch (err) {
                    failCount++;
                    console.warn(`[syncChapterToGraph] Failed to sync Beat ${beat.id} for Chapter ${id}:`, err);
                }
            }

            console.log(`[syncChapterToGraph] Beat sync complete for Chapter ${id}: ${successCount} succeeded, ${failCount} failed`);
        }

        console.log(`[syncChapterToGraph] Chapter ${id} synced successfully to graph`);
    } finally {
        await session.close();
    }
};

/**
 * 批量同步章节数组到图谱
 *
 * @param chapters - 章节数组
 */
export const syncChaptersToGraph = async (
    chapters: Array<{
        id: string;
        projectId: string;
        title: string;
        content?: string;
        summary?: string;
        order: number;
        expectedPOV?: string;
        plotNodeId?: string;
        wordCount?: number;
        status?: string;
        beats?: Array<{
            id: string;
            type: 'CONTENT' | 'ACTION' | 'DIALOGUE' | 'TWIST';
            description: string;
            isCompleted: boolean;
        }>;
    }>
): Promise<void> => {
    if (!chapters || chapters.length === 0) {
        console.log('[syncChaptersToGraph] No chapters to sync');
        return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const chapter of chapters) {
        try {
            await syncChapterToGraph(chapter);
            successCount++;
        } catch (err) {
            failCount++;
            console.warn(`[syncChaptersToGraph] Failed to sync chapter ${chapter.id}:`, err);
        }
    }

    console.log(`[syncChaptersToGraph] Batch sync complete: ${successCount} succeeded, ${failCount} failed`);
};

/**
 * 同步Forge生成结果到图谱
 *
 * 此函数处理Forge生成的结果，包括：
 * - 同步Echo节点到图谱
 * - 同步关系三元组
 * - 更新角色物理状态
 * - 创建章节与角色/Echo的关联关系
 *
 * @param result - Forge生成结果对象
 * @returns 同步统计信息
 */
export const syncForgeResult = async (
    result: {
        projectId: string;
        chapterId: string;
        echoes: Array<{
            id: string;
            type: 'CHARACTER' | 'WORLD';
            targetId: string;
            targetName: string;
            description: string;
            status: string;
            timestamp: number;
            triples?: Array<{
                subject: string;
                relation: string;
                object: string;
                weight?: number;
                trajectory?: string;
                isForeshadowing?: boolean;
                status?: string;
            }>;
        }>;
        physicalStatusUpdates?: Array<{
            characterId: string;
            status: string;
            location?: string;
        }>;
    }
): Promise<{
    syncedEchoes: number;
    syncedTriples: number;
    updatedCharacters: number;
    errors: string[];
}> => {
    const { projectId, chapterId, echoes, physicalStatusUpdates } = result;
    const errors: string[] = [];
    let syncedEchoes = 0;
    let syncedTriples = 0;
    let updatedCharacters = 0;

    console.log(`[syncForgeResult] Starting sync for project ${projectId}, chapter ${chapterId}`);
    console.log(`[syncForgeResult] Processing ${echoes?.length || 0} echoes, ${physicalStatusUpdates?.length || 0} status updates`);

    // 1. 同步每个Echo到图谱
    if (echoes && Array.isArray(echoes) && echoes.length > 0) {
        for (const echo of echoes) {
            try {
                // 调用现有的syncEchoToGraph同步Echo
                await syncEchoToGraph({
                    id: echo.id,
                    projectId,
                    type: echo.type,
                    targetId: echo.targetId,
                    targetName: echo.targetName,
                    description: echo.description,
                    status: echo.status,
                    timestamp: echo.timestamp,
                    triples: echo.triples,
                    confidence: 0.8 // Forge生成的Echo默认置信度
                });
                syncedEchoes++;

                // 统计同步的三元组数量
                if (echo.triples && Array.isArray(echo.triples)) {
                    syncedTriples += echo.triples.length;
                }

                // 创建Chapter与Echo的关联关系
                const d = getDriver();
                const session = d.session();
                try {
                    await session.run(
                        `MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})
                         MATCH (e:Echo {id: $echoId, projectId: $projectId})
                         MERGE (ch)-[r:GENERATES]->(e)
                         SET r.timestamp = timestamp()`,
                        {
                            chapterId,
                            projectId,
                            echoId: echo.id
                        }
                    );
                    console.log(`[syncForgeResult] Created GENERATES relationship: Chapter ${chapterId} -> Echo ${echo.id}`);
                } catch (err) {
                    const errorMsg = `Failed to create GENERATES relationship for Echo ${echo.id}: ${err}`;
                    console.warn(`[syncForgeResult] ${errorMsg}`);
                    errors.push(errorMsg);
                } finally {
                    await session.close();
                }
            } catch (err) {
                const errorMsg = `Failed to sync Echo ${echo.id}: ${err}`;
                console.warn(`[syncForgeResult] ${errorMsg}`);
                errors.push(errorMsg);
            }
        }
    }

    // 2. 更新角色物理状态
    if (physicalStatusUpdates && Array.isArray(physicalStatusUpdates) && physicalStatusUpdates.length > 0) {
        const d = getDriver();
        const session = d.session();

        try {
            for (const update of physicalStatusUpdates) {
                try {
                    await session.run(
                        `MATCH (c:Character {id: $characterId, projectId: $projectId})
                         SET c.physicalStatus = $status,
                             c.currentLocation = $location,
                             c.updatedAt = timestamp()`,
                        {
                            characterId: update.characterId,
                            projectId,
                            status: update.status,
                            location: update.location || null
                        }
                    );
                    updatedCharacters++;
                    console.log(`[syncForgeResult] Updated physical status for Character ${update.characterId}`);

                    // 创建Chapter与Character的INVOLVES关系
                    try {
                        await session.run(
                            `MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})
                             MATCH (c:Character {id: $characterId, projectId: $projectId})
                             MERGE (ch)-[r:INVOLVES]->(c)
                             SET r.timestamp = timestamp()`,
                            {
                                chapterId,
                                projectId,
                                characterId: update.characterId
                            }
                        );
                        console.log(`[syncForgeResult] Created INVOLVES relationship: Chapter ${chapterId} -> Character ${update.characterId}`);
                    } catch (err) {
                        const errorMsg = `Failed to create INVOLVES relationship for Character ${update.characterId}: ${err}`;
                        console.warn(`[syncForgeResult] ${errorMsg}`);
                        errors.push(errorMsg);
                    }
                } catch (err) {
                    const errorMsg = `Failed to update physical status for Character ${update.characterId}: ${err}`;
                    console.warn(`[syncForgeResult] ${errorMsg}`);
                    errors.push(errorMsg);
                }
            }
        } finally {
            await session.close();
        }
    }

    // 3. 为所有Echo涉及的目标创建Chapter与Character/WorldSetting的关联
    if (echoes && Array.isArray(echoes) && echoes.length > 0) {
        const d = getDriver();
        const session = d.session();

        try {
            for (const echo of echoes) {
                try {
                    if (echo.type === 'CHARACTER') {
                        await session.run(
                            `MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})
                             MATCH (c:Character {id: $targetId, projectId: $projectId})
                             MERGE (ch)-[r:INVOLVES]->(c)
                             SET r.timestamp = timestamp()`,
                            {
                                chapterId,
                                projectId,
                                targetId: echo.targetId
                            }
                        );
                        console.log(`[syncForgeResult] Created INVOLVES relationship: Chapter ${chapterId} -> Character ${echo.targetId}`);
                    } else if (echo.type === 'WORLD') {
                        await session.run(
                            `MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})
                             MATCH (w:WorldSetting {id: $targetId, projectId: $projectId})
                             MERGE (ch)-[r:REFERENCES]->(w)
                             SET r.timestamp = timestamp()`,
                            {
                                chapterId,
                                projectId,
                                targetId: echo.targetId
                            }
                        );
                        console.log(`[syncForgeResult] Created REFERENCES relationship: Chapter ${chapterId} -> WorldSetting ${echo.targetId}`);
                    }
                } catch (err) {
                    const errorMsg = `Failed to create chapter-entity relationship for Echo ${echo.id}: ${err}`;
                    console.warn(`[syncForgeResult] ${errorMsg}`);
                    errors.push(errorMsg);
                }
            }
        } finally {
            await session.close();
        }
    }

    console.log(`[syncForgeResult] Sync complete: ${syncedEchoes} echoes, ${syncedTriples} triples, ${updatedCharacters} character updates`);
    if (errors.length > 0) {
        console.warn(`[syncForgeResult] Completed with ${errors.length} errors`);
    }

    return {
        syncedEchoes,
        syncedTriples,
        updatedCharacters,
        errors
    };
};
