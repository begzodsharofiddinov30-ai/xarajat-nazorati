import mongoose from 'mongoose';
import { Budget } from '../models/Budget.js';
import { Category } from '../models/Category.js';
import { Recurring } from '../models/Recurring.js';
import { Transaction } from '../models/Transaction.js';
import { ApiError } from '../utils/ApiError.js';

const MAX_CUSTOM = 50;
const notFound = () => ApiError.notFound('Kategoriya topilmadi', 'CATEGORY_NOT_FOUND');

function ownedFilter(req) {
  if (!mongoose.isValidObjectId(req.params.id)) throw notFound();
  return { _id: req.params.id, user: req.user.id };
}

export async function listCategories(req, res) {
  const items = await Category.find({ user: req.user.id }).sort({ type: 1, label: 1 });
  res.json({ data: items });
}

export async function createCategory(req, res) {
  if ((await Category.countDocuments({ user: req.user.id })) >= MAX_CUSTOM) {
    throw ApiError.badRequest(`Kategoriyalar soni ${MAX_CUSTOM} tadan oshmasin`, 'CATEGORY_LIMIT');
  }
  const { type, label, icon } = req.valid.body;
  const item = await Category.create({ user: req.user.id, type, label, ...(icon && { icon }) });
  res.status(201).json({ data: item });
}

export async function updateCategory(req, res) {
  const { label, icon } = req.valid.body;
  const item = await Category.findOneAndUpdate(
    ownedFilter(req),
    { $set: { label, ...(icon && { icon }) } },
    { new: true, runValidators: true },
  );
  if (!item) throw notFound();
  res.json({ data: item });
}

// Tranzaksiya yoki takroriy qoida ishlatayotgan kategoriyani o'chirib bo'lmaydi (eski yozuvlar nomsiz qolmasligi uchun).
export async function deleteCategory(req, res) {
  const item = await Category.findOne(ownedFilter(req));
  if (!item) throw notFound();

  const key = `c_${item._id}`;
  const [txCount, ruleCount] = await Promise.all([
    Transaction.countDocuments({ user: req.user.id, category: key }),
    Recurring.countDocuments({ user: req.user.id, category: key }),
  ]);
  if (txCount || ruleCount) {
    throw new ApiError(
      409,
      `Bu kategoriyada ${txCount} ta tranzaksiya va ${ruleCount} ta takroriy qoida bor. Avval ularni boshqa kategoriyaga o'tkazing yoki o'chiring`,
      'CATEGORY_IN_USE',
      { transactions: txCount, recurring: ruleCount },
    );
  }

  await Promise.all([item.deleteOne(), Budget.deleteOne({ user: req.user.id, category: key })]);
  res.status(204).end();
}
