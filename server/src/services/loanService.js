import mongoose from 'mongoose';
import { Loan } from '../models/Loan.js';
import { Transaction } from '../models/Transaction.js';
import { ApiError } from '../utils/ApiError.js';
import { buildSchedule, summarizeLoan } from '../utils/loan.js';

export const LOAN_CATEGORY = 'loan';

// Tranzaksiya yoki takroriy qoidaga kredit bog'lansa: kredit shu foydalanuvchiniki, kategoriya "Kredit to'lovi".
export async function assertLoan(userId, loanId, category) {
  if (!loanId) return;
  const fail = (message) => {
    throw ApiError.badRequest("Ma'lumotlar noto'g'ri", 'VALIDATION_ERROR', [{ path: 'loan', message }]);
  };
  if (category !== LOAN_CATEGORY) fail('Kredit faqat "Kredit to\'lovi" kategoriyasidagi xarajatga bog\'lanadi');
  if (!mongoose.isValidObjectId(loanId) || !(await Loan.exists({ _id: loanId, user: userId }))) fail('Kredit topilmadi');
}

// Har bir kredit bo'yicha to'langan summa: Map<loanId, sum>
export async function paidByLoan(userId, loanIds) {
  if (!loanIds.length) return new Map();
  const rows = await Transaction.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId), type: 'expense', loan: { $in: loanIds } } },
    { $group: { _id: '$loan', paid: { $sum: '$amount' } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.paid]));
}

export function loanParams(loan) {
  return {
    principal: loan.principal,
    annualRate: loan.annualRate,
    termMonths: loan.termMonths,
    firstPaymentDate: loan.firstPaymentDate.toISOString().slice(0, 10),
    method: loan.method,
  };
}

// Kredit + jadval bo'yicha holat. status: closed | overdue | active
export function loanView(loan, paid, today) {
  const schedule = buildSchedule(loanParams(loan));
  const s = summarizeLoan(schedule, paid, today);
  const closed = loan.closed || s.remaining === 0;
  return {
    ...loan.toJSON(),
    monthlyPayment: schedule[0].payment,
    lastPaymentDate: schedule.at(-1).date,
    ...s,
    next: closed ? null : s.next,
    status: closed ? 'closed' : s.overdueCount ? 'overdue' : 'active',
    schedule,
  };
}
