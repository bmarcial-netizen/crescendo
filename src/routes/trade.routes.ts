import { Router, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { idempotencyMiddleware } from '../middleware/idempotency';
import { AuthRequest } from '../types';
import { executeBuy, executeSell } from '../services/trade.service';
import { db } from '../db';
import { orders } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

const router = Router();

router.use(requireAuth('investor'));

router.post('/buy', idempotencyMiddleware(), async (req: AuthRequest, res: Response) => {
  const { artistId, quantity } = req.body;

  if (!artistId || !quantity) {
    res.status(400).json({ error: { message: 'artistId and quantity required' } });
    return;
  }

  const order = await executeBuy(req.user!.userId, artistId, parseInt(quantity));
  res.status(201).json(order);
});

router.post('/sell', idempotencyMiddleware(), async (req: AuthRequest, res: Response) => {
  const { artistId, quantity } = req.body;

  if (!artistId || !quantity) {
    res.status(400).json({ error: { message: 'artistId and quantity required' } });
    return;
  }

  const order = await executeSell(req.user!.userId, artistId, parseInt(quantity));
  res.status(201).json(order);
});

router.get('/history', async (req: AuthRequest, res: Response) => {
  const userOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, req.user!.userId))
    .orderBy(desc(orders.createdAt));

  res.json({ orders: userOrders });
});

export default router;
