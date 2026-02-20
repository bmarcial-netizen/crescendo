import { Router, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { AuthRequest } from '../types';
import multer from 'multer';
import {
  chartmetricSnapshotSchema,
  insertMetricSnapshot,
  getLatestSnapshot,
  parseAndInsertMetricsCsv,
} from '../services/metrics.service';
import { BadRequestError } from '../utils/errors';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});
const router = Router();

router.use(requireAuth('admin'));

// POST /api/admin/metrics/chartmetric-snapshot — JSON body
router.post('/chartmetric-snapshot', async (req: AuthRequest, res: Response) => {
  const parsed = chartmetricSnapshotSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid snapshot data',
        details: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
    });
    return;
  }

  const result = await insertMetricSnapshot(parsed.data);
  res.status(201).json(result);
});

// GET /api/admin/metrics/artist/:id/latest
router.get('/artist/:id/latest', async (req: AuthRequest, res: Response) => {
  const snapshot = await getLatestSnapshot(req.params.id as string);
  res.json(snapshot);
});

// POST /api/admin/metrics/chartmetric-upload — multipart CSV
router.post('/chartmetric-upload', upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    throw new BadRequestError('CSV file required (field name: "file")');
  }

  const result = await parseAndInsertMetricsCsv(req.file.buffer);
  res.status(201).json(result);
});

export default router;
