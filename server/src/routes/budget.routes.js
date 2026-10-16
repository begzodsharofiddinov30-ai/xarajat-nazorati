import { Router } from 'express';
import { deleteBudget, listBudgets, upsertBudget } from '../controllers/budget.controller.js';
import { validate } from '../middleware/validate.js';
import {
  budgetCategoryParamSchema,
  budgetUpsertSchema,
  monthQuerySchema,
} from '../validators/budget.schema.js';

const router = Router();

router.get('/', validate({ query: monthQuerySchema }), listBudgets);
router.put('/', validate({ body: budgetUpsertSchema }), upsertBudget);
router.delete('/:category', validate({ params: budgetCategoryParamSchema }), deleteBudget);

export default router;
