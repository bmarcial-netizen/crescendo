import dotenv from 'dotenv';
dotenv.config();

function required(key: string, ...aliases: string[]): string {
  const val = process.env[key];
  if (val) return val;
  for (const alias of aliases) {
    const v = process.env[alias];
    if (v) return v;
  }
  const names = [key, ...aliases].join(' or ');
  throw new Error(`Missing required env var: ${names}`);
}

function optional(key: string): string {
  return process.env[key] || '';
}

// ── Core (always required) ──────────────────────────────────────────────────

const nodeEnv = process.env.NODE_ENV || 'development';
const databaseUrl = required('DATABASE_URL');
const jwtSecret = required('JWT_SECRET', 'AUTH_SECRET');
const port = parseInt(process.env.PORT || '3000', 10);

// ── Stripe (required only when STRIPE_ENABLED=true) ─────────────────────────

const stripeEnabled = process.env.STRIPE_ENABLED === 'true';
let stripeSecretKey = optional('STRIPE_SECRET_KEY');
let stripeWebhookSecret = optional('STRIPE_WEBHOOK_SECRET');

if (stripeEnabled) {
  stripeSecretKey = required('STRIPE_SECRET_KEY');
  stripeWebhookSecret = required('STRIPE_WEBHOOK_SECRET');
}

// ── CORS ────────────────────────────────────────────────────────────────────

const appUrl = optional('APP_URL') || optional('APP_URL_PROD') || optional('APP_URL_DEV');
const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';
const corsOrigins: string[] = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  ...(appUrl ? [appUrl] : []),
  ...(vercelUrl ? [vercelUrl] : []),
].filter(Boolean);

// ── Trading defaults ─────────────────────────────────────────────────────────

const defaultStartingBalance = '1500.0000';

// ── Export ───────────────────────────────────────────────────────────────────

export const config = {
  defaultStartingBalance,
  nodeEnv,
  port,
  databaseUrl,
  jwtSecret,
  /** When true, all price math is fully deterministic (no noise). Currently always deterministic. */
  pricingDeterministic: (process.env.PRICING_DETERMINISTIC ?? 'true') !== 'false',
  stripe: {
    enabled: stripeEnabled,
    secretKey: stripeSecretKey,
    webhookSecret: stripeWebhookSecret,
  },
  spotify: {
    clientId: optional('SPOTIFY_CLIENT_ID'),
    clientSecret: optional('SPOTIFY_CLIENT_SECRET'),
    callbackUrl: optional('SPOTIFY_CALLBACK_URL') || `${appUrl || 'http://localhost:3000'}/api/auth/spotify/callback`,
  },
  google: {
    clientId: optional('GOOGLE_CLIENT_ID'),
  },
  corsOrigins,
  appUrl,
};
