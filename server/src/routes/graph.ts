import { Router, Request, Response } from 'express';
import {
    getProjectGraph, findPath, getNeighbors, syncProjectToGraph,
    createEdge, verifyLogicConflicts, getRelatedSubgraph,
    inferNarrativeInsights, getPhysicalStatus, getUnresolvedForeshadowing,
    mergeBranch, getFactionGroups, simulateStatePropagation,
    getCharacterConflicts, getHighIntensityConflicts
} from '../services/neo4jService';

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

export { router as graphRouter };
