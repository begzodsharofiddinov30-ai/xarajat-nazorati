import mongoose from 'mongoose';
import { LOAN_KINDS, LOAN_METHODS } from '../utils/loan.js';

// Kredit yoki muddatli to'lov. Jadval saqlanmaydi: har safar shu parametrlardan hisoblanadi (utils/loan.js).
// To'lovlar oddiy xarajat tranzaksiyalari ("Kredit to'lovi" kategoriyasi, loan maydoni bilan).
const loanSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    lender: { type: String, trim: true, maxlength: 50, default: '' },
    kind: { type: String, enum: LOAN_KINDS, default: 'credit' },
    principal: { type: Number, required: true, min: 1 },
    annualRate: { type: Number, required: true, min: 0, max: 200 },
    termMonths: { type: Number, required: true, min: 1, max: 360 },
    firstPaymentDate: { type: Date, required: true },
    method: { type: String, enum: LOAN_METHODS, default: 'annuity' },
    // Muddatidan oldin yopilgan bo'lsa (bank qolgan foizni qayta hisoblaydi) qo'lda belgilanadi.
    closed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

loanSchema.index({ user: 1, createdAt: 1 });

loanSchema.set('toJSON', {
  versionKey: false,
  transform(_doc, ret) {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.user;
    ret.firstPaymentDate = ret.firstPaymentDate.toISOString().slice(0, 10);
    return ret;
  },
});

export const Loan = mongoose.model('Loan', loanSchema);
