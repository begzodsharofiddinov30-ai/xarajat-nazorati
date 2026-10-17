import mongoose from 'mongoose';
import { Transaction } from '../models/Transaction.js';
import { buildMonthForecast, loadForecastContext } from '../services/forecastService.js';
import { currentMonth, daysInMonth, monthRange, shiftMonth, todayUtcStr } from '../utils/month.js';

export async function getSummary(req, res) {
  const month = req.valid.query.month ?? currentMonth();
  const today = req.valid.query.today ?? todayUtcStr();
  const { start, end } = monthRange(month);

  // Bitta aggregation: jami summalar, kategoriyalar va kunlik xarajatlar.
  const [[result], forecastCtx] = await Promise.all([
    Transaction.aggregate([
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
          // Prognoz uchun: takroriy qoidalardan yaratilgan xarajatlar (ular tempga ko'paytirilmaydi).
          recurringExpense: [
            { $match: { type: 'expense', recurring: { $exists: true } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
          ],
        },
      },
    ]),
    loadForecastContext(req.user.id, month, today),
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
      // Faqat joriy oy uchun; o'tgan va kelgusi oylarda null.
      forecast: buildMonthForecast(forecastCtx, {
        expense,
        recurringExpense: result.recurringExpense[0]?.total ?? 0,
      }),
    },
  });
}

// Oxirgi N oy bo'yicha daromad va xarajat (trend grafigi uchun). Bo'sh oylar 0 bilan to'ldiriladi.
export async function getTrend(req, res) {
  const month = req.valid.query.month ?? currentMonth();
  const count = req.valid.query.months;
  const first = shiftMonth(month, -(count - 1));
  const start = monthRange(first).start;
  const end = monthRange(month).end;

  const rows = await Transaction.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(req.user.id), date: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: {
          month: { $dateToString: { format: '%Y-%m', date: '$date', timezone: 'UTC' } },
          type: '$type',
        },
        total: { $sum: '$amount' },
      },
    },
  ]);

  const map = new Map(rows.map((r) => [`${r._id.month}|${r._id.type}`, r.total]));
  const data = Array.from({ length: count }, (_, i) => {
    const m = shiftMonth(first, i);
    const income = map.get(`${m}|income`) ?? 0;
    const expense = map.get(`${m}|expense`) ?? 0;
    return { month: m, income, expense, balance: income - expense };
  });

  res.json({ data });
}
