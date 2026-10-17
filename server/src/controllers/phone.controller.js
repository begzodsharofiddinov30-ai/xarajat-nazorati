import mongoose from 'mongoose';
import { Phone } from '../models/Phone.js';
import { Recurring } from '../models/Recurring.js';
import { Transaction } from '../models/Transaction.js';
import { MOBILE_CATEGORY } from '../services/phoneService.js';
import { ApiError } from '../utils/ApiError.js';
import { currentMonth, monthRange, shiftMonth } from '../utils/month.js';
import { detectOperator } from '../utils/phone.js';
import { occurrenceDate } from '../utils/recurrence.js';

const MAX_PHONES = 20;
const TREND_MONTHS = 6;
const notFound = () => ApiError.notFound('Raqam topilmadi', 'PHONE_NOT_FOUND');
const duplicate = () =>
  ApiError.badRequest("Ma'lumotlar noto'g'ri", 'VALIDATION_ERROR', [{ path: 'number', message: "Bu raqam allaqachon qo'shilgan" }]);

function ownedFilter(req) {
  if (!mongoose.isValidObjectId(req.params.id)) throw notFound();
  return { _id: req.params.id, user: req.user.id };
}

// Raqamlar ro'yxati va tanlangan oy bo'yicha mobil aloqa xarajatlari:
// har bir raqamga qancha to'langan, oxirgi to'lov, avtomatik oylik to'lov va oxirgi 6 oylik jami.
export async function listPhones(req, res) {
  const userId = new mongoose.Types.ObjectId(req.user.id);
  const month = req.valid.query.month ?? currentMonth();
  const { start, end } = monthRange(month);
  const trendStart = monthRange(shiftMonth(month, -(TREND_MONTHS - 1))).start;
  const mobile = { user: userId, type: 'expense', category: MOBILE_CATEGORY };

  const [phones, [stats], rules] = await Promise.all([
    Phone.find({ user: userId }).sort({ createdAt: 1 }),
    Transaction.aggregate([
      { $match: { ...mobile, date: { $gte: trendStart, $lt: end } } },
      {
        $facet: {
          byPhone: [
            { $match: { date: { $gte: start } } },
            { $group: { _id: '$phone', paid: { $sum: '$amount' }, count: { $sum: 1 } } },
          ],
          trend: [
            { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date', timezone: 'UTC' } }, total: { $sum: '$amount' } } },
          ],
        },
      },
    ]),
    Recurring.find({ user: userId, phone: { $exists: true }, category: MOBILE_CATEGORY }).sort({ active: -1 }),
  ]);

  // Oxirgi to'lov butun tarix bo'yicha (tanlangan oyda to'lov bo'lmasa ham ko'rinadi).
  const last = await Transaction.aggregate([
    { $match: { ...mobile, phone: { $in: phones.map((p) => p._id) } } },
    { $sort: { date: -1, createdAt: -1 } },
    { $group: { _id: '$phone', date: { $first: '$date' }, amount: { $first: '$amount' } } },
  ]);

  const paidMap = new Map(stats.byPhone.map((r) => [String(r._id), r]));
  const lastMap = new Map(last.map((r) => [String(r._id), r]));
  const ruleMap = new Map();
  for (const r of rules) if (!ruleMap.has(String(r.phone))) ruleMap.set(String(r.phone), r);

  const data = phones.map((p) => {
    const id = String(p._id);
    const rule = ruleMap.get(id);
    const lp = lastMap.get(id);
    const next = rule && occurrenceDate(rule.startDate, rule.frequency, rule.nextIndex);
    return {
      ...p.toJSON(),
      paid: paidMap.get(id)?.paid ?? 0,
      count: paidMap.get(id)?.count ?? 0,
      lastPayment: lp ? { date: lp.date.toISOString().slice(0, 10), amount: lp.amount } : null,
      autoPay: rule
        ? {
            id: String(rule._id),
            amount: rule.amount,
            frequency: rule.frequency,
            active: rule.active,
            nextDate: next && (!rule.endDate || next <= rule.endDate) ? next.toISOString().slice(0, 10) : null,
          }
        : null,
    };
  });

  const total = stats.byPhone.reduce((s, r) => s + r.paid, 0);
  const trendMap = new Map(stats.trend.map((t) => [t._id, t.total]));
  res.json({
    data,
    meta: {
      month,
      total,
      // "Mobil aloqa" kategoriyasidagi, lekin hech qaysi raqamga bog'lanmagan to'lovlar.
      unassigned: paidMap.get('null')?.paid ?? 0,
      trend: Array.from({ length: TREND_MONTHS }, (_, i) => {
        const m = shiftMonth(month, i - (TREND_MONTHS - 1));
        return { month: m, total: trendMap.get(m) ?? 0 };
      }),
    },
  });
}

export async function createPhone(req, res) {
  if ((await Phone.countDocuments({ user: req.user.id })) >= MAX_PHONES) {
    throw ApiError.badRequest(`Raqamlar soni ${MAX_PHONES} tadan oshmasin`, 'PHONE_LIMIT');
  }
  const { label, number, operator } = req.valid.body;
  try {
    const phone = await Phone.create({ user: req.user.id, label, number, operator: operator ?? detectOperator(number) });
    res.status(201).json({ data: phone });
  } catch (err) {
    if (err.code === 11000) throw duplicate();
    throw err;
  }
}

export async function updatePhone(req, res) {
  const { label, number, operator } = req.valid.body;
  try {
    const phone = await Phone.findOneAndUpdate(
      ownedFilter(req),
      { $set: { label, number, operator: operator ?? detectOperator(number) } },
      { new: true, runValidators: true },
    );
    if (!phone) throw notFound();
    res.json({ data: phone });
  } catch (err) {
    if (err.code === 11000) throw duplicate();
    throw err;
  }
}

// Raqam o'chirilsa, to'lovlar o'chmaydi (balans o'zgarmasligi uchun), faqat raqamga bog'lanish olib tashlanadi.
export async function deletePhone(req, res) {
  const phone = await Phone.findOneAndDelete(ownedFilter(req));
  if (!phone) throw notFound();
  await Promise.all([
    Transaction.updateMany({ user: req.user.id, phone: phone._id }, { $unset: { phone: 1 } }),
    Recurring.updateMany({ user: req.user.id, phone: phone._id }, { $unset: { phone: 1 } }),
  ]);
  res.status(204).end();
}
