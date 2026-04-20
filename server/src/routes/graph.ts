import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
    getProjectGraph, findPath, getNeighbors, syncProjectToGraph,
    createEdge, verifyLogicConflicts, getRelatedSubgraph,
    inferNarrativeInsights, getPhysicalStatus, getUnresolvedForeshadowing,
    mergeBranch, getFactionGroups, simulateStatePropagation,
    getCharacterConflicts, getHighIntensityConflicts
} from '../services/neo4jService';
import {
    getCharacterTraits,
    getCharacterEvolution,
    getCharacterForeshadowing,
    getCharacterPhysicalStatus,
    // P1 Echo and Outliner graph query functions
    getRelationshipTimeline,
    getEchoForeshadowing,
    detectContradictions,
    getEchoHistory,
    getChapterDependencies,
    getChapterCharacterNetwork,
    getForeshadowingChain,
    getConflictHeatmapData,
    // P2 WorldSetting and Forge graph query functions
    getWorldSettingHierarchy,
    getCharacterLocationContext,
    getLocationCharacters,
    getTerritoryControl,
    getForgeContext,
    // P0 Character Enhancement query functions
    getCharacterWithDepth,
    searchCharactersByTags,
    getCharactersByAlignment,
    getCharacterMotivationNetwork,
    getCharactersAtLocation
} from '../services/graph/queries';
import { syncEchoToGraph, syncChapterToGraph, syncForgeResult, syncSingleCharacter } from '../services/graph/sync';

const prisma = new PrismaClient();

// Local type definitions for API request bodies
interface EchoRequest {
    id: string;
    type: 'CHARACTER' | 'WORLD';
    targetId: string;
    targetName: string;
    description: string;
    status?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'ARCHIVED' | 'AUTO_ACCEPTED';
    timestamp?: number;
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

interface ChapterRequest {
    id: string;
    title: string;
    content?: string;
    summary?: string;
    order?: number;
    expectedPOV?: string;
    plotNodeId?: string;
    beats?: Array<{
        id: string;
        type: 'CONTENT' | 'ACTION' | 'DIALOGUE' | 'TWIST';
        description: string;
        isCompleted: boolean;
    }>;
}

const router = Router();

// POST /api/graph/verify-logic - Audit triples against ground truth (MUST BE BEFORE /:projectId routes)
router.post('/verify-logic', async (req: Request, res: Response) => {
    const { projectId, triples } = req.body;
    if (!projectId || !triples) {
        res.status(400).json({ error: 'Missing projectId or triples' });
        return;
    }
    try {
        const conflicts = await verifyLogicConflicts(projectId, triples);
        res.json(conflicts);
    } catch (err: any) {
        console.error('Logic verify error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/graph/:projectId/insights - Get narrative insights
router.get('/:projectId/insights', async (req: Request, res: Response) => {
    try {
        const insights = await inferNarrativeInsights(req.params.projectId as string);
        res.json(insights);
    } catch (err: any) {
        console.error('Narrative insights error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/graph/:projectId - Get full graph for a project with optional filtering
router.get('/:projectId', async (req: Request, res: Response) => {
    try {
        const { types } = req.query;
        let includeTypes: string[] | undefined = undefined;

        if (types && typeof types === 'string') {
            includeTypes = types.split(',').filter(t => t.trim().length > 0);
        }

        const graph = await getProjectGraph(req.params.projectId as string, includeTypes);
        res.json(graph);
    } catch (err: any) {
        console.error('Graph fetch error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/graph/:projectId/neighbors/:nodeId - Get node neighbors
router.get('/:projectId/neighbors/:nodeId', async (req: Request, res: Response) => {
    try {
        const result = await getNeighbors(req.params.projectId as string, req.params.nodeId as string);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/graph/:projectId/path?from=X&to=Y - Find path between nodes
router.get('/:projectId/path', async (req: Request, res: Response) => {
    const { from, to } = req.query;
    if (!from || !to) {
        res.status(400).json({ error: 'Missing from or to query parameters' });
        return;
    }
    try {
        const path = await findPath(req.params.projectId as string, from as string, to as string);
        res.json(path);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/graph/:projectId/subgraph?anchors=A,B&branchId=main - Get relevant subgraph for context
router.get('/:projectId/subgraph', async (req: Request, res: Response) => {
    const { anchors, branchId } = req.query;
    if (!anchors) {
        res.status(400).json({ error: 'Missing anchors query parameter' });
        return;
    }
    const anchorList = (anchors as string).split(',');
    try {
        const subgraph = await getRelatedSubgraph(req.params.projectId as string, anchorList, branchId as string);
        res.json({ subgraph });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/graph/:projectId/physical-status?names=A,B&branchId=main - Get physical status of entities
router.get('/:projectId/physical-status', async (req: Request, res: Response) => {
    const { names, branchId } = req.query;
    if (!names) {
        res.status(400).json({ error: 'Missing names query parameter' });
        return;
    }
    const anchorList = (names as string).split(',');
    try {
        const status = await getPhysicalStatus(req.params.projectId as string, anchorList, branchId as string);
        res.json(status);
    } catch (err: any) {
        console.error('Physical status error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/graph/:projectId/edge - Create a new manual edge
router.post('/:projectId/edge', async (req: Request, res: Response) => {
    const { sourceId, targetId, type } = req.body;
    if (!sourceId || !targetId || !type) {
        res.status(400).json({ error: 'Missing sourceId, targetId, or type' });
        return;
    }
    try {
        await createEdge(req.params.projectId as string, sourceId, targetId, type);
        res.json({ success: true });
    } catch (err: any) {
        console.error('Edge creation error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/graph/:projectId/sync - Manually trigger graph sync
router.post('/:projectId/sync', async (req: Request, res: Response) => {
    try {
        await syncProjectToGraph(req.body);
        res.json({ success: true });
    } catch (err: any) {
        console.error('Graph sync error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Task 2.1 & 2.2: Get unresolved foreshadowing
router.get('/:projectId/foreshadowing', async (req, res) => {
    try {
        const branchId = req.query.branchId as string;
        const foreshadowing = await getUnresolvedForeshadowing(req.params.projectId as string, branchId);
        res.json(foreshadowing);
    } catch (error: any) {
        console.error("Foreshadowing fetch error:", error);
        res.status(500).json({ error: "Failed to fetch foreshadowing" });
    }
});

// POST /api/graph/:projectId/merge - Merge a sandbox branch into main
router.post('/:projectId/merge', async (req: Request, res: Response) => {
    try {
        const { branchId } = req.body;
        if (!branchId || branchId === 'main') {
            res.status(400).json({ error: 'Valid branchId required' });
            return;
        }
        await mergeBranch(req.params.projectId as string, branchId);
        res.json({ success: true });
    } catch (err: any) {
        console.error('Branch merge error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/graph/:projectId/factions - Get character factions
router.get('/:projectId/factions', async (req: Request, res: Response) => {
    try {
        const factions = await getFactionGroups(req.params.projectId as string);
        res.json(factions);
    } catch (err: any) {
        console.error('Fetch factions error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/graph/:projectId/propagate - Simulate butterfly effect
router.post('/:projectId/propagate', async (req: Request, res: Response) => {
    try {
        const { triggerName, changeDescription } = req.body;
        if (!triggerName) {
            res.status(400).json({ error: 'triggerName required' });
            return;
        }
        const risks = await simulateStatePropagation(req.params.projectId as string, triggerName, changeDescription || "");
        res.json(risks);
    } catch (err: any) {
        console.error('Propagation simulation error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/graph/:projectId/conflicts/character/:characterId - Get conflicts for a character
router.get('/:projectId/conflicts/character/:characterId', async (req: Request, res: Response) => {
    try {
        const conflicts = await getCharacterConflicts(
            req.params.projectId as string,
            req.params.characterId as string
        );
        res.json(conflicts);
    } catch (err: any) {
        console.error('Character conflicts fetch error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/graph/:projectId/conflicts/high-intensity - Get high intensity conflicts
router.get('/:projectId/conflicts/high-intensity', async (req: Request, res: Response) => {
    try {
        const conflicts = await getHighIntensityConflicts(req.params.projectId as string);
        res.json(conflicts);
    } catch (err: any) {
        console.error('High intensity conflicts fetch error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/graph/:projectId/characters/:characterId/traits - Get character traits
router.get('/:projectId/characters/:characterId/traits', async (req: Request, res: Response) => {
    try {
        const traits = await getCharacterTraits(
            req.params.projectId as string,
            req.params.characterId as string
        );
        res.json(traits);
    } catch (err: any) {
        console.error('Character traits fetch error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/graph/:projectId/characters/:characterId/evolution - Get character evolution
router.get('/:projectId/characters/:characterId/evolution', async (req: Request, res: Response) => {
    try {
        const evolution = await getCharacterEvolution(
            req.params.projectId as string,
            req.params.characterId as string
        );
        res.json(evolution);
    } catch (err: any) {
        console.error('Character evolution fetch error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/graph/:projectId/characters/:characterId/foreshadowing - Get character foreshadowing
router.get('/:projectId/characters/:characterId/foreshadowing', async (req: Request, res: Response) => {
    try {
        const foreshadowing = await getCharacterForeshadowing(
            req.params.projectId as string,
            req.params.characterId as string
        );
        res.json(foreshadowing);
    } catch (err: any) {
        console.error('Character foreshadowing fetch error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/graph/:projectId/characters/:characterId/physical-status - Get character physical status
router.get('/:projectId/characters/:characterId/physical-status', async (req: Request, res: Response) => {
    try {
        const physicalStatus = await getCharacterPhysicalStatus(
            req.params.projectId as string,
            req.params.characterId as string
        );
        res.json(physicalStatus);
    } catch (err: any) {
        console.error('Character physical status fetch error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// Echo Sync Endpoints
// ============================================================

// POST /api/graph/:projectId/echoes/:echoId/accept - Accept an Echo and sync to graph
// 从数据库获取 Echo 数据并同步到图谱
router.post('/:projectId/echoes/:echoId/accept', async (req: Request, res: Response) => {
    try {
        const projectId = req.params.projectId as string;
        const echoId = req.params.echoId as string;

        // 1. 从数据库获取 Echo 数据
        const echoFromDb = await prisma.echo.findFirst({
            where: {
                id: echoId,
                projectId: projectId
            }
        });

        if (!echoFromDb) {
            res.status(404).json({
                error: `Echo not found: ${echoId} in project ${projectId}`
            });
            return;
        }

        // 2. 解析 triples JSON（如果存在）
        let triples: Array<{
            subject: string;
            relation: string;
            object: string;
            weight?: number;
            trajectory?: string;
            isForeshadowing?: boolean;
        }> | undefined;

        if (echoFromDb.triples) {
            try {
                const parsedTriples = JSON.parse(echoFromDb.triples);
                if (Array.isArray(parsedTriples)) {
                    triples = parsedTriples;
                }
            } catch (parseErr) {
                console.warn(`[Echo Accept] Failed to parse triples for Echo ${echoId}:`, parseErr);
                // Continue without triples
            }
        }

        // 3. 更新 Echo 状态为 ACCEPTED
        await prisma.echo.update({
            where: { id: echoId },
            data: { status: 'ACCEPTED' }
        });

        // 4. 调用 sync.ts 中的 syncEchoToGraph 函数
        await syncEchoToGraph({
            id: echoFromDb.id,
            projectId,
            type: echoFromDb.type as 'CHARACTER' | 'WORLD',
            targetId: echoFromDb.targetId,
            targetName: echoFromDb.targetName,
            description: echoFromDb.description || '',
            status: 'ACCEPTED',
            timestamp: Number(echoFromDb.timestamp) || Date.now(),
            triples,
            confidence: echoFromDb.confidence || undefined
        });

        res.json({
            success: true,
            message: `Echo ${echoId} accepted and synced to graph`,
            echoId,
            syncDetails: {
                type: echoFromDb.type,
                targetId: echoFromDb.targetId,
                targetName: echoFromDb.targetName,
                triplesCount: triples?.length || 0
            }
        });
    } catch (err: any) {
        console.error('Echo accept sync error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/graph/:projectId/echoes/batch-sync - Batch sync multiple Echoes to graph
// 支持两种模式:
// 1. 传入 echoIds 数组 - 从数据库获取 Echo 数据
// 2. 传入完整的 echoes 数组 - 直接使用提供的数据
router.post('/:projectId/echoes/batch-sync', async (req: Request, res: Response) => {
    try {
        const projectId = req.params.projectId as string;
        const { echoIds, echoes } = req.body as { echoIds?: string[]; echoes?: EchoRequest[] };

        // 优先使用 echoIds 从数据库获取
        let echoesToSync: Array<{
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
            }>;
            confidence?: number;
        }> = [];

        if (echoIds && Array.isArray(echoIds) && echoIds.length > 0) {
            // 从数据库获取 Echo 数据
            const echoesFromDb = await prisma.echo.findMany({
                where: {
                    id: { in: echoIds },
                    projectId: projectId
                }
            });

            for (const echo of echoesFromDb) {
                let triples: Array<{
                    subject: string;
                    relation: string;
                    object: string;
                    weight?: number;
                    trajectory?: string;
                    isForeshadowing?: boolean;
                }> | undefined;

                if (echo.triples) {
                    try {
                        const parsedTriples = JSON.parse(echo.triples);
                        if (Array.isArray(parsedTriples)) {
                            triples = parsedTriples;
                        }
                    } catch (parseErr) {
                        console.warn(`[Batch Sync] Failed to parse triples for Echo ${echo.id}:`, parseErr);
                    }
                }

                echoesToSync.push({
                    id: echo.id,
                    type: echo.type as 'CHARACTER' | 'WORLD',
                    targetId: echo.targetId,
                    targetName: echo.targetName,
                    description: echo.description || '',
                    status: echo.status,
                    timestamp: Number(echo.timestamp) || Date.now(),
                    triples,
                    confidence: echo.confidence || undefined
                });
            }

            // 更新所有 Echo 状态为 ACCEPTED
            await prisma.echo.updateMany({
                where: {
                    id: { in: echoIds },
                    projectId: projectId
                },
                data: { status: 'ACCEPTED' }
            });
        } else if (echoes && Array.isArray(echoes) && echoes.length > 0) {
            // 使用提供的 echoes 数据
            echoesToSync = echoes.map(echo => ({
                id: echo.id,
                type: echo.type,
                targetId: echo.targetId,
                targetName: echo.targetName,
                description: echo.description || '',
                status: echo.status || 'ACCEPTED',
                timestamp: echo.timestamp || Date.now(),
                triples: echo.triples,
                confidence: echo.confidence
            }));
        } else {
            res.status(400).json({ error: 'Missing or empty echoIds or echoes array' });
            return;
        }

        let successCount = 0;
        let failCount = 0;
        const errors: Array<{ echoId: string; error: string }> = [];

        for (const echo of echoesToSync) {
            try {
                if (!echo.id || !echo.type || !echo.targetId) {
                    failCount++;
                    errors.push({ echoId: echo.id || 'unknown', error: 'Missing required fields' });
                    continue;
                }

                await syncEchoToGraph({
                    id: echo.id,
                    projectId,
                    type: echo.type,
                    targetId: echo.targetId,
                    targetName: echo.targetName,
                    description: echo.description,
                    status: 'ACCEPTED',
                    timestamp: echo.timestamp,
                    triples: echo.triples,
                    confidence: echo.confidence
                });

                successCount++;
            } catch (err: any) {
                failCount++;
                errors.push({ echoId: echo.id, error: err.message });
            }
        }

        res.json({
            success: true,
            message: `Batch sync completed: ${successCount} succeeded, ${failCount} failed`,
            stats: {
                total: echoesToSync.length,
                succeeded: successCount,
                failed: failCount
            },
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (err: any) {
        console.error('Echo batch sync error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/graph/:projectId/chapters/sync - Sync chapter to graph
router.post('/:projectId/chapters/sync', async (req: Request, res: Response) => {
    try {
        const projectId = req.params.projectId as string;
        const chapterData = req.body as ChapterRequest;

        // Validate required fields
        if (!chapterData || !chapterData.id || !chapterData.title) {
            res.status(400).json({ error: 'Missing required Chapter fields: id, title' });
            return;
        }

        // Sync Chapter to graph
        await syncChapterToGraph({
            id: chapterData.id,
            projectId,
            title: chapterData.title,
            content: chapterData.content,
            summary: chapterData.summary,
            order: chapterData.order ?? 0,
            expectedPOV: chapterData.expectedPOV,
            plotNodeId: chapterData.plotNodeId,
            wordCount: chapterData.content?.length || 0,
            status: 'DRAFT',
            beats: chapterData.beats?.map(b => ({
                id: b.id,
                type: b.type,
                description: b.description,
                isCompleted: b.isCompleted
            }))
        });

        res.json({
            success: true,
            message: `Chapter ${chapterData.id} synced to graph`,
            chapterId: chapterData.id
        });
    } catch (err: any) {
        console.error('Chapter sync error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// P1 Echo and Outliner Graph Query Endpoints
// ============================================================

// GET /api/graph/:projectId/relationships/timeline - Get relationship evolution timeline between two characters
router.get('/:projectId/relationships/timeline', async (req: Request, res: Response) => {
    const { character1Id, character2Id } = req.query;
    if (!character1Id || !character2Id) {
        res.status(400).json({ error: 'Missing character1Id or character2Id query parameters' });
        return;
    }
    try {
        const timeline = await getRelationshipTimeline(
            req.params.projectId as string,
            character1Id as string,
            character2Id as string
        );
        res.json(timeline);
    } catch (err: any) {
        console.error('Relationship timeline fetch error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/graph/:projectId/echoes/foreshadowing - Get unresolved foreshadowing from Echoes
router.get('/:projectId/echoes/foreshadowing', async (req: Request, res: Response) => {
    try {
        const branchId = (req.query.branchId as string) || 'main';
        const foreshadowing = await getEchoForeshadowing(
            req.params.projectId as string,
            branchId
        );
        res.json(foreshadowing);
    } catch (err: any) {
        console.error('Echo foreshadowing fetch error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/graph/:projectId/echoes/contradictions - Detect contradictions in Echoes
router.get('/:projectId/echoes/contradictions', async (req: Request, res: Response) => {
    try {
        const contradictions = await detectContradictions(req.params.projectId as string);
        res.json(contradictions);
    } catch (err: any) {
        console.error('Contradiction detection error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/graph/:projectId/echoes/:targetId/history - Get Echo history for an entity
router.get('/:projectId/echoes/:targetId/history', async (req: Request, res: Response) => {
    try {
        const history = await getEchoHistory(
            req.params.projectId as string,
            req.params.targetId as string
        );
        res.json(history);
    } catch (err: any) {
        console.error('Echo history fetch error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/graph/:projectId/chapters/:chapterId/dependencies - Get chapter dependencies
router.get('/:projectId/chapters/:chapterId/dependencies', async (req: Request, res: Response) => {
    try {
        const dependencies = await getChapterDependencies(
            req.params.projectId as string,
            req.params.chapterId as string
        );
        res.json(dependencies);
    } catch (err: any) {
        console.error('Chapter dependencies fetch error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/graph/:projectId/chapters/:chapterId/character-network - Get character network for a chapter
router.get('/:projectId/chapters/:chapterId/character-network', async (req: Request, res: Response) => {
    try {
        const network = await getChapterCharacterNetwork(
            req.params.projectId as string,
            req.params.chapterId as string
        );
        res.json(network);
    } catch (err: any) {
        console.error('Chapter character network fetch error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/graph/:projectId/chapters/:chapterId/foreshadowing-chain - Get foreshadowing chain
router.get('/:projectId/chapters/:chapterId/foreshadowing-chain', async (req: Request, res: Response) => {
    const { foreshadowingId } = req.query;
    if (!foreshadowingId) {
        res.status(400).json({ error: 'Missing foreshadowingId query parameter' });
        return;
    }
    try {
        const chain = await getForeshadowingChain(
            req.params.projectId as string,
            foreshadowingId as string
        );
        res.json(chain);
    } catch (err: any) {
        console.error('Foreshadowing chain fetch error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/graph/:projectId/conflicts/heatmap - Get conflict heatmap data
router.get('/:projectId/conflicts/heatmap', async (req: Request, res: Response) => {
    try {
        const heatmapData = await getConflictHeatmapData(req.params.projectId as string);
        res.json(heatmapData);
    } catch (err: any) {
        console.error('Conflict heatmap fetch error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// P2 WorldSetting and Forge API Endpoints
// ============================================================================

// GET /api/graph/:projectId/world-settings/hierarchy - Get world setting hierarchy tree
router.get('/:projectId/world-settings/hierarchy', async (req: Request, res: Response) => {
    try {
        const { rootId } = req.query;
        const hierarchy = await getWorldSettingHierarchy(
            req.params.projectId as string,
            rootId as string | undefined
        );
        res.json(hierarchy);
    } catch (err: any) {
        console.error('World setting hierarchy fetch error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/graph/:projectId/characters/:characterId/location-context - Get character location context
router.get('/:projectId/characters/:characterId/location-context', async (req: Request, res: Response) => {
    try {
        const locationContext = await getCharacterLocationContext(
            req.params.projectId as string,
            req.params.characterId as string
        );
        res.json(locationContext);
    } catch (err: any) {
        console.error('Character location context fetch error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/graph/:projectId/world-settings/:locationId/characters - Get characters associated with a location
router.get('/:projectId/world-settings/:locationId/characters', async (req: Request, res: Response) => {
    try {
        const characters = await getLocationCharacters(
            req.params.projectId as string,
            req.params.locationId as string
        );
        res.json(characters);
    } catch (err: any) {
        console.error('Location characters fetch error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/graph/:projectId/territory-control - Get territory control relationships
router.get('/:projectId/territory-control', async (req: Request, res: Response) => {
    try {
        const territoryControl = await getTerritoryControl(req.params.projectId as string);
        res.json(territoryControl);
    } catch (err: any) {
        console.error('Territory control fetch error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/graph/:projectId/forge-context - Get Forge generation context
router.get('/:projectId/forge-context', async (req: Request, res: Response) => {
    try {
        const { characterIds, locationId, plotNodeId, branchId } = req.query;

        // Parse comma-separated character IDs
        const characterIdList = characterIds
            ? (characterIds as string).split(',').filter(id => id.trim().length > 0)
            : undefined;

        const forgeContext = await getForgeContext(
            req.params.projectId as string,
            {
                characterIds: characterIdList,
                locationId: locationId as string | undefined,
                plotNodeId: plotNodeId as string | undefined,
                branchId: branchId as string | undefined
            }
        );
        res.json(forgeContext);
    } catch (err: any) {
        console.error('Forge context fetch error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/graph/:projectId/forge-sync - Sync Forge generation result to graph
router.post('/:projectId/forge-sync', async (req: Request, res: Response) => {
    try {
        const { chapterId, echoes, physicalStatusUpdates } = req.body;

        if (!chapterId) {
            res.status(400).json({ error: 'Missing chapterId' });
            return;
        }

        if (!echoes || !Array.isArray(echoes)) {
            res.status(400).json({ error: 'Missing or invalid echoes array' });
            return;
        }

        const result = await syncForgeResult({
            projectId: req.params.projectId as string,
            chapterId,
            echoes,
            physicalStatusUpdates: physicalStatusUpdates || []
        });

        res.json(result);
    } catch (err: any) {
        console.error('Forge sync error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// P0 Character Enhancement API Endpoints
// ============================================================================

// GET /api/graph/:projectId/characters/:characterId/depth - Get character with full depth information
router.get('/:projectId/characters/:characterId/depth', async (req: Request, res: Response) => {
    try {
        const data = await getCharacterWithDepth(
            req.params.projectId as string,
            req.params.characterId as string
        );
        res.json(data);
    } catch (err: any) {
        console.error('Character depth fetch error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/graph/:projectId/characters/search/tags - Search characters by tags
router.post('/:projectId/characters/search/tags', async (req: Request, res: Response) => {
    try {
        const { tags, matchAll } = req.body;

        if (!tags || !Array.isArray(tags) || tags.length === 0) {
            res.status(400).json({ error: 'Missing or empty tags array' });
            return;
        }

        const characters = await searchCharactersByTags(
            req.params.projectId as string,
            tags,
            matchAll ?? false
        );
        res.json(characters);
    } catch (err: any) {
        console.error('Character tag search error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/graph/:projectId/characters/search/alignment - Search characters by alignment
router.get('/:projectId/characters/search/alignment', async (req: Request, res: Response) => {
    try {
        const { pattern } = req.query;

        if (!pattern || typeof pattern !== 'string') {
            res.status(400).json({ error: 'Missing or invalid pattern query parameter' });
            return;
        }

        const characters = await getCharactersByAlignment(
            req.params.projectId as string,
            pattern as string
        );
        res.json(characters);
    } catch (err: any) {
        console.error('Character alignment search error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/graph/:projectId/characters/motivation-network - Get character motivation network
router.get('/:projectId/characters/motivation-network', async (req: Request, res: Response) => {
    try {
        const data = await getCharacterMotivationNetwork(req.params.projectId as string);
        res.json(data);
    } catch (err: any) {
        console.error('Motivation network fetch error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/graph/:projectId/world-settings/:locationId/characters-enhanced - Get characters at location (enhanced version)
router.get('/:projectId/world-settings/:locationId/characters-enhanced', async (req: Request, res: Response) => {
    try {
        const { includeVisitors } = req.query;

        const characters = await getCharactersAtLocation(
            req.params.projectId as string,
            req.params.locationId as string,
            includeVisitors === 'true'
        );
        res.json(characters);
    } catch (err: any) {
        console.error('Location characters fetch error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/graph/:projectId/characters/sync - Incremental sync single character
router.post('/:projectId/characters/sync', async (req: Request, res: Response) => {
    try {
        const { character, allCharacters } = req.body;

        if (!character || !character.id || !character.name) {
            res.status(400).json({ error: 'Missing required character fields: id, name' });
            return;
        }

        await syncSingleCharacter(
            character,
            req.params.projectId as string,
            allCharacters
        );

        res.json({
            success: true,
            message: `Character ${character.name} synced to graph`,
            characterId: character.id
        });
    } catch (err: any) {
        console.error('Character sync error:', err);
        res.status(500).json({ error: err.message });
    }
});

export { router as graphRouter };
