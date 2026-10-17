import { Router } from 'express';
import { getSummary, getTrend } from '../controllers/summary.controller.js';
import { validate } from '../middleware/validate.js';
import { monthQuerySchema, trendQuerySchema } from '../validators/budget.schema.js';

const router = Router();

router.get('/', validate({ query: monthQuerySchema }), getSummary);
router.get('/trend', validate({ query: trendQuerySchema }), getTrend);

export default router;
