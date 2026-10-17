import { Router } from 'express';
import {
  createRecurring,
  deleteRecurring,
  listRecurring,
  updateRecurring,
} from '../controllers/recurring.controller.js';
import { validate } from '../middleware/validate.js';
import { recurringBodySchema } from '../validators/recurring.schema.js';

const router = Router();

router.get('/', listRecurring);
router.post('/', validate({ body: recurringBodySchema }), createRecurring);
router.put('/:id', validate({ body: recurringBodySchema }), updateRecurring);
router.delete('/:id', deleteRecurring);

export default router;
