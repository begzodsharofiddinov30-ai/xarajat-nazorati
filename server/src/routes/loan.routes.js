import { Router } from 'express';
import { addLoanPayment, createLoan, deleteLoan, getLoan, listLoans, updateLoan } from '../controllers/loan.controller.js';
import { validate } from '../middleware/validate.js';
import { loanBodySchema, loanPaymentSchema, loanQuerySchema } from '../validators/loan.schema.js';

const router = Router();

router.get('/', validate({ query: loanQuerySchema }), listLoans);
router.post('/', validate({ body: loanBodySchema }), createLoan);
router.get('/:id', validate({ query: loanQuerySchema }), getLoan);
router.put('/:id', validate({ body: loanBodySchema }), updateLoan);
router.delete('/:id', deleteLoan);
router.post('/:id/payments', validate({ body: loanPaymentSchema }), addLoanPayment);

export default router;
