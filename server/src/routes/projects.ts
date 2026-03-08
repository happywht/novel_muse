import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { syncProjectToGraph } from '../services/neo4jService';

const router = Router();
const prisma = new PrismaClient();

// Helper: Convert BigInt to Number for JSON serialization
const serializeBigInt = (obj: any): any => {
    return JSON.parse(JSON.stringify(obj, (_key, value) =>
        typeof value === 'bigint' ? Number(value) : value
    ));
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
                relationships: c.relationships || undefined,
                imageUrl: c.imageUrl || undefined,
            })),
            worldSettings: project.worldSettings.map((w: any) => ({
                id: w.id,
                category: w.category,
                title: w.title,
                content: w.content,
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
                beats: ch.beats ? JSON.parse(ch.beats) : [],
                plotNodeId: ch.plotNodeId || undefined,
                order: ch.order,
                lastModified: Number(ch.lastModified),
            })),
            plotNodes: project.plotNodes.map((pn: any) => ({
                id: pn.id,
                title: pn.title,
                content: pn.content,
                order: pn.order,
                beatTag: pn.beatTag || undefined,
                relatedCharacters: JSON.parse(pn.relatedCharacters || '[]'),
                relatedLocations: JSON.parse(pn.relatedLocations || '[]'),
            })),
            echoes: project.echoes.map((e: any) => ({
                id: e.id,
                type: e.type as 'CHARACTER' | 'WORLD',
                targetId: e.targetId,
                targetName: e.targetName,
                description: e.description,
                reason: e.reason,
                status: e.status as any,
                triples: e.triples ? JSON.parse(e.triples) : undefined,
                timestamp: Number(e.timestamp),
                branchId: e.branchId || undefined,
            })),
            timeline: project.timeline.map((t: any) => ({
                id: t.id,
                timestamp: Number(t.timestamp),
                worldDate: t.worldDate,
                title: t.title,
                description: t.description,
                involvedEntities: JSON.parse(t.involvedEntities || '[]'),
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
                    detailLevel: data.worldGenConfig?.detailLevel || 'Standard',
                    focus: data.worldGenConfig?.focus || 'Balanced',
                    activeBranchId: data.activeBranchId || null,
                    availableBranches: data.availableBranches ? JSON.stringify(data.availableBranches) : null,
                    customPrompts: JSON.stringify(data.customPrompts || {}),
                },
            });

            await tx.character.deleteMany({ where: { projectId: id } });
            await tx.worldSetting.deleteMany({ where: { projectId: id } });
            await tx.plotVersion.deleteMany({ where: { projectId: id } });
            await tx.draft.deleteMany({ where: { projectId: id } });
            await tx.plotNode.deleteMany({ where: { projectId: id } });
            await tx.echo.deleteMany({ where: { projectId: id } });
            await tx.timelineEvent.deleteMany({ where: { projectId: id } });

            // Surgical handle for chapters to prevent data loss
            const incomingChapterIds = (data.chapters || []).map((ch: any) => ch.id);
            await tx.chapter.deleteMany({
                where: {
                    projectId: id,
                    id: { notIn: incomingChapterIds }
                }
            });

            // 3. Bulk create child entities
            if (data.characters?.length > 0) {
                await tx.character.createMany({
                    data: data.characters.map((c: any) => ({
                        id: c.id,
                        name: c.name,
                        role: c.role,
                        archetype: c.archetype || '',
                        description: c.description || '',
                        relationships: c.relationships || null,
                        imageUrl: c.imageUrl || null,
                        projectId: id,
                    }))
                });
            }

            if (data.worldSettings?.length > 0) {
                await tx.worldSetting.createMany({
                    data: data.worldSettings.map((w: any) => ({
                        id: w.id,
                        category: w.category,
                        title: w.title,
                        content: w.content,
                        projectId: id,
                    }))
                });
            }

            if (data.plotHistory?.length > 0) {
                await tx.plotVersion.createMany({
                    data: data.plotHistory.map((p: any) => ({
                        id: p.id,
                        timestamp: BigInt(p.timestamp),
                        content: p.content,
                        note: p.note,
                        projectId: id,
                    }))
                });
            }

            if (data.drafts?.length > 0) {
                await tx.draft.createMany({
                    data: data.drafts.map((d: any) => ({
                        id: d.id,
                        title: d.title,
                        content: d.content,
                        relatedPlotPoint: d.relatedPlotPoint || null,
                        lastModified: BigInt(d.lastModified),
                        branchId: d.branchId || null,
                        projectId: id,
                    }))
                });
            }

            if (data.chapters?.length > 0) {
                // For chapters, we want to be surgical to avoid "lazy-load overwrite"
                for (const ch of data.chapters) {
                    const existing = await tx.chapter.findUnique({ where: { id: ch.id } });

                    // If the incoming content is empty BUT the DB has content, skip content update
                    const contentToSave = (ch.content === "" && existing && existing.content !== "")
                        ? existing.content
                        : ch.content;

                    await tx.chapter.upsert({
                        where: { id: ch.id },
                        create: {
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
                        },
                        update: {
                            title: ch.title,
                            content: contentToSave,
                            summary: ch.summary || null,
                            expectedPOV: ch.expectedPOV || null,
                            beats: ch.beats ? JSON.stringify(ch.beats) : null,
                            plotNodeId: ch.plotNodeId || null,
                            order: ch.order,
                            lastModified: BigInt(ch.lastModified),
                        }
                    });
                }
            }

            if (data.plotNodes?.length > 0) {
                await tx.plotNode.createMany({
                    data: data.plotNodes.map((pn: any) => ({
                        id: pn.id,
                        title: pn.title,
                        content: pn.content,
                        order: pn.order,
                        beatTag: pn.beatTag || null,
                        relatedCharacters: JSON.stringify(pn.relatedCharacters || []),
                        relatedLocations: JSON.stringify(pn.relatedLocations || []),
                        projectId: id,
                    }))
                });
            }

            if (data.echoes?.length > 0) {
                await tx.echo.createMany({
                    data: data.echoes.map((e: any) => ({
                        id: e.id,
                        type: e.type,
                        targetId: e.targetId,
                        targetName: e.targetName,
                        description: e.description,
                        reason: e.reason,
                        status: e.status || 'PENDING',
                        triples: e.triples ? JSON.stringify(e.triples) : null,
                        timestamp: BigInt(e.timestamp),
                        branchId: e.branchId || null,
                        projectId: id,
                    }))
                });
            }

            if (data.timeline?.length > 0) {
                await tx.timelineEvent.createMany({
                    data: data.timeline.map((t: any) => ({
                        id: t.id,
                        timestamp: BigInt(t.timestamp),
                        worldDate: t.worldDate,
                        title: t.title,
                        description: t.description,
                        involvedEntities: JSON.stringify(t.involvedEntities || []),
                        type: t.type,
                        projectId: id,
                    }))
                });
            }
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

        // Fire-and-forget Neo4j sync if metadata changed
        // We only sync if there's enough data to build a project context
        if (updateData.title || updateData.premise) {
            syncProjectToGraph({ ...project, ...data }).catch(err =>
                console.warn('Graph sync skipped (PATCH):', err.message)
            );
        }

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

export { router as projectsRouter };
