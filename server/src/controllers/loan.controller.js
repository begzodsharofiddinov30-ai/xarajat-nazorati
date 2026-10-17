import mongoose from 'mongoose';
import { Loan } from '../models/Loan.js';
import { Recurring } from '../models/Recurring.js';
import { Transaction } from '../models/Transaction.js';
import { checkBudget } from '../services/budgetService.js';
import { LOAN_CATEGORY, loanView, paidByLoan } from '../services/loanService.js';
import { ApiError } from '../utils/ApiError.js';
import { parseDateOnly, todayUtcStr } from '../utils/month.js';
import { occurrenceDate } from '../utils/recurrence.js';

const MAX_LOANS = 30;
const notFound = () => ApiError.notFound('Kredit topilmadi', 'LOAN_NOT_FOUND');

function ownedFilter(req) {
  if (!mongoose.isValidObjectId(req.params.id)) throw notFound();
  return { _id: req.params.id, user: req.user.id };
}

const toDoc = ({ firstPaymentDate, ...rest }) => ({ ...rest, firstPaymentDate: parseDateOnly(firstPaymentDate) });

function autoPayView(rule) {
  if (!rule) return null;
  const next = occurrenceDate(rule.startDate, rule.frequency, rule.nextIndex);
  return {
    id: String(rule._id),
    amount: rule.amount,
    active: rule.active,
    nextDate: !rule.endDate || next <= rule.endDate ? next.toISOString().slice(0, 10) : null,
  };
}

async function autoPayRules(userId, loanIds) {
  const rules = await Recurring.find({ user: userId, loan: { $in: loanIds }, category: LOAN_CATEGORY }).sort({ active: -1 });
  const map = new Map();
  for (const r of rules) if (!map.has(String(r.loan))) map.set(String(r.loan), r);
  return map;
}

// Kreditlar ro'yxati (jadvalsiz) va umumiy holat: qolgan qarz, eng yaqin to'lov, kechikkanlar.
export async function listLoans(req, res) {
  const today = req.valid.query.today ?? todayUtcStr();
  const loans = await Loan.find({ user: req.user.id }).sort({ closed: 1, createdAt: 1 });
  const ids = loans.map((l) => l._id);
  const [paid, rules] = await Promise.all([paidByLoan(req.user.id, ids), autoPayRules(req.user.id, ids)]);

  const data = loans.map((l) => {
    const { schedule, ...view } = loanView(l, paid.get(String(l._id)) ?? 0, today);
    return { ...view, autoPay: autoPayView(rules.get(String(l._id))) };
  });

  const open = data.filter((l) => l.status !== 'closed');
  const upcoming = open.filter((l) => l.next).sort((a, b) => a.next.date.localeCompare(b.next.date));
  res.json({
    data,
    meta: {
      activeCount: open.length,
      remaining: open.reduce((s, l) => s + l.remaining, 0),
      monthlyPayment: open.reduce((s, l) => s + (l.next?.amount ?? 0), 0),
      overdueCount: open.filter((l) => l.status === 'overdue').length,
      nextPayment: upcoming[0] ? { loanId: upcoming[0].id, name: upcoming[0].name, ...upcoming[0].next } : null,
    },
  });
}

// Bitta kredit: to'liq jadval (har oy holati bilan) va to'lovlar tarixi.
export async function getLoan(req, res) {
  const today = req.valid.query.today ?? todayUtcStr();
  const loan = await Loan.findOne(ownedFilter(req));
  if (!loan) throw notFound();
  const [paid, rules, payments] = await Promise.all([
    paidByLoan(req.user.id, [loan._id]),
    autoPayRules(req.user.id, [loan._id]),
    Transaction.find({ user: req.user.id, loan: loan._id }).sort({ date: -1, createdAt: -1 }).limit(500),
  ]);
  const view = loanView(loan, paid.get(String(loan._id)) ?? 0, today);
  view.schedule = view.schedule.map((row, i) => ({
    ...row,
    status: i < view.paidCount ? 'paid' : view.status === 'closed' ? 'closed' : row.date < today ? 'overdue' : 'upcoming',
  }));
  res.json({ data: { ...view, autoPay: autoPayView(rules.get(String(loan._id))), payments } });
}

export async function createLoan(req, res) {
  if ((await Loan.countDocuments({ user: req.user.id })) >= MAX_LOANS) {
    throw ApiError.badRequest(`Kreditlar soni ${MAX_LOANS} tadan oshmasin`, 'LOAN_LIMIT');
  }
  const loan = await Loan.create({ ...toDoc(req.valid.body), user: req.user.id });
  const { schedule, ...view } = loanView(loan, 0, todayUtcStr());
  res.status(201).json({ data: view });
}

export async function updateLoan(req, res) {
  const loan = await Loan.findOneAndUpdate(ownedFilter(req), { $set: toDoc(req.valid.body) }, { new: true, runValidators: true });
  if (!loan) throw notFound();
  const paid = await paidByLoan(req.user.id, [loan._id]);
  const { schedule, ...view } = loanView(loan, paid.get(String(loan._id)) ?? 0, todayUtcStr());
  res.json({ data: view });
}

// Kredit o'chirilsa, to'lovlar xarajatlarda qoladi (balans o'zgarmasligi uchun), faqat bog'lanish olib tashlanadi.
// Avtomatik to'lov qoidasi ham o'chiriladi: aks holda yopilgan kredit uchun to'lov yozilishda davom etardi.
export async function deleteLoan(req, res) {
  const loan = await Loan.findOneAndDelete(ownedFilter(req));
  if (!loan) throw notFound();
  await Promise.all([
    Transaction.updateMany({ user: req.user.id, loan: loan._id }, { $unset: { loan: 1 } }),
    Recurring.deleteMany({ user: req.user.id, loan: loan._id }),
  ]);
  res.status(204).end();
}

// To'lov qo'shish: summa berilmasa keyingi to'lov summasi. Qolgan qarzdan ortiq to'lab bo'lmaydi.
export async function addLoanPayment(req, res) {
  const loan = await Loan.findOne(ownedFilter(req));
  if (!loan) throw notFound();
  const { amount, date, note } = req.valid.body;
  const today = date ?? todayUtcStr();
  const paid = await paidByLoan(req.user.id, [loan._id]);
  const view = loanView(loan, paid.get(String(loan._id)) ?? 0, today);

  const fail = (path, message) => {
    throw ApiError.badRequest("Ma'lumotlar noto'g'ri", 'VALIDATION_ERROR', [{ path, message }]);
  };
  if (view.status === 'closed') fail('amount', "Kredit yopilgan, to'lov qo'shib bo'lmaydi");
  const value = amount ?? view.next.amount;
  if (value > view.remaining) fail('amount', `Qolgan qarz ${view.remaining} so'm, undan ortiq to'lab bo'lmaydi`);

  const tx = await Transaction.create({
    user: req.user.id,
    type: 'expense',
    category: LOAN_CATEGORY,
    loan: loan._id,
    amount: value,
    date: parseDateOnly(today),
    note: note || `${loan.name}: ${view.next.n}-to'lov`,
  });
  res.status(201).json({ data: tx, warning: await checkBudget(req.user.id, LOAN_CATEGORY, tx.date) });
}
