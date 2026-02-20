/**
 * Vercel Serverless Function entry point.
 *
 * Imports the Express app from a pre-bundled file (created by
 * scripts/bundle-api.mjs during `buildCommand`). The bundle
 * has all relative TS imports resolved, avoiding the ESM
 * extensionless-import problem in Node.js.
 */
import type { IncomingMessage, ServerResponse } from 'http';

let app: any = null;
let initError: { message: string; stack?: string } | null = null;

async function loadApp() {
  if (app) return app;
  if (initError) throw initError;
  try {
    // NOTE: ../_api-bundle.js is generated at build time by esbuild
    const mod = await import('../_api-bundle.js');
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
