import { Budget } from '../models/Budget.js';
import { budgetStatus, getSpentSplitByCategory } from '../services/budgetService.js';
import { assertCategory } from '../services/categoryService.js';
import { loadForecastContext, projectCategory } from '../services/forecastService.js';
import { ApiError } from '../utils/ApiError.js';
import { currentMonth, todayUtcStr } from '../utils/month.js';

export async function listBudgets(req, res) {
  const today = req.valid.query.today ?? todayUtcStr();
  const month = req.valid.query.month ?? currentMonth();
  const [budgets, splitMap, forecastCtx] = await Promise.all([
    Budget.find({ user: req.user.id }).sort({ category: 1 }),
    getSpentSplitByCategory(req.user.id, month),
    loadForecastContext(req.user.id, month, today),
  ]);

  const data = budgets.map((b) => {
    const split = splitMap.get(b.category);
    const spent = split?.total ?? 0;
    const status = budgetStatus(spent, b.limit);
    // Faqat joriy oy uchun: shu tempda oy oxirida qancha bo'lishi (takroriy to'lovlar hisobga olingan).
    const projected = projectCategory(forecastCtx, b.category, split);
    return {
      id: b.id,
      category: b.category,
      limit: b.limit,
      spent,
      remaining: b.limit - spent,
      percent: Math.round((spent / b.limit) * 100),
      status,
      projected,
      projectedExceeds: projected != null && status !== 'exceeded' && projected > b.limit,
    };
  });

  res.json({ data, meta: { month } });
}

export async function upsertBudget(req, res) {
  const { category, limit } = req.valid.body;
  await assertCategory(req.user.id, 'expense', category);
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
