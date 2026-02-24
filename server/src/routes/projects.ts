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

        const result = projects.map(p => ({
            id: p.id,
            title: p.title,
            genre: p.genre,
            lastModified: p.updatedAt.getTime(),
            characterCount: p._count.characters,
            worldSettingCount: p._count.worldSettings,
            chapterCount: p._count.chapters,
        }));

        res.json(result);
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
                chapters: { orderBy: { order: 'asc' } },
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
            creativeSettings: {
                tone: project.tone,
                style: project.style,
                creativity: project.creativity,
                targetAudience: project.targetAudience,
            },
            worldGenConfig: {
                detailLevel: project.detailLevel,
                focus: project.focus,
            },
            characters: project.characters.map(c => ({
                id: c.id,
                name: c.name,
                role: c.role,
                archetype: c.archetype,
                description: c.description,
                relationships: c.relationships || undefined,
                imageUrl: c.imageUrl || undefined,
            })),
            worldSettings: project.worldSettings.map(w => ({
                id: w.id,
                category: w.category,
                title: w.title,
                content: w.content,
            })),
            plotHistory: project.plotVersions.map(p => ({
                id: p.id,
                timestamp: Number(p.timestamp),
                content: p.content,
                note: p.note,
            })),
            drafts: project.drafts.map(d => ({
                id: d.id,
                title: d.title,
                content: d.content,
                relatedPlotPoint: d.relatedPlotPoint || undefined,
                lastModified: Number(d.lastModified),
            })),
            chapters: project.chapters.map((ch: any) => ({
                id: ch.id,
                title: ch.title,
                content: ch.content,
                order: ch.order,
                lastModified: Number(ch.lastModified),
            })),
            echoes: project.echoes.map((e: any) => ({
                id: e.id,
                type: e.type as 'CHARACTER' | 'WORLD',
                targetId: e.targetId,
                targetName: e.targetName,
                description: e.description,
                reason: e.reason,
                status: e.status as any,
                timestamp: Number(e.timestamp),
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
        await prisma.$transaction(async (tx) => {
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
                    detailLevel: data.worldGenConfig?.detailLevel || 'Standard',
                    focus: data.worldGenConfig?.focus || 'Balanced',
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
                    detailLevel: data.worldGenConfig?.detailLevel || 'Standard',
                    focus: data.worldGenConfig?.focus || 'Balanced',
                },
            });

            // 2. Replace all child entities (delete + create for simplicity)
            await tx.character.deleteMany({ where: { projectId: id } });
            await tx.worldSetting.deleteMany({ where: { projectId: id } });
            await tx.plotVersion.deleteMany({ where: { projectId: id } });
            await tx.draft.deleteMany({ where: { projectId: id } });
            await tx.chapter.deleteMany({ where: { projectId: id } });
            await tx.echo.deleteMany({ where: { projectId: id } });
            await tx.timelineEvent.deleteMany({ where: { projectId: id } });

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
                        projectId: id,
                    }))
                });
            }

            if (data.chapters?.length > 0) {
                await tx.chapter.createMany({
                    data: data.chapters.map((ch: any) => ({
                        id: ch.id,
                        title: ch.title,
                        content: ch.content,
                        order: ch.order,
                        lastModified: BigInt(ch.lastModified),
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
                        timestamp: BigInt(e.timestamp),
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
