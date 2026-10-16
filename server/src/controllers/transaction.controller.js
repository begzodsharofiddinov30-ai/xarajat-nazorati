import mongoose from 'mongoose';
import { Transaction } from '../models/Transaction.js';
import { checkBudget } from '../services/budgetService.js';
import { ApiError } from '../utils/ApiError.js';
import { escapeRegex } from '../utils/format.js';
import { monthRange, parseDateOnly } from '../utils/month.js';

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

export async function listTransactions(req, res) {
  const { month, type, category, q, page, limit } = req.valid.query;

  const filter = { user: req.user.id };
  if (month) {
    const { start, end } = monthRange(month);
    filter.date = { $gte: start, $lt: end };
  }
  if (type) filter.type = type;
  if (category) filter.category = category;
  if (q) filter.note = { $regex: escapeRegex(q), $options: 'i' };

  const [items, total] = await Promise.all([
    Transaction.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Transaction.countDocuments(filter),
  ]);

  res.json({ data: items, meta: { total, page, limit } });
}

export async function createTransaction(req, res) {
  const body = req.valid.body;
  const tx = await Transaction.create({
    ...body,
    date: parseDateOnly(body.date),
    user: req.user.id,
  });

  res.status(201).json({ data: tx, warning: await warningFor(req, tx) });
}

export async function updateTransaction(req, res) {
  const body = req.valid.body;
  const tx = await Transaction.findOne(ownedFilter(req));
  if (!tx) throw notFound();

  tx.set({ ...body, date: parseDateOnly(body.date) });
  await tx.save();

  res.json({ data: tx, warning: await warningFor(req, tx) });
}

export async function deleteTransaction(req, res) {
  const { deletedCount } = await Transaction.deleteOne(ownedFilter(req));
  if (!deletedCount) throw notFound();
  res.status(204).end();
}
