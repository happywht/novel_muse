import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { PrismaClient } from '@prisma/client';
import { projectsRouter } from './routes/projects';
import { graphRouter } from './routes/graph';
import { templateOverridesRouter } from './routes/templateOverrides';
import { performanceRouter } from './routes/performance';
import { writingRouter } from './routes/writing';
import { initNeo4j, closeNeo4j } from './services/neo4jService';
import { apiKeyAuth } from './middleware/auth';
import { performanceMiddleware, errorTrackingMiddleware } from './middleware/performanceMiddleware';
import { getGlobalMonitor, getGlobalDatabaseMonitor, getGlobalSystemMonitor } from './services/performance';
import {
  errorHandler,
  notFoundHandler,
  setupGlobalErrorHandlers,
  asyncHandler
} from './middleware/errorHandler';

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

// Response Compression Middleware
// Compress all responses > 1KB (configurable threshold)
// Level: 6 (balanced between speed and compression ratio)
app.use(compression({
  threshold: 1024, // Only compress responses larger than 1KB
  level: 6, // Compression level (0-9, 6 is default)
  filter: (req, res) => {
    // Don't compress if client doesn't accept encoding
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Only compress successful responses
    return compression.filter(req, res);
  }
}));

app.use(express.json({ limit: '50mb' }));

// Performance Monitoring Middleware (applied before authentication)
// This monitors all requests including public routes
app.use(performanceMiddleware({
  excludePaths: ['/health', '/api/health'],
  enableHeaders: true,
  enableLogging: true
}));

// Authentication Middleware (applied before routes)
// Public routes like /api/health are excluded in the middleware
app.use('/api', apiKeyAuth);

// Routes
app.use('/api/projects', projectsRouter);
app.use('/api/projects', templateOverridesRouter);
console.log('📄 TemplateOverrides: ✅ Template override routes registered');

// Writing routes (AI continuation features)
app.use('/api', writingRouter);
console.log('✍️  Writing: ✅ AI writing routes registered');

// Performance monitoring routes (requires authentication)
app.use('/api/performance', performanceRouter);
console.log('📊 Performance: ✅ Performance monitoring routes registered');

// Graph routes (requires authentication, availability depends on Neo4j connection)
app.use('/api/graph', graphRouter);
console.log('📊 Graph: ✅ Graph routes registered (Neo4j-dependent)');

// API root endpoint (public route, no auth required)
app.get('/api', (_req, res) => {
    res.json({
        name: 'Muse Backend API',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        neo4j: neo4jAvailable ? 'connected' : 'disconnected',
        endpoints: {
            health: '/api/health',
            projects: '/api/projects',
            graph: '/api/graph/:projectId',
            performance: '/api/performance',
            writing: '/api/writing'
        },
        documentation: {
            baseUrl: SERVER_URL,
            apiBase: `${SERVER_URL}/api`
        }
    });
});

// Health check (public route, no auth required)
app.get('/api/health', (_req, res) => {
    const monitor = getGlobalMonitor();
    const systemMonitor = getGlobalSystemMonitor();

    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        neo4j: neo4jAvailable,
        performance: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            activeRequests: monitor.getActiveRequestCount()
        },
        system: {
            cpu: systemMonitor.getCurrentMetrics().cpuUsage,
            memory: systemMonitor.getCurrentMetrics().memoryUsage
        }
    });
});

// 404 处理（必须在所有路由之后）
app.use('/api', notFoundHandler);

// 错误处理中间件（必须在所有其他中间件之后）
app.use(errorTrackingMiddleware());
app.use(errorHandler);

// Start server
app.listen(PORT, async () => {
    console.log(`🚀 Muse Backend Server running at ${SERVER_URL}`);
    console.log(`📦 API Base: ${SERVER_URL}/api`);

    // 初始化全局错误处理器
    setupGlobalErrorHandlers();

    // 初始化性能监控系统
    console.log('📊 Performance: Initializing monitoring system...');
    const monitor = getGlobalMonitor();
    const dbMonitor = getGlobalDatabaseMonitor(prisma);
    const systemMonitor = getGlobalSystemMonitor();

    console.log('📊 Performance: ✅ Performance monitoring initialized');
    console.log(`   - API Monitoring: ${monitor.getConfig().enableAlerts ? 'Enabled' : 'Disabled'}`);
    console.log(`   - Database Monitoring: ${dbMonitor.getConfig().enableQueryLogging ? 'Enabled' : 'Disabled'}`);
    console.log(`   - System Monitoring: Enabled (sampling interval: ${systemMonitor.getConfig().samplingInterval}ms)`);

    // 先启动 HTTP 服务，再初始化 Neo4j（带重试）
    await initializeNeo4j();

    // Neo4j 连接状态已确定，graph 路由已预先注册
    if (neo4jAvailable) {
        console.log('📊 Neo4j: ✅ Connected and ready');
    } else {
        console.log('📊 Neo4j: ❌ Graph features temporarily unavailable');
    }
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('🛑 Shutting down gracefully...');

    // 销毁性能监控器
    const { destroyGlobalMonitor, destroyGlobalDatabaseMonitor, destroyGlobalSystemMonitor } = await import('./services/performance');
    destroyGlobalMonitor();
    destroyGlobalDatabaseMonitor();
    destroyGlobalSystemMonitor();
    console.log('📊 Performance: ✅ Monitoring system stopped');

    await prisma.$disconnect();
    await closeNeo4j();
    process.exit(0);
});

export { prisma };
