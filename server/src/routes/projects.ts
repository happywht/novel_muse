import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { syncProjectToGraph } from '../services/neo4jService';

const router = Router();
const prisma = new PrismaClient();

// ============================================================
// Helper: 从结构化关系生成展示字符串（替代双写）
// ============================================================
const RELATION_TYPE_LABELS: Record<string, string> = {
    'ENEMY_OF': '敌人',
    'ALLY_OF': '盟友',
    'LOVES': '爱慕',
    'KIN_OF': '亲属',
    'MENTORS': '师徒',
    'RIVAL_OF': '竞争',
    'SERVES': '效忠',
    'FRIEND_OF': '朋友',
    'RELATED_TO': '关联',
};

function generateDisplayRelationships(structuredRelationsJson: string | null): string | undefined {
    if (!structuredRelationsJson) return undefined;

    try {
        const relations = JSON.parse(structuredRelationsJson);
        if (!Array.isArray(relations) || relations.length === 0) return undefined;

        return relations
            .map((rel: any) => {
                const typeLabel = RELATION_TYPE_LABELS[rel.type] || rel.description || '关联';
                const targetName = rel.targetName || rel.targetCharacterName || rel.targetCharacterId;
                return `${typeLabel}: ${targetName}`;
            })
            .join('；');
    } catch {
        return undefined;
    }
}

// Helper: Convert BigInt to Number for JSON serialization
const serializeBigInt = (obj: any): any => {
    return JSON.parse(JSON.stringify(obj, (_key, value) =>
        typeof value === 'bigint' ? Number(value) : value
    ));
};

// Helper: Safe JSON parse with fallback
const safeJsonParse = <T>(json: string | null, fallback: T): T => {
    if (!json) return fallback;
    try {
        return JSON.parse(json);
    } catch {
        console.warn('Failed to parse JSON:', json);
        return fallback;
    }
};

// Helper: Safe JSON parse returning undefined on failure
const safeJsonParseOptional = (json: string | null): any => {
    if (!json) return undefined;
    try {
        return JSON.parse(json);
    } catch {
        console.warn('Failed to parse JSON:', json);
        return undefined;
    }
};

// ============================================
// GET /api/projects - List all projects (summary)
// ============================================
router.get('/', async (_req: Request, res: Response) => {
    try {
        const projects = await prisma.project.findMany({
            select: {
                id: true,
                title: true,
                genre: true,
                updatedAt: true,
                _count: {
                    select: { characters: true, worldSettings: true, chapters: true }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        const sortedResult = projects.map((p: any) => ({
            id: p.id,
            title: p.title,
            genre: p.genre,
            lastModified: p.updatedAt.getTime(),
            characterCount: p._count.characters,
            worldSettingCount: p._count.worldSettings,
            chapterCount: p._count.chapters,
        }));

        res.json(sortedResult);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// GET /api/projects/:id - Get full project
// ============================================
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const project = await prisma.project.findUnique({
            where: { id: req.params.id as string },
            include: {
                characters: true,
                worldSettings: true,
                plotVersions: { orderBy: { timestamp: 'desc' } },
                drafts: true,
                chapters: {
                    select: {
                        id: true,
                        title: true,
                        order: true,
                        lastModified: true,
                        summary: true,
                        expectedPOV: true,
                        plotNodeId: true,
                        projectId: true,
                    },
                    orderBy: { order: 'asc' }
                },
                plotNodes: {
                    orderBy: { order: 'asc' }
                },
                echoes: true,
                timeline: { orderBy: { timestamp: 'asc' } },
            }
        });

        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        // Transform to match frontend ProjectState shape
        const state = {
            id: project.id,
            lastModified: project.updatedAt.getTime(),
            title: project.title,
            genre: project.genre,
            premise: project.premise,
            plotOutline: project.plotOutline || '',
            currentWorldDate: project.currentWorldDate,
            customPrompts: JSON.parse(project.customPrompts || '{}'),
            creativeSettings: {
                tone: project.tone,
                style: project.style,
                creativity: project.creativity,
                targetAudience: project.targetAudience,
                promptProfile: (project as any).promptProfile || undefined,
                styleTags: safeJsonParseOptional((project as any).styleTags),
                referenceText: (project as any).referenceText || undefined,
            },
            worldGenConfig: {
                detailLevel: project.detailLevel,
                focus: project.focus,
            },
            activeBranchId: (project as any).activeBranchId || undefined,
            availableBranches: (project as any).availableBranches ? JSON.parse((project as any).availableBranches) : undefined,
            characters: project.characters.map((c: any) => ({
                id: c.id,
                name: c.name,
                role: c.role,
                archetype: c.archetype,
                description: c.description,
                // 关系数据：优先使用 structuredRelations，relationships 作为计算属性或回退
                structuredRelations: safeJsonParseOptional(c.structuredRelations),
                relationships: c.structuredRelations
                    ? generateDisplayRelationships(c.structuredRelations)
                    : c.relationships || undefined,
                imageUrl: c.imageUrl || undefined,
                // 新增字段
                alignment: c.alignment || undefined,
                tags: safeJsonParseOptional(c.tags),
                desire: c.desire || undefined,
                fear: c.fear || undefined,
                signature: c.signature || undefined,
                contrast: c.contrast || undefined,
                weakness: c.weakness || undefined,
                arc: safeJsonParseOptional(c.arc),
                originLocation: c.originLocation || undefined,
                residence: c.residence || undefined,
                controlledTerritories: safeJsonParseOptional(c.controlledTerritories),
                exiledFrom: safeJsonParseOptional(c.exiledFrom),
                physicalStatus: c.physicalStatus || undefined,
                foreshadowingHooks: safeJsonParseOptional(c.foreshadowingHooks),
                lastModified: c.lastModified ? Number(c.lastModified) : undefined,
            })),
            worldSettings: project.worldSettings.map((w: any) => ({
                id: w.id,
                category: w.category,
                title: w.title,
                content: w.content,
                // 新增字段
                parentId: w.parentId || undefined,
                importance: w.importance || undefined,
                tags: safeJsonParseOptional(w.tags),
            })),
            plotHistory: project.plotVersions.map((p: any) => ({
                id: p.id,
                timestamp: Number(p.timestamp),
                content: p.content,
                note: p.note,
            })),
            drafts: project.drafts.map((d: any) => ({
                id: d.id,
                title: d.title,
                content: d.content,
                relatedPlotPoint: d.relatedPlotPoint || undefined,
                lastModified: Number(d.lastModified),
                branchId: d.branchId || undefined,
            })),
            chapters: project.chapters.map((ch: any) => ({
                id: ch.id,
                title: ch.title,
                content: "", // Content is lazy-loaded
                summary: ch.summary || '',
                expectedPOV: ch.expectedPOV || '',
                beats: safeJsonParse(ch.beats, []),
                plotNodeId: ch.plotNodeId || undefined,
                order: ch.order,
                lastModified: Number(ch.lastModified),
                // 新增字段
                metadata: safeJsonParseOptional(ch.metadata),
                targetWordCount: ch.targetWordCount || undefined,
            })),
            plotNodes: project.plotNodes.map((pn: any) => ({
                id: pn.id,
                title: pn.title,
                content: pn.content,
                order: pn.order,
                beatTag: pn.beatTag || undefined,
                relatedCharacters: safeJsonParse(pn.relatedCharacters, []),
                relatedLocations: safeJsonParse(pn.relatedLocations, []),
                // 新增字段
                conflictScenario: safeJsonParseOptional(pn.conflictScenario),
                relatedChapters: safeJsonParseOptional(pn.relatedChapters),
            })),
            echoes: project.echoes.map((e: any) => ({
                id: e.id,
                type: e.type as 'CHARACTER' | 'WORLD',
                targetId: e.targetId,
                targetName: e.targetName,
                description: e.description,
                reason: e.reason,
                status: e.status as any,
                triples: safeJsonParseOptional(e.triples),
                timestamp: Number(e.timestamp),
                branchId: e.branchId || undefined,
                // 新增字段
                confidence: e.confidence || undefined,
                extractionEvidence: e.extractionEvidence || undefined,
            })),
            timeline: project.timeline.map((t: any) => ({
                id: t.id,
                timestamp: Number(t.timestamp),
                worldDate: t.worldDate,
                title: t.title,
                description: t.description,
                involvedEntities: safeJsonParse(t.involvedEntities, []),
                type: t.type as any,
            })),
        };

        res.json(state);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// GET /api/projects/:id/chapters/:chapterId - Fetch specific chapter content
// ============================================
router.get('/:id/chapters/:chapterId', async (req: Request, res: Response) => {
    try {
        const chapter = await prisma.chapter.findUnique({
            where: { id: req.params.chapterId as string }
        });

        if (!chapter || chapter.projectId !== req.params.id) {
            return res.status(404).json({ error: 'Chapter not found' });
        }

        res.json({
            ...chapter,
            lastModified: Number(chapter.lastModified),
            summary: chapter.summary || '',
            expectedPOV: chapter.expectedPOV || '',
            beats: chapter.beats ? JSON.parse(chapter.beats) : [],
            plotNodeId: chapter.plotNodeId || undefined,
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// GET /api/projects/:id/chapters-content - Fetch all non-empty chapter contents
// ============================================
router.get('/:id/chapters-content', async (req: Request, res: Response) => {
    try {
        const chapters = await prisma.chapter.findMany({
            where: {
                projectId: req.params.id as string,
                content: { not: "" }
            },
            select: {
                id: true,
                content: true
            }
        });

        res.json(chapters);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// POST /api/projects - Create new project
// ============================================
router.post('/', async (_req: Request, res: Response) => {
    try {
        const project = await prisma.project.create({
            data: {
                title: '未命名项目',
                premise: '',
            }
        });
        res.status(201).json({ id: project.id, title: project.title });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// PUT /api/projects/:id/full - Full sync (upsert entire ProjectState)
// This is the main data sync endpoint used by the frontend.
// ============================================
router.put('/:id/full', async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const data = req.body;

    try {
        // Use a transaction to ensure atomicity
        await prisma.$transaction(async (tx: any) => {
            // 1. Upsert the project itself
            await tx.project.upsert({
                where: { id: id as string },
                create: {
                    id: id as string,
                    title: data.title || '未命名项目',
                    genre: data.genre || '',
                    premise: data.premise || '',
                    plotOutline: data.plotOutline || null,
                    currentWorldDate: data.currentWorldDate || '元年',
                    tone: data.creativeSettings?.tone || '平衡',
                    style: data.creativeSettings?.style || '',
                    creativity: Number(data.creativeSettings?.creativity ?? 0.7),
                    targetAudience: data.creativeSettings?.targetAudience || '',
                    promptProfile: data.creativeSettings?.promptProfile || 'WEB_NOVEL',
                    styleTags: data.creativeSettings?.styleTags ? JSON.stringify(data.creativeSettings.styleTags) : null,
                    referenceText: data.creativeSettings?.referenceText || null,
                    detailLevel: data.worldGenConfig?.detailLevel || 'Standard',
                    focus: data.worldGenConfig?.focus || 'Balanced',
                    activeBranchId: data.activeBranchId || null,
                    availableBranches: data.availableBranches ? JSON.stringify(data.availableBranches) : null,
                    customPrompts: JSON.stringify(data.customPrompts || {}),
                },
                update: {
                    title: data.title || '未命名项目',
                    genre: data.genre || '',
                    premise: data.premise || '',
                    plotOutline: data.plotOutline || null,
                    currentWorldDate: data.currentWorldDate || '元年',
                    tone: data.creativeSettings?.tone || '平衡',
                    style: data.creativeSettings?.style || '',
                    creativity: Number(data.creativeSettings?.creativity ?? 0.7),
                    targetAudience: data.creativeSettings?.targetAudience || '',
                    promptProfile: data.creativeSettings?.promptProfile || 'WEB_NOVEL',
                    styleTags: data.creativeSettings?.styleTags ? JSON.stringify(data.creativeSettings.styleTags) : null,
                    referenceText: data.creativeSettings?.referenceText || null,
                    detailLevel: data.worldGenConfig?.detailLevel || 'Standard',
                    focus: data.worldGenConfig?.focus || 'Balanced',
                    activeBranchId: data.activeBranchId || null,
                    availableBranches: data.availableBranches ? JSON.stringify(data.availableBranches) : null,
                    customPrompts: JSON.stringify(data.customPrompts || {}),
                },
            });

            // ============================================
            // 增量 UPSERT 策略：替代 Delete-Then-Insert
            // 防止并发数据丢失，提高更新效率
            // ============================================

            // 变更统计日志
            const changeStats = {
                characters: { created: 0, updated: 0, deleted: 0 },
                worldSettings: { created: 0, updated: 0, deleted: 0 },
                plotNodes: { created: 0, updated: 0, deleted: 0 },
                chapters: { created: 0, updated: 0, deleted: 0 },
                echoes: { created: 0, updated: 0, deleted: 0 },
                timelineEvents: { created: 0, updated: 0, deleted: 0 },
                drafts: { created: 0, updated: 0, deleted: 0 },
                plotVersions: { created: 0, updated: 0, deleted: 0 },
            };

            // -------------------- 1. Characters --------------------
            const existingCharacters = await tx.character.findMany({
                where: { projectId: id },
                select: { id: true }
            });
            const existingCharacterIds = new Set(existingCharacters.map((c: { id: string }) => c.id));
            const incomingCharacterIds = new Set((data.characters || []).map((c: any) => c.id));

            // 删除不再存在的角色
            const characterIdsToDelete = Array.from(existingCharacterIds).filter((cid) => !incomingCharacterIds.has(cid));
            if (characterIdsToDelete.length > 0) {
                await tx.character.deleteMany({
                    where: { id: { in: characterIdsToDelete } }
                });
                changeStats.characters.deleted = characterIdsToDelete.length;
            }

            // 创建或更新角色
            for (const char of (data.characters || [])) {
                const charData = {
                    id: char.id,
                    name: char.name,
                    role: char.role,
                    archetype: char.archetype || '',
                    description: char.description || '',
                    structuredRelations: char.structuredRelations
                        ? JSON.stringify(char.structuredRelations)
                        : null,
                    relationships: char.relationships || null,
                    imageUrl: char.imageUrl || null,
                    projectId: id,
                    alignment: char.alignment || null,
                    tags: char.tags ? JSON.stringify(char.tags) : null,
                    desire: char.desire || null,
                    fear: char.fear || null,
                    signature: char.signature || null,
                    contrast: char.contrast || null,
                    weakness: char.weakness || null,
                    arc: char.arc ? JSON.stringify(char.arc) : null,
                    originLocation: char.originLocation || null,
                    residence: char.residence || null,
                    controlledTerritories: char.controlledTerritories ? JSON.stringify(char.controlledTerritories) : null,
                    exiledFrom: char.exiledFrom ? JSON.stringify(char.exiledFrom) : null,
                    physicalStatus: char.physicalStatus || null,
                    foreshadowingHooks: char.foreshadowingHooks ? JSON.stringify(char.foreshadowingHooks) : null,
                    lastModified: char.lastModified ? BigInt(char.lastModified) : null,
                };

                if (existingCharacterIds.has(char.id)) {
                    await tx.character.update({
                        where: { id: char.id },
                        data: charData
                    });
                    changeStats.characters.updated++;
                } else {
                    await tx.character.create({ data: charData });
                    changeStats.characters.created++;
                }
            }

            // -------------------- 2. WorldSettings --------------------
            const existingWorldSettings = await tx.worldSetting.findMany({
                where: { projectId: id },
                select: { id: true }
            });
            const existingWorldSettingIds = new Set(existingWorldSettings.map((w: { id: string }) => w.id));
            const incomingWorldSettingIds = new Set((data.worldSettings || []).map((w: any) => w.id));

            const worldSettingIdsToDelete = Array.from(existingWorldSettingIds).filter(wid => !incomingWorldSettingIds.has(wid));
            if (worldSettingIdsToDelete.length > 0) {
                await tx.worldSetting.deleteMany({
                    where: { id: { in: worldSettingIdsToDelete } }
                });
                changeStats.worldSettings.deleted = worldSettingIdsToDelete.length;
            }

            for (const ws of (data.worldSettings || [])) {
                const wsData = {
                    id: ws.id,
                    category: ws.category,
                    title: ws.title,
                    content: ws.content,
                    projectId: id,
                    parentId: ws.parentId || null,
                    importance: ws.importance || null,
                    tags: ws.tags ? JSON.stringify(ws.tags) : null,
                };

                if (existingWorldSettingIds.has(ws.id)) {
                    await tx.worldSetting.update({
                        where: { id: ws.id },
                        data: wsData
                    });
                    changeStats.worldSettings.updated++;
                } else {
                    await tx.worldSetting.create({ data: wsData });
                    changeStats.worldSettings.created++;
                }
            }

            // -------------------- 3. PlotVersions --------------------
            const existingPlotVersions = await tx.plotVersion.findMany({
                where: { projectId: id },
                select: { id: true }
            });
            const existingPlotVersionIds = new Set(existingPlotVersions.map((p: { id: string }) => p.id));
            const incomingPlotVersionIds = new Set((data.plotHistory || []).map((p: any) => p.id));

            const plotVersionIdsToDelete = Array.from(existingPlotVersionIds).filter(pid => !incomingPlotVersionIds.has(pid));
            if (plotVersionIdsToDelete.length > 0) {
                await tx.plotVersion.deleteMany({
                    where: { id: { in: plotVersionIdsToDelete } }
                });
                changeStats.plotVersions.deleted = plotVersionIdsToDelete.length;
            }

            for (const pv of (data.plotHistory || [])) {
                const pvData = {
                    id: pv.id,
                    timestamp: BigInt(pv.timestamp),
                    content: pv.content,
                    note: pv.note,
                    projectId: id,
                };

                if (existingPlotVersionIds.has(pv.id)) {
                    await tx.plotVersion.update({
                        where: { id: pv.id },
                        data: pvData
                    });
                    changeStats.plotVersions.updated++;
                } else {
                    await tx.plotVersion.create({ data: pvData });
                    changeStats.plotVersions.created++;
                }
            }

            // -------------------- 4. Drafts --------------------
            const existingDrafts = await tx.draft.findMany({
                where: { projectId: id },
                select: { id: true }
            });
            const existingDraftIds = new Set(existingDrafts.map((d: { id: string }) => d.id));
            const incomingDraftIds = new Set((data.drafts || []).map((d: any) => d.id));

            const draftIdsToDelete = Array.from(existingDraftIds).filter(did => !incomingDraftIds.has(did));
            if (draftIdsToDelete.length > 0) {
                await tx.draft.deleteMany({
                    where: { id: { in: draftIdsToDelete } }
                });
                changeStats.drafts.deleted = draftIdsToDelete.length;
            }

            for (const draft of (data.drafts || [])) {
                const draftData = {
                    id: draft.id,
                    title: draft.title,
                    content: draft.content,
                    relatedPlotPoint: draft.relatedPlotPoint || null,
                    lastModified: BigInt(draft.lastModified),
                    branchId: draft.branchId || null,
                    projectId: id,
                };

                if (existingDraftIds.has(draft.id)) {
                    await tx.draft.update({
                        where: { id: draft.id },
                        data: draftData
                    });
                    changeStats.drafts.updated++;
                } else {
                    await tx.draft.create({ data: draftData });
                    changeStats.drafts.created++;
                }
            }

            // -------------------- 5. Chapters (特殊处理：保留内容) --------------------
            const existingChapters = await tx.chapter.findMany({
                where: { projectId: id },
                select: { id: true, content: true }
            });
            const existingChapterMap = new Map<string, { id: string; content: string }>(
                existingChapters.map((ch: { id: string; content: string }) => [ch.id, ch])
            );
            const incomingChapterIds = new Set((data.chapters || []).map((ch: any) => ch.id));

            const chapterIdsToDelete = Array.from(existingChapterMap.keys()).filter(chid => !incomingChapterIds.has(chid));
            if (chapterIdsToDelete.length > 0) {
                await tx.chapter.deleteMany({
                    where: { id: { in: chapterIdsToDelete } }
                });
                changeStats.chapters.deleted = chapterIdsToDelete.length;
            }

            for (const ch of (data.chapters || [])) {
                const existingChapter = existingChapterMap.get(ch.id);
                // If the incoming content is empty BUT the DB has content, skip content update
                const contentToSave = (ch.content === "" && existingChapter && existingChapter.content !== "")
                    ? existingChapter.content
                    : ch.content;

                const chapterData = {
                    id: ch.id,
                    title: ch.title,
                    content: contentToSave,
                    summary: ch.summary || null,
                    expectedPOV: ch.expectedPOV || null,
                    beats: ch.beats ? JSON.stringify(ch.beats) : null,
                    plotNodeId: ch.plotNodeId || null,
                    order: ch.order,
                    lastModified: BigInt(ch.lastModified),
                    projectId: id,
                    metadata: ch.metadata ? JSON.stringify(ch.metadata) : null,
                    targetWordCount: ch.targetWordCount || null,
                };

                if (existingChapterMap.has(ch.id)) {
                    await tx.chapter.update({
                        where: { id: ch.id },
                        data: {
                            title: chapterData.title,
                            content: chapterData.content,
                            summary: chapterData.summary,
                            expectedPOV: chapterData.expectedPOV,
                            beats: chapterData.beats,
                            plotNodeId: chapterData.plotNodeId,
                            order: chapterData.order,
                            lastModified: chapterData.lastModified,
                            metadata: chapterData.metadata,
                            targetWordCount: chapterData.targetWordCount,
                        }
                    });
                    changeStats.chapters.updated++;
                } else {
                    await tx.chapter.create({ data: chapterData });
                    changeStats.chapters.created++;
                }
            }

            // -------------------- 6. PlotNodes --------------------
            const existingPlotNodes = await tx.plotNode.findMany({
                where: { projectId: id },
                select: { id: true }
            });
            const existingPlotNodeIds = new Set(existingPlotNodes.map((pn: { id: string }) => pn.id));
            const incomingPlotNodeIds = new Set((data.plotNodes || []).map((pn: any) => pn.id));

            const plotNodeIdsToDelete = Array.from(existingPlotNodeIds).filter(pnid => !incomingPlotNodeIds.has(pnid));
            if (plotNodeIdsToDelete.length > 0) {
                await tx.plotNode.deleteMany({
                    where: { id: { in: plotNodeIdsToDelete } }
                });
                changeStats.plotNodes.deleted = plotNodeIdsToDelete.length;
            }

            for (const pn of (data.plotNodes || [])) {
                const pnData = {
                    id: pn.id,
                    title: pn.title,
                    content: pn.content,
                    order: pn.order,
                    beatTag: pn.beatTag || null,
                    relatedCharacters: JSON.stringify(pn.relatedCharacters || []),
                    relatedLocations: JSON.stringify(pn.relatedLocations || []),
                    projectId: id,
                    conflictScenario: pn.conflictScenario ? JSON.stringify(pn.conflictScenario) : null,
                    relatedChapters: pn.relatedChapters ? JSON.stringify(pn.relatedChapters) : null,
                };

                if (existingPlotNodeIds.has(pn.id)) {
                    await tx.plotNode.update({
                        where: { id: pn.id },
                        data: pnData
                    });
                    changeStats.plotNodes.updated++;
                } else {
                    await tx.plotNode.create({ data: pnData });
                    changeStats.plotNodes.created++;
                }
            }

            // -------------------- 7. Echoes --------------------
            const existingEchoes = await tx.echo.findMany({
                where: { projectId: id },
                select: { id: true }
            });
            const existingEchoIds = new Set(existingEchoes.map((e: { id: string }) => e.id));
            const incomingEchoIds = new Set((data.echoes || []).map((e: any) => e.id));

            const echoIdsToDelete = Array.from(existingEchoIds).filter(eid => !incomingEchoIds.has(eid));
            if (echoIdsToDelete.length > 0) {
                await tx.echo.deleteMany({
                    where: { id: { in: echoIdsToDelete } }
                });
                changeStats.echoes.deleted = echoIdsToDelete.length;
            }

            for (const echo of (data.echoes || [])) {
                const echoData = {
                    id: echo.id,
                    type: echo.type,
                    targetId: echo.targetId,
                    targetName: echo.targetName,
                    description: echo.description,
                    reason: echo.reason,
                    status: echo.status || 'PENDING',
                    triples: echo.triples ? JSON.stringify(echo.triples) : null,
                    timestamp: BigInt(echo.timestamp),
                    branchId: echo.branchId || null,
                    projectId: id,
                    confidence: echo.confidence || null,
                    extractionEvidence: echo.extractionEvidence || null,
                };

                if (existingEchoIds.has(echo.id)) {
                    await tx.echo.update({
                        where: { id: echo.id },
                        data: echoData
                    });
                    changeStats.echoes.updated++;
                } else {
                    await tx.echo.create({ data: echoData });
                    changeStats.echoes.created++;
                }
            }

            // -------------------- 8. TimelineEvents --------------------
            const existingTimelineEvents = await tx.timelineEvent.findMany({
                where: { projectId: id },
                select: { id: true }
            });
            const existingTimelineEventIds = new Set(existingTimelineEvents.map((t: { id: string }) => t.id));
            const incomingTimelineEventIds = new Set((data.timeline || []).map((t: any) => t.id));

            const timelineEventIdsToDelete = Array.from(existingTimelineEventIds).filter(tid => !incomingTimelineEventIds.has(tid));
            if (timelineEventIdsToDelete.length > 0) {
                await tx.timelineEvent.deleteMany({
                    where: { id: { in: timelineEventIdsToDelete } }
                });
                changeStats.timelineEvents.deleted = timelineEventIdsToDelete.length;
            }

            for (const te of (data.timeline || [])) {
                const teData = {
                    id: te.id,
                    timestamp: BigInt(te.timestamp),
                    worldDate: te.worldDate,
                    title: te.title,
                    description: te.description,
                    involvedEntities: JSON.stringify(te.involvedEntities || []),
                    type: te.type,
                    projectId: id,
                };

                if (existingTimelineEventIds.has(te.id)) {
                    await tx.timelineEvent.update({
                        where: { id: te.id },
                        data: teData
                    });
                    changeStats.timelineEvents.updated++;
                } else {
                    await tx.timelineEvent.create({ data: teData });
                    changeStats.timelineEvents.created++;
                }
            }

            // 记录变更统计日志
            console.log(`[UPSERT] Project ${id} sync completed:`, JSON.stringify(changeStats, null, 2));
        });

        // Fire-and-forget Neo4j sync (non-blocking)
        syncProjectToGraph(data).catch(err =>
            console.warn('Graph sync skipped:', err.message)
        );

        res.json({ success: true, id });
    } catch (err: any) {
        console.error('Full sync error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// PATCH /api/projects/:id - Incremental sync (partial update)
// Updates only the provided fields in the Project model.
// ============================================
router.patch('/:id', async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const data = req.body;

    try {
        const updateData: any = {};

        // Top-level fields
        if (data.title !== undefined) updateData.title = data.title;
        if (data.genre !== undefined) updateData.genre = data.genre;
        if (data.premise !== undefined) updateData.premise = data.premise;
        if (data.plotOutline !== undefined) updateData.plotOutline = data.plotOutline;
        if (data.currentWorldDate !== undefined) updateData.currentWorldDate = data.currentWorldDate;

        // Creative Settings (flattened in DB)
        if (data.creativeSettings) {
            if (data.creativeSettings.tone !== undefined) updateData.tone = data.creativeSettings.tone;
            if (data.creativeSettings.style !== undefined) updateData.style = data.creativeSettings.style;
            if (data.creativeSettings.creativity !== undefined) updateData.creativity = Number(data.creativeSettings.creativity);
            if (data.creativeSettings.targetAudience !== undefined) updateData.targetAudience = data.creativeSettings.targetAudience;
            if (data.creativeSettings.promptProfile !== undefined) updateData.promptProfile = data.creativeSettings.promptProfile;
            if (data.creativeSettings.styleTags !== undefined) updateData.styleTags = data.creativeSettings.styleTags ? JSON.stringify(data.creativeSettings.styleTags) : null;
            if (data.creativeSettings.referenceText !== undefined) updateData.referenceText = data.creativeSettings.referenceText || null;
        }

        // World Gen Config (flattened in DB)
        if (data.worldGenConfig) {
            if (data.worldGenConfig.detailLevel !== undefined) updateData.detailLevel = data.worldGenConfig.detailLevel;
            if (data.worldGenConfig.focus !== undefined) updateData.focus = data.worldGenConfig.focus;
        }

        // Sandbox Details
        if (data.activeBranchId !== undefined) updateData.activeBranchId = data.activeBranchId;
        if (data.availableBranches !== undefined) updateData.availableBranches = data.availableBranches ? JSON.stringify(data.availableBranches) : null;

        if (data.customPrompts !== undefined) {
            updateData.customPrompts = JSON.stringify(data.customPrompts);
        }

        const project = await prisma.project.update({
            where: { id },
            data: updateData
        });

        res.json({ success: true, id: project.id });
    } catch (err: any) {
        console.error('Patch sync error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// DELETE /api/projects/:id - Delete project
// ============================================
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        await prisma.project.delete({ where: { id: req.params.id as string } });
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// Echo批量操作API
// ============================================

// 批量操作历史记录（数据库持久化）
interface BatchOperationRecord {
    id: string;
    projectId: string;
    timestamp: number;
    operation: 'BATCH_ACCEPT' | 'BATCH_REJECT';
    echoIds: string[];
    previousStates: Record<string, string>; // echoId -> previous status
}

// 保存批量操作到数据库
const saveBatchOperation = async (projectId: string, operation: BatchOperationRecord) => {
    await prisma.batchOperation.create({
        data: {
            id: operation.id,
            projectId,
            operation: operation.operation,
            echoIds: JSON.stringify(operation.echoIds),
            previousStates: JSON.stringify(operation.previousStates),
            timestamp: BigInt(operation.timestamp),
            expiresAt: BigInt(Date.now() + 5 * 60 * 1000), // 5分钟过期
        }
    });
};

// 获取最近的批量操作
const getRecentBatchOperation = async (projectId: string, operationId?: string) => {
    const fiveMinutesAgo = BigInt(Date.now() - 5 * 60 * 1000);

    if (operationId) {
        return await prisma.batchOperation.findFirst({
            where: {
                id: operationId,
                projectId,
                timestamp: { gte: fiveMinutesAgo }
            }
        });
    }

    return await prisma.batchOperation.findFirst({
        where: {
            projectId,
            timestamp: { gte: fiveMinutesAgo }
        },
        orderBy: { timestamp: 'desc' }
    });
};

// 获取批量操作历史列表
const getBatchOperationHistory = async (projectId: string) => {
    const fiveMinutesAgo = BigInt(Date.now() - 5 * 60 * 1000);

    return await prisma.batchOperation.findMany({
        where: {
            projectId,
            timestamp: { gte: fiveMinutesAgo }
        },
        orderBy: { timestamp: 'desc' }
    });
};

// 删除批量操作记录
const deleteBatchOperation = async (operationId: string) => {
    await prisma.batchOperation.delete({
        where: { id: operationId }
    });
};

// 定期清理过期记录
const cleanupExpiredOperations = async () => {
    try {
        const result = await prisma.batchOperation.deleteMany({
            where: {
                expiresAt: { lt: BigInt(Date.now()) }
            }
        });
        if (result.count > 0) {
            console.log(`Cleaned up ${result.count} expired batch operations`);
        }
    } catch (err) {
        console.error('Failed to cleanup expired operations:', err);
    }
};

// 启动定期清理任务（每5分钟执行一次）
setInterval(cleanupExpiredOperations, 5 * 60 * 1000);

/**
 * POST /api/projects/:id/echoes/batch-accept
 * 批量接受选中的Echo
 */
router.post('/:id/echoes/batch-accept', async (req: Request, res: Response) => {
    const projectId = req.params.id as string;
    const { echoIds, syncToGraph = true } = req.body;

    if (!Array.isArray(echoIds) || echoIds.length === 0) {
        return res.status(400).json({ error: 'echoIds must be a non-empty array' });
    }

    try {
        // 1. 获取当前Echo状态（用于撤销）
        const existingEchoes = await prisma.echo.findMany({
            where: {
                id: { in: echoIds },
                projectId
            }
        });

        const previousStates: Record<string, string> = {};
        existingEchoes.forEach(e => previousStates[e.id] = e.status);

        // 2. 批量更新状态
        const updateResult = await prisma.echo.updateMany({
            where: {
                id: { in: echoIds },
                projectId
            },
            data: {
                status: 'ACCEPTED'
            }
        });

        // 3. 记录操作历史到数据库（用于撤销）
        const operationId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const operationRecord: BatchOperationRecord = {
            id: operationId,
            projectId,
            timestamp: Date.now(),
            operation: 'BATCH_ACCEPT',
            echoIds,
            previousStates
        };

        await saveBatchOperation(projectId, operationRecord);

        // 4. 触发图谱同步（如果启用）
        if (syncToGraph) {
            // 异步触发图谱同步，不阻塞响应
            import('../services/neo4jService').then(({ syncProjectToGraph }) => {
                // 获取更新后的完整项目数据
                prisma.project.findUnique({
                    where: { id: projectId },
                    include: { echoes: true }
                }).then(projectData => {
                    if (projectData) {
                        syncProjectToGraph({
                            ...projectData,
                            echoes: projectData.echoes.map(e => ({
                                ...e,
                                timestamp: Number(e.timestamp)
                            }))
                        }).catch(err => console.warn('Graph sync failed:', err));
                    }
                });
            }).catch(err => console.warn('Failed to import neo4jService:', err));
        }

        res.json({
            success: true,
            operationId,
            affectedCount: updateResult.count,
            message: `成功接受 ${updateResult.count} 条Echo`
        });
    } catch (err: any) {
        console.error('Batch accept error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/projects/:id/echoes/batch-reject
 * 批量拒绝选中的Echo
 */
router.post('/:id/echoes/batch-reject', async (req: Request, res: Response) => {
    const projectId = req.params.id as string;
    const { echoIds } = req.body;

    if (!Array.isArray(echoIds) || echoIds.length === 0) {
        return res.status(400).json({ error: 'echoIds must be a non-empty array' });
    }

    try {
        // 1. 获取当前Echo状态（用于撤销）
        const existingEchoes = await prisma.echo.findMany({
            where: {
                id: { in: echoIds },
                projectId
            }
        });

        const previousStates: Record<string, string> = {};
        existingEchoes.forEach(e => previousStates[e.id] = e.status);

        // 2. 批量更新状态
        const updateResult = await prisma.echo.updateMany({
            where: {
                id: { in: echoIds },
                projectId
            },
            data: {
                status: 'REJECTED'
            }
        });

        // 3. 记录操作历史到数据库（用于撤销）
        const operationId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const operationRecord: BatchOperationRecord = {
            id: operationId,
            projectId,
            timestamp: Date.now(),
            operation: 'BATCH_REJECT',
            echoIds,
            previousStates
        };

        await saveBatchOperation(projectId, operationRecord);

        res.json({
            success: true,
            operationId,
            affectedCount: updateResult.count,
            message: `成功拒绝 ${updateResult.count} 条Echo`
        });
    } catch (err: any) {
        console.error('Batch reject error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/projects/:id/echoes/undo-batch
 * 撤销最近的批量操作
 */
router.post('/:id/echoes/undo-batch', async (req: Request, res: Response) => {
    const projectId = req.params.id as string;
    const { operationId } = req.body; // 可选：指定要撤销的操作ID

    try {
        // 从数据库获取要撤销的操作
        const targetOperation = await getRecentBatchOperation(projectId, operationId);

        if (!targetOperation) {
            return res.status(404).json({ error: '未找到指定的批量操作或操作已过期' });
        }

        // 解析操作数据
        const echoIds: string[] = JSON.parse(targetOperation.echoIds);
        const previousStates: Record<string, string> = JSON.parse(targetOperation.previousStates);

        // 批量恢复之前的状态
        const updatePromises = echoIds.map(echoId => {
            const previousStatus = previousStates[echoId];
            if (previousStatus) {
                return prisma.echo.update({
                    where: { id: echoId },
                    data: { status: previousStatus }
                });
            }
            return Promise.resolve(null);
        });

        await Promise.all(updatePromises);

        // 从数据库中删除该操作记录
        await deleteBatchOperation(targetOperation.id);

        res.json({
            success: true,
            undoneCount: echoIds.length,
            message: `成功撤销批量操作，恢复了 ${echoIds.length} 条Echo`
        });
    } catch (err: any) {
        console.error('Undo batch error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/projects/:id/echoes/batch-history
 * 获取批量操作历史（用于前端显示撤销选项）
 */
router.get('/:id/echoes/batch-history', async (req: Request, res: Response) => {
    const projectId = req.params.id as string;

    try {
        // 从数据库获取批量操作历史
        const operations = await getBatchOperationHistory(projectId);

        // 格式化返回数据
        const undoableOperations = operations.map(op => ({
            id: op.id,
            operation: op.operation,
            echoCount: JSON.parse(op.echoIds).length,
            timestamp: Number(op.timestamp),
            canUndo: true
        }));

        res.json({
            operations: undoableOperations,
            total: undoableOperations.length
        });
    } catch (err: any) {
        console.error('Get batch history error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// GET /api/projects/:id/statistics - Get aggregated statistics for dashboard
// ============================================
router.get('/:id/statistics', async (req: Request, res: Response) => {
    const projectId = req.params.id as string;

    try {
        // 并行获取所有统计数据
        const [
            projectData,
            characterCount,
            worldSettingCount,
            chapterCount,
            plotNodeCount,
            echoCount,
            pendingEchoCount,
            timelineCount,
            chapters
        ] = await Promise.all([
            prisma.project.findUnique({
                where: { id: projectId },
                select: { updatedAt: true }
            }),
            prisma.character.count({ where: { projectId } }),
            prisma.worldSetting.count({ where: { projectId } }),
            prisma.chapter.count({ where: { projectId } }),
            prisma.plotNode.count({ where: { projectId } }),
            prisma.echo.count({ where: { projectId } }),
            prisma.echo.count({ where: { projectId, status: 'PENDING' } }),
            prisma.timelineEvent.count({ where: { projectId } }),
            // 获取所有章节内容以计算总字数
            prisma.chapter.findMany({
                where: { projectId },
                select: { content: true }
            })
        ]);

        if (!projectData) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // 获取关系数量（从角色的 structuredRelations 中计算）
        const characters = await prisma.character.findMany({
            where: { projectId },
            select: { structuredRelations: true }
        });

        let relationshipCount = 0;
        characters.forEach((char: any) => {
            if (char.structuredRelations) {
                try {
                    const relations = JSON.parse(char.structuredRelations);
                    if (Array.isArray(relations)) {
                        relationshipCount += relations.length;
                    }
                } catch {
                    // 忽略解析错误
                }
            }
        });

        // 计算总字数（章节内容长度）
        const totalWords = chapters.reduce((sum: number, ch: any) => sum + (ch.content?.length || 0), 0);

        const statistics = {
            totalWords,
            chapterCount,
            characterCount,
            worldSettingCount,
            plotNodeCount,
            echoCount,
            pendingEchoCount,
            relationshipCount,
            timelineCount,
            lastModified: projectData.updatedAt.getTime()
        };

        res.json(statistics);
    } catch (err: any) {
        console.error('Statistics error:', err);
        res.status(500).json({ error: err.message });
    }
});

export { router as projectsRouter };
