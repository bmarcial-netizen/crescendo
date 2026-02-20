import express from 'express';
import cors from 'cors';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';

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

// CORS
app.use(cors());

// Stripe webhook needs raw body — register BEFORE express.json()
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// JSON body parser for everything else
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/artists', artistRoutes);
app.use('/api/investor', investorRoutes);
app.use('/api/trade', tradeRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/royalties', royaltyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/metrics', metricsRoutes);
app.use('/api/stripe', stripeRoutes);

// Error handler (must be last)
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

export default app;
