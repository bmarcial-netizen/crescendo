import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { errorHandler } from './middleware/errorHandler';
import { authLimiter, tradeLimiter, generalLimiter } from './middleware/rateLimit';
import { db } from './db';
import { sql } from 'drizzle-orm';

// Route imports
import authRoutes from './routes/auth.routes';
import artistRoutes from './routes/artist.routes';
import investorRoutes from './routes/investor.routes';
import tradeRoutes from './routes/trade.routes';
import marketRoutes from './routes/market.routes';
import royaltyRoutes from './routes/royalty.routes';
import adminRoutes from './routes/admin.routes';
import metricsRoutes from './routes/metrics.routes';
import stripeRoutes from './routes/stripe.routes';

const app = express();

// CORS — allow configured origins, reject others
app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (curl, mobile apps, server-to-server)
      if (!origin) return callback(null, true);
      if (config.corsOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
    exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  }),
);

// Stripe webhook needs raw body — register BEFORE express.json()
app.use('/api/stripe/webhook', express.raw({ type: 'application/json', limit: '1mb' }));

// JSON body parser with size limit
app.use(express.json({ limit: '1mb' }));

// General rate limit on all API routes
app.use('/api', generalLimiter);

// Health check with DB connectivity
app.get('/health', async (_req, res) => {
  let dbConnected = false;
  let dbLatencyMs: number | null = null;
  let dbVersion: string | null = null;

  try {
    const start = Date.now();
    const rows = await db.execute(sql`SELECT version()`);
    dbLatencyMs = Date.now() - start;
    dbConnected = true;
    dbVersion = (rows as { version: string }[])[0]?.version ?? null;
  } catch {
    // DB unreachable
  }

  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    database: { connected: dbConnected, latencyMs: dbLatencyMs, version: dbVersion },
  });
});

// OpenAPI spec
app.get('/api/docs', (_req, res) => {
  res.sendFile('openapi.json', { root: '.' });
});

// Routes with targeted rate limiting
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/artists', artistRoutes);
app.use('/api/investor', investorRoutes);
app.use('/api/trade', tradeLimiter, tradeRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/royalties', royaltyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/metrics', metricsRoutes);
app.use('/api/stripe', stripeRoutes);

// Error handler (must be last — but before static files)
app.use(errorHandler);

// Serve frontend from client/dist (built React app)
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

// SPA fallback: any non-API route serves index.html
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

export default app;
