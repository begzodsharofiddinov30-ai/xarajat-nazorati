import mongoose from 'mongoose';
import { Budget } from '../models/Budget.js';
import { Transaction } from '../models/Transaction.js';
import { CATEGORY_LABELS } from '../utils/categories.js';
import { formatSom } from '../utils/format.js';
import { monthOf, monthRange } from '../utils/month.js';

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

export function budgetStatus(spent, limit) {
  if (spent > limit) return 'exceeded';
  if (spent >= limit * WARNING_THRESHOLD) return 'warning';
  return 'ok';
}

// Xarajat saqlangandan keyin chaqiriladi: kategoriya limiti oshgan bo'lsa ogohlantirish qaytaradi.
export async function checkBudget(userId, category, date) {
  const budget = await Budget.findOne({ user: userId, category });
  if (!budget) return null;

  const month = monthOf(date);
  const spent = (await getSpentByCategory(userId, month, category)).get(category) ?? 0;
  if (spent <= budget.limit) return null;

  const exceededBy = spent - budget.limit;
  return {
    category,
    month,
    limit: budget.limit,
    spent,
    exceededBy,
    message: `"${CATEGORY_LABELS[category]}" kategoriyasi bo'yicha oylik limit ${formatSom(exceededBy)}ga oshib ketdi`,
  };
}
