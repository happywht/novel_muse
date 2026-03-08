import { getDriver } from './client';
import { graphLlm } from './llm';

/**
 * Sync: Push project data from MySQL into Neo4j
 */
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

            // [P0] NEW: Extract and sync structured character relationships via AI
            try {
                const extractedRelations = await graphLlm.extractCharacterRelationships(projectData.characters);
                if (extractedRelations.length > 0) {
                    for (const rel of extractedRelations) {
                        const relType = rel.relation.replace(/[^A-Z0-9_]/gi, '').toUpperCase() || 'RELATED_TO';
                        await session.run(
                            `MATCH (s:Character {projectId: $projectId, name: $subject})
                             MATCH (o:Character {projectId: $projectId, name: $object})
                             MERGE (s)-[r:${relType}]->(o)
                             ON CREATE SET r.weight = $weight, r.reason = $reason, r.source = 'AI_EXTRACTED'`,
                            {
                                projectId,
                                subject: rel.subject,
                                object: rel.object,
                                weight: rel.weight || 50,
                                reason: rel.reason || ''
                            }
                        );
                    }
                    console.log(`🧠 AI extracted ${extractedRelations.length} character relationships for project ${projectId}`);
                }
            } catch (aiErr) {
                console.warn("⚠️ AI Relationship Extraction failed during sync, skipping structural edges.", aiErr);
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
