import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { projectsRouter } from './routes/projects';
import { graphRouter } from './routes/graph';
import { initNeo4j, closeNeo4j } from './services/neo4jService';
import { apiKeyAuth } from './middleware/auth';

// Load .env
import * as dotenv from 'dotenv';
dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Initialize Neo4j
let neo4jAvailable = false;

// 异步初始化 Neo4j 并创建索引
const initializeNeo4j = async () => {
    try {
        await initNeo4j();
        neo4jAvailable = true;
        console.log('📊 Neo4j: ✅ Connected');
    } catch (err) {
        console.warn('⚠️ Neo4j initialization failed. Graph features disabled.', err);
    }
};

// 启动 Neo4j 初始化（不阻塞服务器启动）
initializeNeo4j();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Authentication Middleware (applied before routes)
// Public routes like /api/health are excluded in the middleware
app.use('/api', apiKeyAuth);

// Routes
app.use('/api/projects', projectsRouter);
if (neo4jAvailable) {
    app.use('/api/graph', graphRouter);
}

// Health check (public route, no auth required)
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        neo4j: neo4jAvailable,
    });
});

// Error handling
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Server Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Muse Backend Server running at http://localhost:${PORT}`);
    console.log(`📦 API Base: http://localhost:${PORT}/api`);
    console.log(`📊 Neo4j: ${neo4jAvailable ? '✅ Connected' : '❌ Unavailable'}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    await closeNeo4j();
    process.exit(0);
});

export { prisma };
