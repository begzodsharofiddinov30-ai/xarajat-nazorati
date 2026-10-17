import mongoose from 'mongoose';
import { Goal, MAX_CONTRIBUTIONS } from '../models/Goal.js';
import { serializeGoal } from '../services/goalService.js';
import { ApiError } from '../utils/ApiError.js';
import { parseDateOnly, todayUtcStr } from '../utils/month.js';

const notFound = () => ApiError.notFound('Maqsad topilmadi', 'GOAL_NOT_FOUND');

function ownedFilter(req) {
  if (!mongoose.isValidObjectId(req.params.id)) throw notFound();
  return { _id: req.params.id, user: req.user.id };
}

const today = (req) => req.valid?.query?.today ?? todayUtcStr();

export async function listGoals(req, res) {
  const goals = await Goal.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json({ data: goals.map((g) => serializeGoal(g, today(req))) });
}

export async function createGoal(req, res) {
  const { name, targetAmount, deadline } = req.valid.body;
  const goal = await Goal.create({
    user: req.user.id,
    name,
    targetAmount,
    deadline: deadline ? parseDateOnly(deadline) : null,
  });
  res.status(201).json({ data: serializeGoal(goal, todayUtcStr()) });
}

export async function updateGoal(req, res) {
  const { name, targetAmount, deadline } = req.valid.body;
  const goal = await Goal.findOne(ownedFilter(req));
  if (!goal) throw notFound();
  goal.set({ name, targetAmount, deadline: deadline ? parseDateOnly(deadline) : null });
  await goal.save();
  res.json({ data: serializeGoal(goal, todayUtcStr()) });
}

export async function deleteGoal(req, res) {
  const { deletedCount } = await Goal.deleteOne(ownedFilter(req));
  if (!deletedCount) throw notFound();
  res.status(204).end();
}

export async function addContribution(req, res) {
  const { amount, date, note } = req.valid.body;
  const goal = await Goal.findOne(ownedFilter(req));
  if (!goal) throw notFound();

  if (goal.contributions.length >= MAX_CONTRIBUTIONS) {
    throw ApiError.badRequest(`Bitta maqsadga ${MAX_CONTRIBUTIONS} tadan ortiq yozuv qo'shib bo'lmaydi`, 'CONTRIBUTION_LIMIT');
  }
  const saved = goal.contributions.reduce((s, c) => s + c.amount, 0);
  if (saved + amount < 0) {
    throw ApiError.badRequest("Jamg'armadagi summadan ko'p qaytarib bo'lmaydi", 'VALIDATION_ERROR', [
      { path: 'amount', message: `Eng ko'pi bilan ${saved} so'm qaytarib olish mumkin` },
    ]);
  }

  goal.contributions.push({ amount, date: parseDateOnly(date ?? todayUtcStr()), note });
  await goal.save();
  res.status(201).json({ data: serializeGoal(goal, todayUtcStr()) });
}

export async function deleteContribution(req, res) {
  const goal = await Goal.findOne(ownedFilter(req));
  if (!goal) throw notFound();
  const item = mongoose.isValidObjectId(req.params.cid) ? goal.contributions.id(req.params.cid) : null;
  if (!item) throw ApiError.notFound('Yozuv topilmadi', 'CONTRIBUTION_NOT_FOUND');

  // O'chirilgandan keyin jami summa manfiy bo'lib qolmasligi kerak.
  const saved = goal.contributions.reduce((s, c) => s + c.amount, 0);
  if (saved - item.amount < 0) {
    throw ApiError.badRequest("Bu yozuvni o'chirib bo'lmaydi: jamg'arma manfiy bo'lib qoladi", 'CONTRIBUTION_CONFLICT');
  }
  goal.contributions.pull(item._id);
  await goal.save();
  res.json({ data: serializeGoal(goal, todayUtcStr()) });
}
