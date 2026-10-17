import mongoose from 'mongoose';
import { Transaction } from '../models/Transaction.js';
import { checkBudget } from '../services/budgetService.js';
import { assertCategory, loadCategoryLookup } from '../services/categoryService.js';
import { assertPhone } from '../services/phoneService.js';
import { ApiError } from '../utils/ApiError.js';
import { escapeRegex } from '../utils/format.js';
import { addDays, monthRange, parseDateOnly } from '../utils/month.js';
import { amountField, dateField, noteField, typeField } from '../validators/common.js';

const notFound = () => ApiError.notFound('Tranzaksiya topilmadi', 'TRANSACTION_NOT_FOUND');

// Egalik har doim so'rovning o'zida tekshiriladi: { _id, user }.
// Boshqa foydalanuvchining yozuvi uchun 404 qaytadi, shunda yozuv borligi oshkor bo'lmaydi.
function ownedFilter(req) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw notFound();
  return { _id: id, user: req.user.id };
}

async function warningFor(req, tx) {
  return tx.type === 'expense' ? checkBudget(req.user.id, tx.category, tx.date) : null;
}

const SORTS = {
  date_desc: { date: -1, createdAt: -1 },
  date_asc: { date: 1, createdAt: 1 },
  amount_desc: { amount: -1, date: -1 },
  amount_asc: { amount: 1, date: -1 },
};

export async function listTransactions(req, res) {
  const { month, from, to, type, category, phone, q, minAmount, maxAmount, sort, page, limit } = req.valid.query;

  const filter = { user: new mongoose.Types.ObjectId(req.user.id) };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = parseDateOnly(from);
    if (to) filter.date.$lt = parseDateOnly(addDays(to, 1));
  } else if (month) {
    const { start, end } = monthRange(month);
    filter.date = { $gte: start, $lt: end };
  }
  if (type) filter.type = type;
  if (category) filter.category = category;
  if (phone) filter.phone = new mongoose.Types.ObjectId(phone);
  if (q) filter.note = { $regex: escapeRegex(q), $options: 'i' };
  if (minAmount != null || maxAmount != null) {
    filter.amount = {};
    if (minAmount != null) filter.amount.$gte = minAmount;
    if (maxAmount != null) filter.amount.$lte = maxAmount;
  }

  const [items, totalsRows] = await Promise.all([
    Transaction.find(filter)
      .sort(SORTS[sort])
      .skip((page - 1) * limit)
      .limit(limit),
    // Jami summalar sahifadagi emas, butun filtr bo'yicha hisoblanadi.
    Transaction.aggregate([
      { $match: filter },
      { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
  ]);

  const byType = Object.fromEntries(totalsRows.map((r) => [r._id, r]));
  const total = (byType.income?.count ?? 0) + (byType.expense?.count ?? 0);

  res.json({
    data: items,
    meta: {
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
      totals: { income: byType.income?.total ?? 0, expense: byType.expense?.total ?? 0 },
    },
  });
}

export async function createTransaction(req, res) {
  const body = req.valid.body;
  await assertCategory(req.user.id, body.type, body.category);
  await assertPhone(req.user.id, body.phone, body.category);
  const tx = await Transaction.create({
    ...body,
    phone: body.phone ?? undefined,
    date: parseDateOnly(body.date),
    user: req.user.id,
  });

  res.status(201).json({ data: tx, warning: await warningFor(req, tx) });
}

export async function updateTransaction(req, res) {
  const body = req.valid.body;
  const tx = await Transaction.findOne(ownedFilter(req));
  if (!tx) throw notFound();
  await assertCategory(req.user.id, body.type, body.category);
  await assertPhone(req.user.id, body.phone, body.category);

  // PUT to'liq almashtiradi: raqam yuborilmasa bog'lanish olib tashlanadi.
  tx.set({ ...body, phone: body.phone ?? undefined, date: parseDateOnly(body.date) });
  await tx.save();

  res.json({ data: tx, warning: await warningFor(req, tx) });
}

export async function deleteTransaction(req, res) {
  const { deletedCount } = await Transaction.deleteOne(ownedFilter(req));
  if (!deletedCount) throw notFound();
  res.status(204).end();
}

// ---- CSV import ----
const importRowSchema = {
  type: typeField,
  amount: amountField,
  date: dateField(),
  note: noteField(),
};

const rowKey = (r) => `${r.date}|${r.type}|${r.amount}|${r.category}|${r.note}`;

// Qatorlar alohida tekshiriladi: yaroqlilari saqlanadi, yaroqsizlari "invalid" ro'yxatida qaytadi.
// Takrorlar (xuddi shu sana, tur, summa, kategoriya va izoh) o'tkazib yuboriladi; bir xil qatorlar soni ham hisobga olinadi.
export async function importTransactions(req, res) {
  const { rows, skipDuplicates } = req.valid.body;
  const lookup = await loadCategoryLookup(req.user.id);

  const valid = [];
  const invalid = [];
  rows.forEach((raw, i) => {
    const row = i + 1;
    const errors = [];
    const parsed = {};
    for (const [field, schema] of Object.entries(importRowSchema)) {
      const r = schema.safeParse(raw[field]);
      if (r.success) parsed[field] = r.data;
      else errors.push(r.error.issues[0].message);
    }
    if (typeof raw.category !== 'string' || (parsed.type && !lookup.isValid(parsed.type, raw.category))) {
      errors.push('Kategoriya mavjud emas yoki turga mos emas');
    } else {
      parsed.category = raw.category;
    }
    if (errors.length) invalid.push({ row, message: errors[0] });
    else valid.push(parsed);
  });

  let toInsert = valid;
  let skipped = 0;
  if (skipDuplicates && valid.length) {
    const dates = valid.map((r) => r.date).sort();
    const existing = await Transaction.find({
      user: req.user.id,
      date: { $gte: parseDateOnly(dates[0]), $lt: parseDateOnly(addDays(dates.at(-1), 1)) },
    }).lean();
    const counts = new Map();
    for (const e of existing) {
      const k = rowKey({ ...e, date: e.date.toISOString().slice(0, 10) });
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    toInsert = valid.filter((r) => {
      const k = rowKey(r);
      const left = counts.get(k) ?? 0;
      if (left > 0) {
        counts.set(k, left - 1);
        skipped += 1;
        return false;
      }
      return true;
    });
  }

  if (toInsert.length) {
    await Transaction.insertMany(
      toInsert.map((r) => ({ ...r, date: parseDateOnly(r.date), user: req.user.id })),
    );
  }

  res.status(201).json({ data: { imported: toInsert.length, skipped, invalid } });
}
