import { Router } from 'express';
import {
  createTransaction,
  deleteTransaction,
  listTransactions,
  updateTransaction,
} from '../controllers/transaction.controller.js';
import { validate } from '../middleware/validate.js';
import { transactionBodySchema, transactionListQuerySchema } from '../validators/transaction.schema.js';

const router = Router();

router.get('/', validate({ query: transactionListQuerySchema }), listTransactions);
router.post('/', validate({ body: transactionBodySchema }), createTransaction);
router.put('/:id', validate({ body: transactionBodySchema }), updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;
