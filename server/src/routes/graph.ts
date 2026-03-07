import { Router, Request, Response } from 'express';
import {
    getProjectGraph, findPath, getNeighbors, syncProjectToGraph,
    createEdge, verifyLogicConflicts, getRelatedSubgraph,
    inferNarrativeInsights
} from '../services/neo4jService';

const router = Router();

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

// GET /api/graph/:projectId - Get full graph for a project
router.get('/:projectId', async (req: Request, res: Response) => {
    try {
        const graph = await getProjectGraph(req.params.projectId as string);
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

// GET /api/graph/:projectId/subgraph?anchors=A,B - Get relevant subgraph for context
router.get('/:projectId/subgraph', async (req: Request, res: Response) => {
    const { anchors } = req.query;
    if (!anchors) {
        res.status(400).json({ error: 'Missing anchors query parameter' });
        return;
    }
    const anchorList = (anchors as string).split(',');
    try {
        const subgraph = await getRelatedSubgraph(req.params.projectId as string, anchorList);
        res.json({ subgraph });
    } catch (err: any) {
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

// POST /api/graph/verify-logic - Audit triples against ground truth
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

export { router as graphRouter };
