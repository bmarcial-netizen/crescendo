import { Router, Request, Response } from 'express';
import { register, login, googleAuth, spotifyAuth } from '../services/auth.service';
import { requireAuth } from '../middleware/auth';
import { AuthRequest } from '../types';
import { config } from '../config';
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

// Spotify OAuth — Step 1: redirect user to Spotify's authorization page
router.get('/spotify', (_req: Request, res: Response) => {
  const { clientId, callbackUrl } = config.spotify;
  if (!clientId) {
    res.status(500).json({ error: { message: 'Spotify OAuth not configured' } });
    return;
  }

  const scopes = 'user-read-email user-read-private';
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: scopes,
    redirect_uri: callbackUrl,
    show_dialog: 'true',
  });

  res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
});

// Spotify OAuth — Step 2: handle callback, exchange code for JWT
router.get('/spotify/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string | undefined;
  const error = req.query.error as string | undefined;

  if (error) {
    res.redirect(`${config.appUrl || 'http://localhost:5173'}/?auth_error=${encodeURIComponent(error)}`);
    return;
  }

  if (!code) {
    res.status(400).json({ error: { message: 'Missing authorization code' } });
    return;
  }

  try {
    const result = await spotifyAuth(code);
    // Redirect to frontend with token in query params so the SPA can store it
    const frontendUrl = config.appUrl || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/?token=${result.token}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Spotify authentication failed';
    console.error('Spotify auth error:', message);
    const frontendUrl = config.appUrl || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/?auth_error=${encodeURIComponent('Spotify authentication failed. Please try again.')}`);
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
