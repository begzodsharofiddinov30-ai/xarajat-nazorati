import { Budget } from '../models/Budget.js';
import { budgetStatus, getSpentByCategory } from '../services/budgetService.js';
import { ApiError } from '../utils/ApiError.js';
import { currentMonth } from '../utils/month.js';

export async function listBudgets(req, res) {
  const month = req.valid.query.month ?? currentMonth();
  const [budgets, spentMap] = await Promise.all([
    Budget.find({ user: req.user.id }).sort({ category: 1 }),
    getSpentByCategory(req.user.id, month),
  ]);

  const data = budgets.map((b) => {
    const spent = spentMap.get(b.category) ?? 0;
    return {
      id: b.id,
      category: b.category,
      limit: b.limit,
      spent,
      remaining: b.limit - spent,
      percent: Math.round((spent / b.limit) * 100),
      status: budgetStatus(spent, b.limit),
    };
  });

  res.json({ data, meta: { month } });
}

export async function upsertBudget(req, res) {
  const { category, limit } = req.valid.body;
  const budget = await Budget.findOneAndUpdate(
    { user: req.user.id, category },
    { $set: { limit } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
  res.json({ data: budget });
}

export async function deleteBudget(req, res) {
  const { deletedCount } = await Budget.deleteOne({
    user: req.user.id,
    category: req.valid.params.category,
  });
  if (!deletedCount) throw ApiError.notFound('Budjet topilmadi', 'BUDGET_NOT_FOUND');
  res.status(204).end();
}
