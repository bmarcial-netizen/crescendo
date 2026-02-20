import { Router, Request, Response } from 'express';
import { register, login, googleAuth } from '../services/auth.service';
import { requireAuth } from '../middleware/auth';
import { AuthRequest } from '../types';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  const { email, password, role, displayName } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: { message: 'Email and password required' } });
    return;
  }

  const validRoles = ['investor', 'artist', 'admin'];
  if (role && !validRoles.includes(role)) {
    res.status(400).json({ error: { message: 'Invalid role' } });
    return;
  }

  const result = await register(email, password, role || 'investor', displayName);
  res.status(201).json(result);
});

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: { message: 'Email and password required' } });
    return;
  }

  const result = await login(email, password);
  res.json(result);
});

router.post('/google', async (req: Request, res: Response) => {
  const { credential } = req.body;

  if (!credential) {
    res.status(400).json({ error: { message: 'Google credential is required' } });
    return;
  }

  try {
    const result = await googleAuth(credential);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Google authentication failed';
    console.error('Google auth error:', message);
    res.status(401).json({ error: { message: 'Google authentication failed. Please try again.' } });
  }
});

router.get('/me', requireAuth(), async (req: AuthRequest, res: Response) => {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      displayName: users.displayName,
    })
    .from(users)
    .where(eq(users.id, req.user!.userId))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: { message: 'User not found' } });
    return;
  }

  res.json({ user });
});

export default router;
