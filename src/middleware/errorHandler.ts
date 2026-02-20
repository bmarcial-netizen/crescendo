import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

/** Patterns that indicate secret material in error messages */
const SECRET_PATTERNS = [
  /postgre(?:sql|s):\/\/[^\s]+/gi,  // connection strings
  /sk_(test|live)_[A-Za-z0-9]+/g,  // Stripe keys
  /whsec_[A-Za-z0-9]+/g,  // Stripe webhook secrets
  /Bearer\s+[A-Za-z0-9._-]+/gi,  // JWT tokens
  /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,  // raw JWTs
];

function sanitize(text: string): string {
  let result = text;
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // Log sanitized error — never expose connection strings, keys, or tokens
  const safeMessage = sanitize(err.message || 'Unknown error');
  const safeStack = err.stack ? sanitize(err.stack) : undefined;
  console.error('Unhandled error:', safeMessage);
  if (safeStack) console.error(safeStack);

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
