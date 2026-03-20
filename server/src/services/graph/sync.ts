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
