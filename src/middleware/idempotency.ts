import { Response, NextFunction } from 'express';
import { db } from '../db';
import { idempotencyKeys } from '../db/schema';
import { eq } from 'drizzle-orm';
import { AuthRequest } from '../types';

export function idempotencyMiddleware() {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const key = req.headers['idempotency-key'] as string | undefined;
    if (!key) {
      next();
      return;
    }

    const existing = await db
      .select()
      .from(idempotencyKeys)
      .where(eq(idempotencyKeys.key, key))
      .limit(1);

    if (existing.length > 0) {
      const cached = existing[0];
      res.status(cached.responseStatus).json(cached.responseBody);
      return;
    }

    // Store original json method to intercept response
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      // Cache the response asynchronously — don't block the response
      db.insert(idempotencyKeys)
        .values({
          key,
          responseStatus: res.statusCode,
          responseBody: body,
        })
        .catch((err) => console.error('Failed to cache idempotency key:', err));

      return originalJson(body);
    };

    next();
  };
}
