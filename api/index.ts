/**
 * Vercel Serverless Function entry point.
 * Re-exports the Express app so Vercel's @vercel/node runtime
 * can handle /api/* requests as serverless invocations.
 */
import app from '../src/index.js';

export default app;
