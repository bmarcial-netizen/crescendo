import rateLimit from 'express-rate-limit';

/**
 * Auth endpoints: strict limit.
 * 20 requests per 15-minute window per IP.
 * Prevents brute-force login/registration.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many auth requests, try again later',
    },
  },
});

/**
 * Trade endpoints: moderate limit.
 * 60 requests per 1-minute window per IP.
 * Prevents runaway bot loops while allowing rapid demo usage.
 */
export const tradeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many trade requests, try again later',
    },
  },
});

/**
 * General API: relaxed limit.
 * 200 requests per 1-minute window per IP.
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests, try again later',
    },
  },
});
