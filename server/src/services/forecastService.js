import { pendingRecurringInMonth } from './recurringService.js';
import { daysInMonth } from '../utils/month.js';
import { confidenceFor, projectSpending } from '../utils/forecast.js';

// Faqat "bugun" tanlangan oyga tegishli bo'lsa prognoz beriladi (o'tgan va kelgusi oylar uchun null).
export async function loadForecastContext(userId, month, todayStr) {
  if (todayStr.slice(0, 7) !== month) return null;
  const totalDays = daysInMonth(month);
  const monthEnd = new Date(`${month}-${String(totalDays).padStart(2, '0')}T00:00:00.000Z`);
  const pending = (await pendingRecurringInMonth(userId, monthEnd)).filter((p) => p.type === 'expense');
  return {
    daysElapsed: Number(todayStr.slice(8, 10)),
    daysInMonth: totalDays,
    pending,
    pendingTotal: pending.reduce((s, p) => s + p.amount, 0),
    pendingByCategory: pending.reduce((m, p) => m.set(p.category, (m.get(p.category) ?? 0) + p.amount), new Map()),
  };
}

export function buildMonthForecast(ctx, { expense, recurringExpense }) {
  if (!ctx) return null;
  const p = projectSpending({
    spent: expense,
    recurringSpent: recurringExpense,
    upcomingRecurring: ctx.pendingTotal,
    daysElapsed: ctx.daysElapsed,
    daysInMonth: ctx.daysInMonth,
  });
  return {
    projectedExpense: p.projected,
    dailyAverage: p.dailyAverage,
    daysElapsed: p.daysElapsed,
    daysRemaining: p.daysRemaining,
    upcomingRecurring: ctx.pendingTotal,
    confidence: confidenceFor(p.daysElapsed),
  };
}

// Kategoriya bo'yicha oy oxirigacha taxminiy xarajat (budjet uchun).
export function projectCategory(ctx, category, split) {
  if (!ctx) return null;
  const total = split?.total ?? 0;
  return projectSpending({
    spent: total,
    recurringSpent: split?.recurring ?? 0,
    upcomingRecurring: ctx.pendingByCategory.get(category) ?? 0,
    daysElapsed: ctx.daysElapsed,
    daysInMonth: ctx.daysInMonth,
  }).projected;
}
