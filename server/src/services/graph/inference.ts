import { getDriver } from './client';

export interface KnowledgeTriple {
    subject: string;
    relation: string;
    object: string;
    weight?: number;
    trajectory?: string;
    isForeshadowing?: boolean;
    status?: 'OPEN' | 'RESOLVED' | 'ABANDONED';
}

export interface LogicConflict {
    type: 'LOCATION_MISMATCH' | 'RELATIONSHIP_CONFLICT' | 'FACTUAL_INCONSISTENCY';
    description: string;
    truthInGraph: string;
    extractedFact: string;
}

export interface NarrativeInsight {
    type: 'ALLIANCE_POTENTIAL' | 'CONFLICT_WARNING' | 'SECRET_CONNECTION' | 'FACTION_SHIFT';
    description: string;
    involvedEntities: string[];
    logic: string;
}

export interface PropagationRisk {
    targetName: string;
    impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    magnitude: number;
    reason: string;
}

/**
 * Logic Verification: Audit triples against ground truth
 */
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

            // 2. Check Static Relationship Consistency
            let mappedRel = "";
            if (/仇|恨|红名|敌/.test(relation)) mappedRel = "ENEMY_OF";
            else if (/爱|喜|情/.test(relation)) mappedRel = "LOVES";
            else if (/亲|兄|弟|姐|妹|父|母|子|女/.test(relation)) mappedRel = "KIN_OF";

            if (mappedRel) {
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
 * Graph-Driven Context - Retrieve a relevant subgraph for scene generation
 */
export const getRelatedSubgraph = async (
    projectId: string,
    anchorNames: string[],
    branchId: string = 'main'
): Promise<string> => {
    const d = getDriver();
    const session = d.session();
    try {
        const result = await session.run(
            `MATCH (n {projectId: $projectId})
             WHERE (n.name IN $anchors OR n.title IN $anchors)
             AND (n.branchId IS NULL OR n.branchId = 'main' OR n.branchId = $branchId)
             
             OPTIONAL MATCH (n)-[r]-(m {projectId: $projectId})
             WHERE (r.branchId IS NULL OR r.branchId = 'main' OR r.branchId = $branchId)
             AND (m.branchId IS NULL OR m.branchId = 'main' OR m.branchId = $branchId)
             
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

            if (!seenEntityIds.has(n.properties.id)) {
                const name = n.properties.name || n.properties.title;
                const desc = n.properties.description || n.properties.content || "";
                entitiesStr.push(`[${name}]: ${desc.slice(0, 300)}${desc.length > 300 ? '...' : ''}`);
                seenEntityIds.add(n.properties.id);
            }

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
 * Infer narrative insights (Indirect relations, faction dynamics)
 */
export const inferNarrativeInsights = async (
    projectId: string
): Promise<NarrativeInsight[]> => {
    const d = getDriver();
    const session = d.session();
    const insights: NarrativeInsight[] = [];

    try {
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
 * Fetch pending foreshadowing hooks for a project
 */
export const getUnresolvedForeshadowing = async (projectId: string, branchId: string = 'main'): Promise<KnowledgeTriple[]> => {
    const d = getDriver();
    const session = d.session();
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
 * Merge a sandbox branch into the main branch
 */
export const mergeBranch = async (projectId: string, branchId: string): Promise<void> => {
    const d = getDriver();
    if (branchId === 'main') return;
    const session = d.session();
    try {
        await session.run(
            `MATCH (n {projectId: $projectId, branchId: $branchId})
             SET n.branchId = 'main'`,
            { projectId, branchId }
        );

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
 * Faction Detection (阵营识别)
 */
export const getFactionGroups = async (projectId: string): Promise<any[]> => {
    const d = getDriver();
    const session = d.session();
    try {
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
 * State Propagation Simulator (势能传播/蝴蝶效应)
 */
export const simulateStatePropagation = async (
    projectId: string,
    triggerName: string,
    changeDescription: string
): Promise<PropagationRisk[]> => {
    const d = getDriver();
    const session = d.session();
    try {
        const isNegative = /伤|死|败|失|弱|减|退|仇|毁|离|病/.test(changeDescription);

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
                    magnitude: Math.round(weight * 0.6),
                    reason
                });
            }
        }

        return risks.sort((a, b) => b.magnitude - a.magnitude);
    } finally {
        await session.close();
    }
};
