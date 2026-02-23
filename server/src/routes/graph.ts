import { Router, Request, Response } from 'express';
import { getProjectGraph, findPath, getNeighbors, syncProjectToGraph } from '../services/neo4jService';

const router = Router();

// GET /api/graph/:projectId - Get full graph for a project
router.get('/:projectId', async (req: Request, res: Response) => {
    try {
        const graph = await getProjectGraph(req.params.projectId);
        res.json(graph);
    } catch (err: any) {
        console.error('Graph fetch error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/graph/:projectId/neighbors/:nodeId - Get node neighbors
router.get('/:projectId/neighbors/:nodeId', async (req: Request, res: Response) => {
    try {
        const result = await getNeighbors(req.params.projectId, req.params.nodeId);
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
        const path = await findPath(req.params.projectId, from as string, to as string);
        res.json(path);
    } catch (err: any) {
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
