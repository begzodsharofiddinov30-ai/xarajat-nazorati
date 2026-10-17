import mongoose from 'mongoose';
import { Budget } from '../models/Budget.js';
import { Transaction } from '../models/Transaction.js';
import { formatSom } from '../utils/format.js';
import { monthOf, monthRange } from '../utils/month.js';
import { categoryLabel } from './categoryService.js';

export const WARNING_THRESHOLD = 0.8;

// Berilgan oy uchun kategoriya bo'yicha xarajatlar: Map<category, total>
export async function getSpentByCategory(userId, month, category) {
  const { start, end } = monthRange(month);
  const match = {
    user: new mongoose.Types.ObjectId(userId),
    type: 'expense',
    date: { $gte: start, $lt: end },
  };
  if (category) match.category = category;

  const rows = await Transaction.aggregate([
    { $match: match },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
  ]);
  return new Map(rows.map((r) => [r._id, r.total]));
}

// Prognoz uchun: kategoriya bo'yicha jami va shundan takroriy (ijara, obuna) qismi.
export async function getSpentSplitByCategory(userId, month) {
  const { start, end } = monthRange(month);
  const rows = await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        type: 'expense',
        date: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' },
        recurring: { $sum: { $cond: [{ $ifNull: ['$recurring', false] }, '$amount', 0] } },
      },
    },
  ]);
  return new Map(rows.map((r) => [r._id, { total: r.total, recurring: r.recurring }]));
}

export function budgetStatus(spent, limit) {
  if (spent > limit) return 'exceeded';
  if (spent >= limit * WARNING_THRESHOLD) return 'warning';
  return 'ok';
}

// Xarajat saqlangandan keyin chaqiriladi. Limitning 80% iga yetganda ("warning") va oshganda ("exceeded")
// ogohlantirish qaytaradi; undan past bo'lsa null.
export async function checkBudget(userId, category, date) {
  const budget = await Budget.findOne({ user: userId, category });
  if (!budget) return null;

  const month = monthOf(date);
  const spent = (await getSpentByCategory(userId, month, category)).get(category) ?? 0;
  const level = budgetStatus(spent, budget.limit);
  if (level === 'ok') return null;

  const label = await categoryLabel(userId, category);
  const base = { category, month, limit: budget.limit, spent, level };

  if (level === 'warning') {
    return {
      ...base,
      exceededBy: 0,
      message: `"${label}" kategoriyasi oylik limitning ${Math.round((spent / budget.limit) * 100)}% iga yetdi (${formatSom(budget.limit - spent)} qoldi)`,
    };
  }
  const exceededBy = spent - budget.limit;
  return {
    ...base,
    exceededBy,
    message: `"${label}" kategoriyasi bo'yicha oylik limit ${formatSom(exceededBy)}ga oshib ketdi`,
  };
}
