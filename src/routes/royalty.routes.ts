import { Router, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { AuthRequest } from '../types';
import { uploadRoyaltyStatement, distributeRoyalties } from '../services/royalty.service';
import { db } from '../db';
import { royaltyStatements, dividendDistributions, dividendPayments } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.use(requireAuth('admin'));

router.post('/upload', upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: { message: 'CSV file required' } });
    return;
  }

  const statements = await uploadRoyaltyStatement(req.file.buffer, req.user!.userId);
  res.status(201).json({ statements });
});

router.post('/:statementId/distribute', async (req: AuthRequest, res: Response) => {
  const result = await distributeRoyalties(req.params.statementId as string);
  res.status(201).json(result);
});

router.get('/', async (_req: AuthRequest, res: Response) => {
  const statements = await db
    .select()
    .from(royaltyStatements)
    .orderBy(desc(royaltyStatements.createdAt));
  res.json({ statements });
});

router.get('/:statementId/distributions', async (req: AuthRequest, res: Response) => {
  const distributions = await db
    .select()
    .from(dividendDistributions)
    .where(eq(dividendDistributions.royaltyStatementId, req.params.statementId as string));

  res.json({ distributions });
});

router.get('/distributions/:distributionId/payments', async (req: AuthRequest, res: Response) => {
  const payments = await db
    .select()
    .from(dividendPayments)
    .where(eq(dividendPayments.distributionId, req.params.distributionId as string));

  res.json({ payments });
});

export default router;
