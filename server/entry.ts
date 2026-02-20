/**
 * Vercel Serverless Function entry point.
 * Wraps the Express app import in error handling so we can
 * diagnose cold-start crashes instead of getting opaque 500s.
 */
import type { IncomingMessage, ServerResponse } from 'http';

let app: any = null;
let initError: { message: string; stack?: string } | null = null;

async function loadApp() {
  if (app) return app;
  if (initError) throw initError;
  try {
    const mod = await import('../src/index.js');
    app = mod.default;
    return app;
  } catch (err: any) {
    initError = { message: err.message, stack: err.stack };
    throw err;
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const expressApp = await loadApp();
    return expressApp(req, res);
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'FUNCTION_INIT_FAILED',
      message: err.message || String(err),
      hint: 'Check Vercel environment variables: DATABASE_URL, AUTH_SECRET, GOOGLE_CLIENT_ID',
    }));
  }
}
