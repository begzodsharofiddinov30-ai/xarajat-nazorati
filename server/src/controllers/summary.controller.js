import mongoose from 'mongoose';
import { Transaction } from '../models/Transaction.js';
import { currentMonth, daysInMonth, monthRange } from '../utils/month.js';

export async function getSummary(req, res) {
  const month = req.valid.query.month ?? currentMonth();
  const { start, end } = monthRange(month);

  // Bitta aggregation: jami summalar, kategoriyalar va kunlik xarajatlar.
  const [result] = await Transaction.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(req.user.id), date: { $gte: start, $lt: end } } },
    {
      $facet: {
        totals: [{ $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }],
        byCategory: [
          { $match: { type: 'expense' } },
          { $group: { _id: '$category', total: { $sum: '$amount' } } },
          { $sort: { total: -1 } },
        ],
        daily: [
          { $match: { type: 'expense' } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'UTC' } },
              total: { $sum: '$amount' },
            },
          },
        ],
      },
    },
  ]);

  const totals = Object.fromEntries(result.totals.map((t) => [t._id, t]));
  const income = totals.income?.total ?? 0;
  const expense = totals.expense?.total ?? 0;

  // Grafik uzluksiz chiqishi uchun xarajat bo'lmagan kunlar ham 0 bilan qaytadi.
  const dailyMap = new Map(result.daily.map((d) => [d._id, d.total]));
  const daily = Array.from({ length: daysInMonth(month) }, (_, i) => {
    const date = `${month}-${String(i + 1).padStart(2, '0')}`;
    return { date, total: dailyMap.get(date) ?? 0 };
  });

  res.json({
    data: {
      month,
      income,
      expense,
      balance: income - expense,
      transactionCount: (totals.income?.count ?? 0) + (totals.expense?.count ?? 0),
      byCategory: result.byCategory.map((c) => ({ category: c._id, total: c.total })),
      daily,
    },
  });
}
