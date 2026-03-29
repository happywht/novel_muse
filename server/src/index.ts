import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { projectsRouter } from './routes/projects';
import { graphRouter } from './routes/graph';
import { inkosRouter } from './routes/inkos';
import { initNeo4j, closeNeo4j } from './services/neo4jService';
import {
  createAuthMiddleware,
  AuthConfig,
  getAuthConfig,
  generateApiKey,
  generateJwtToken,
} from './middleware/auth';

// Load .env
import * as dotenv from 'dotenv';
dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// ============================================
// Authentication Configuration
// ============================================

/**
 * Authentication configuration
 * Supports environment variables and runtime configuration
 *
 * Environment Variables:
 * - AUTH_ENABLED: 'true' | 'false' (default: 'true')
 * - AUTH_MODE: 'jwt' | 'api-key' | 'both' (default: 'api-key')
 * - JWT_SECRET: Secret key for JWT signing/verification
 * - JWT_ISSUER: Expected JWT issuer
 * - JWT_AUDIENCE: Expected JWT audience
 * - JWT_EXPIRES_IN: Token expiration time (default: '24h')
 * - API_KEYS: Comma-separated list of valid API keys
 * - API_KEY_HEADER: Custom header name for API key (default: 'x-api-key')
 */
const authConfig: AuthConfig = {
  enabled: process.env.AUTH_ENABLED !== 'false',
  mode: (process.env.AUTH_MODE as AuthConfig['mode']) || 'api-key',
  jwtSecret: process.env.JWT_SECRET,
  jwtIssuer: process.env.JWT_ISSUER,
  jwtAudience: process.env.JWT_AUDIENCE,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  apiKeys: (process.env.API_KEYS || '')
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean),
  apiKeyHeader: process.env.API_KEY_HEADER || 'x-api-key',
};

// Create authentication middleware with configuration
const authMiddleware = createAuthMiddleware(authConfig);

// Log authentication configuration on startup
console.log('🔒 Authentication Configuration:');
console.log(`   - Enabled: ${authConfig.enabled}`);
console.log(`   - Mode: ${authConfig.mode}`);
if (authConfig.mode === 'jwt' || authConfig.mode === 'both') {
  console.log(`   - JWT configured: ${!!authConfig.jwtSecret}`);
}
if (authConfig.mode === 'api-key' || authConfig.mode === 'both') {
  console.log(`   - API Keys configured: ${authConfig.apiKeys?.length || 0}`);
}

// ============================================
// Neo4j Initialization
// ============================================

let neo4jAvailable = false;

/**
 * Async initialization of Neo4j with retry mechanism
 */
const initializeNeo4j = async (retries = 3, delay = 3000): Promise<void> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await initNeo4j();
      neo4jAvailable = true;
      console.log('📊 Neo4j: ✅ Connected');
      return;
    } catch (err) {
      console.warn(
        `⚠️ Neo4j initialization failed (attempt ${attempt}/${retries}).`,
        err instanceof Error ? err.message : err
      );
      if (attempt < retries) {
        console.log(`⏳ Retrying in ${delay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.warn('⚠️ Neo4j initialization failed after all retries. Graph features disabled.');
      }
    }
  }
};

// ============================================
// Middleware Setup
// ============================================

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Authentication Middleware (applied before routes)
// Public routes like /api/health are excluded in the middleware
app.use('/api', authMiddleware);

// ============================================
// Routes
// ============================================

app.use('/api/projects', projectsRouter);
app.use('/api/inkos', inkosRouter);

// Health check (public route, no auth required)
app.get('/api/health', (_req, res) => {
  const config = getAuthConfig();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    neo4j: neo4jAvailable,
    auth: {
      enabled: config.enabled,
      mode: config.mode,
    },
  });
});

// Authentication utility endpoints (admin only - requires auth)
app.get('/api/auth/config', (_req, res) => {
  const config = getAuthConfig();
  // Only return safe configuration details
  res.json({
    enabled: config.enabled,
    mode: config.mode,
    jwtConfigured: !!config.jwtSecret,
    apiKeysCount: config.apiKeys?.length || 0,
    jwtIssuer: config.jwtIssuer,
    jwtAudience: config.jwtAudience,
    jwtExpiresIn: config.jwtExpiresIn,
  });
});

// Generate new API key (for admin use)
app.post('/api/auth/generate-key', (_req, res) => {
  const newKey = generateApiKey();
  res.json({
    message: 'New API key generated',
    apiKey: newKey,
    warning: 'Store this key securely. It will not be shown again.',
  });
});

// Generate JWT token (for admin use - in production, this should have additional validation)
app.post('/api/auth/generate-token', (req, res) => {
  const { userId, role, issuer, audience, expiresIn } = req.body;

  if (!userId || !role) {
    return res.status(400).json({
      error: 'Missing required fields: userId and role',
    });
  }

  const token = generateJwtToken(userId, role, { issuer, audience, expiresIn });

  if (!token) {
    return res.status(500).json({
      error: 'Failed to generate token. Check JWT_SECRET configuration.',
    });
  }

  res.json({
    message: 'JWT token generated',
    token,
    expiresIn: expiresIn || authConfig.jwtExpiresIn || '24h',
  });
});

// ============================================
// Error Handling
// ============================================

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ============================================
// Server Startup
// ============================================

app.listen(PORT, async () => {
  console.log(`🚀 Muse Backend Server running at http://localhost:${PORT}`);
  console.log(`📦 API Base: http://localhost:${PORT}/api`);

  // Start HTTP service first, then initialize Neo4j (with retry)
  await initializeNeo4j();

  // Register graph routes after Neo4j connection is successful
  if (neo4jAvailable) {
    app.use('/api/graph', graphRouter);
    console.log('📊 Neo4j: ✅ Graph routes registered');
  } else {
    console.log('📊 Neo4j: ❌ Graph features disabled');
  }

  // Print authentication setup hints
  if (authConfig.enabled) {
    if (authConfig.mode === 'api-key' && (!authConfig.apiKeys || authConfig.apiKeys.length === 0)) {
      console.log('');
      console.log('⚠️  SECURITY NOTICE: Authentication is enabled but no API keys are configured.');
      console.log('   Set API_KEYS environment variable or generate keys using:');
      console.log('   POST http://localhost:' + PORT + '/api/auth/generate-key');
    }
    if ((authConfig.mode === 'jwt' || authConfig.mode === 'both') && !authConfig.jwtSecret) {
      console.log('');
      console.log('⚠️  SECURITY NOTICE: JWT mode is enabled but JWT_SECRET is not configured.');
      console.log('   Set JWT_SECRET environment variable.');
    }
  }
});

// ============================================
// Graceful Shutdown
// ============================================

process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  await closeNeo4j();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  await prisma.$disconnect();
  await closeNeo4j();
  process.exit(0);
});

export { prisma };
