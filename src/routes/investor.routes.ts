import { Router, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { AuthRequest } from '../types';
import { getBalance, deposit, withdraw } from '../services/wallet.service';
import { db } from '../db';
import { investorPositions, artists, orders } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

router.use(requireAuth('investor'));

router.get('/balance', async (req: AuthRequest, res: Response) => {
  const result = await getBalance(req.user!.userId);
  res.json(result);
});

router.post('/deposit', async (req: AuthRequest, res: Response) => {
  const { amount } = req.body;
  if (!amount) {
    res.status(400).json({ error: { message: 'Amount required' } });
    return;
  }
  const result = await deposit(req.user!.userId, amount.toString());
  res.json(result);
});

router.post('/withdraw', async (req: AuthRequest, res: Response) => {
  const { amount } = req.body;
  if (!amount) {
    res.status(400).json({ error: { message: 'Amount required' } });
    return;
  }
  const result = await withdraw(req.user!.userId, amount.toString());
  res.json(result);
});

router.get('/portfolio', async (req: AuthRequest, res: Response) => {
  const positions = await db
    .select({
      artistId: investorPositions.artistId,
      sharesHeld: investorPositions.sharesHeld,
      avgCostBasis: investorPositions.avgCostBasis,
      stageName: artists.stageName,
      currentPrice: artists.currentPrice,
      currentBid: artists.currentBid,
      currentAsk: artists.currentAsk,
    })
    .from(investorPositions)
    .innerJoin(artists, eq(investorPositions.artistId, artists.id))
    .where(eq(investorPositions.userId, req.user!.userId));

  const portfolio = positions.map((p) => ({
    ...p,
    marketValue: (p.sharesHeld * parseFloat(p.currentBid)).toFixed(4),
    totalCost: (p.sharesHeld * parseFloat(p.avgCostBasis)).toFixed(4),
    unrealizedPnL: (p.sharesHeld * (parseFloat(p.currentBid) - parseFloat(p.avgCostBasis))).toFixed(4),
  }));

  res.json({ positions: portfolio });
});

router.get('/orders', async (req: AuthRequest, res: Response) => {
  const userOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, req.user!.userId));
  res.json({ orders: userOrders });
});

export default router;
