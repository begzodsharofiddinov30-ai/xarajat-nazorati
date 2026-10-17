import { Router } from 'express';
import {
  addContribution,
  createGoal,
  deleteContribution,
  deleteGoal,
  listGoals,
  updateGoal,
} from '../controllers/goal.controller.js';
import { validate } from '../middleware/validate.js';
import { contributionSchema, goalBodySchema, goalListQuerySchema } from '../validators/goal.schema.js';

const router = Router();

router.get('/', validate({ query: goalListQuerySchema }), listGoals);
router.post('/', validate({ body: goalBodySchema }), createGoal);
router.put('/:id', validate({ body: goalBodySchema }), updateGoal);
router.delete('/:id', deleteGoal);
router.post('/:id/contributions', validate({ body: contributionSchema }), addContribution);
router.delete('/:id/contributions/:cid', deleteContribution);

export default router;
