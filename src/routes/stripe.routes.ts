import { Router, Request, Response } from 'express';
import { handleWebhookEvent } from '../services/stripe.service';

const router = Router();

// Webhook endpoint — expects raw body (registered before express.json())
router.post('/webhook', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;
  if (!signature) {
    res.status(400).json({ error: { message: 'Missing stripe-signature header' } });
    return;
  }

  // req.body is a Buffer due to express.raw() registration for this path
  const result = await handleWebhookEvent(req.body as Buffer, signature);
  res.json(result);
});

export default router;
