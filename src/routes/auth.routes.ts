import { Router, Request, Response } from 'express';
import { register, login } from '../services/auth.service';

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

export default router;
