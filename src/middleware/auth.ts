import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthRequest, AuthPayload } from '../types';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

export function requireAuth(role?: 'investor' | 'artist' | 'admin') {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }

    const token = header.slice(7);
    try {
      const payload = jwt.verify(token, config.jwtSecret) as AuthPayload;
      req.user = payload;

      if (role && payload.role !== role && payload.role !== 'admin') {
        throw new ForbiddenError(`Requires role: ${role}`);
      }

      next();
    } catch (err) {
      if (err instanceof ForbiddenError) throw err;
      throw new UnauthorizedError('Invalid or expired token');
    }
  };
}
