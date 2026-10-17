import { parseDateOnly } from '../utils/month.js';

const DAY = 24 * 60 * 60 * 1000;
const dateStr = (d) => d.toISOString().slice(0, 10);

// Maqsadni javob ko'rinishiga keltiradi: jamlangan summa, foiz, muddat bo'yicha oylik kerakli summa.
export function serializeGoal(goal, todayStr) {
  const saved = goal.contributions.reduce((s, c) => s + c.amount, 0);
  const target = goal.targetAmount;
  const remaining = Math.max(target - saved, 0);
  const completed = saved >= target;

  let monthlyNeeded = null;
  let daysLeft = null;
  let overdue = false;
  if (goal.deadline) {
    daysLeft = Math.round((goal.deadline.getTime() - parseDateOnly(todayStr).getTime()) / DAY);
    overdue = daysLeft < 0 && !completed;
    if (!completed && daysLeft >= 0) {
      monthlyNeeded = Math.ceil(remaining / Math.max(1, Math.ceil(daysLeft / 30)));
    }
  }

  return {
    id: String(goal._id),
    name: goal.name,
    targetAmount: target,
    deadline: goal.deadline ? dateStr(goal.deadline) : null,
    saved,
    remaining,
    percent: Math.round((saved / target) * 100),
    completed,
    overdue,
    daysLeft,
    monthlyNeeded,
    contributions: [...goal.contributions]
      .sort((a, b) => b.date - a.date || String(b._id).localeCompare(String(a._id)))
      .map((c) => ({ id: String(c._id), amount: c.amount, date: dateStr(c.date), note: c.note })),
  };
}
