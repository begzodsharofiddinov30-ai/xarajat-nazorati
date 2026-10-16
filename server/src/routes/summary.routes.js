import { Router } from 'express';
import { getSummary } from '../controllers/summary.controller.js';
import { validate } from '../middleware/validate.js';
import { monthQuerySchema } from '../validators/budget.schema.js';

const router = Router();

router.get('/', validate({ query: monthQuerySchema }), getSummary);

export default router;
