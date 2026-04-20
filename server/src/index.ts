import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { projectsRouter } from './routes/projects';
import { graphRouter } from './routes/graph';
import { templateOverridesRouter } from './routes/templateOverrides';
import { initNeo4j, closeNeo4j } from './services/neo4jService';
import { apiKeyAuth } from './middleware/auth';

// Load .env
import * as dotenv from 'dotenv';
dotenv.config();

const app = express();
const prisma = new PrismaClient();
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3001}`;
const PORT = process.env.PORT || 3001;

// Initialize Neo4j
let neo4jAvailable = false;

// 异步初始化 Neo4j 并创建索引（带重试机制）
const initializeNeo4j = async (retries = 3, delay = 3000): Promise<void> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await initNeo4j();
            neo4jAvailable = true;
            console.log('📊 Neo4j: ✅ Connected');
            return;
        } catch (err) {
            console.warn(`⚠️ Neo4j initialization failed (attempt ${attempt}/${retries}).`, err instanceof Error ? err.message : err);
            if (attempt < retries) {
                console.log(`⏳ Retrying in ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.warn('⚠️ Neo4j initialization failed after all retries. Graph features disabled.');
            }
        }
    }
};

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Authentication Middleware (applied before routes)
// Public routes like /api/health are excluded in the middleware
app.use('/api', apiKeyAuth);

// Routes
app.use('/api/projects', projectsRouter);
app.use('/api/projects', templateOverridesRouter);
console.log('📄 TemplateOverrides: ✅ Template override routes registered');

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
app.listen(PORT, async () => {
    console.log(`🚀 Muse Backend Server running at ${SERVER_URL}`);
    console.log(`📦 API Base: ${SERVER_URL}/api`);

    // 先启动 HTTP 服务，再初始化 Neo4j（带重试）
    await initializeNeo4j();

    // Neo4j 连接成功后动态注册 graph 路由
    if (neo4jAvailable) {
        app.use('/api/graph', graphRouter);
        console.log('📊 Neo4j: ✅ Graph routes registered');
    } else {
        console.log('📊 Neo4j: ❌ Graph features disabled');
    }
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    await closeNeo4j();
    process.exit(0);
});

export { prisma };
