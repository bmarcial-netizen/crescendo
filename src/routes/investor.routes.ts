import { Router, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { AuthRequest } from '../types';
import { getBalance, deposit, withdraw } from '../services/wallet.service';
import { db } from '../db';
import { investorPositions, artists, orders, ledgerAccounts, ledgerEntries } from '../db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { config } from '../config';

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

router.get('/portfolio-history', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const walletName = `user:${userId}:wallet`;

  // Find the user's wallet account
  const [wallet] = await db
    .select()
    .from(ledgerAccounts)
    .where(eq(ledgerAccounts.name, walletName))
    .limit(1);

  if (!wallet) {
    // No wallet yet — return starting balance as single point
    res.json({ history: [{ t: new Date().toISOString(), v: parseFloat(config.defaultStartingBalance) }] });
    return;
  }

  // Get all ledger entries for this wallet, ordered chronologically
  const entries = await db
    .select({
      entryType: ledgerEntries.entryType,
      amount: ledgerEntries.amount,
      txnType: ledgerEntries.txnType,
      createdAt: ledgerEntries.createdAt,
    })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.accountId, wallet.id))
    .orderBy(asc(ledgerEntries.createdAt));

  // Reconstruct running balance over time
  // Wallet is a LIABILITY account: credit = +balance, debit = -balance
  const startingBal = parseFloat(config.defaultStartingBalance);
  const history: { t: string; v: number }[] = [];

  if (entries.length === 0) {
    // No ledger entries yet — just show starting balance
    res.json({ history: [{ t: new Date().toISOString(), v: startingBal }] });
    return;
  }

  // Add the starting point (before first entry)
  let runningBalance = startingBal;
  const firstEntry = entries[0];
  history.push({ t: new Date(firstEntry.createdAt.getTime() - 1000).toISOString(), v: runningBalance });

  for (const entry of entries) {
    const amount = parseFloat(entry.amount);
    if (entry.entryType === 'credit') {
      runningBalance += amount;
    } else {
      runningBalance -= amount;
    }
    history.push({ t: entry.createdAt.toISOString(), v: Math.max(0, runningBalance) });
  }

  // Append current total value (cash + holdings market value)
  const positions = await db
    .select({
      sharesHeld: investorPositions.sharesHeld,
      currentBid: artists.currentBid,
    })
    .from(investorPositions)
    .innerJoin(artists, eq(investorPositions.artistId, artists.id))
    .where(eq(investorPositions.userId, userId));

  const holdingsValue = positions.reduce(
    (sum, p) => sum + p.sharesHeld * parseFloat(p.currentBid),
    0
  );

  const currentCash = parseFloat(wallet.balance);
  const totalNow = currentCash + holdingsValue;
  history.push({ t: new Date().toISOString(), v: totalNow });

  res.json({ history });
});

export default router;
