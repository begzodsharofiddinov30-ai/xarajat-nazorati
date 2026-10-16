import { CATEGORY_ICONS, CATEGORY_LABELS } from '../../utils/categories.js';
import { formatSom } from '../../utils/format.js';
import { currentMonth, todayStr } from '../../utils/month.js';
import { ArrowDownIcon, ArrowUpIcon, CalendarIcon, PieIcon, TrendIcon } from '../icons.jsx';

function Insight({ Icon, tint, label, value, hint }) {
  return (
    <div className="card flex items-start gap-3 p-4">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${tint}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-0.5 truncate text-base font-semibold tabular-nums">{value}</p>
        {hint && <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</div>}
      </div>
    </div>
  );
}

// Oyning nechta kuni o'tganini hisoblaydi: o'tgan oylar uchun hammasi, kelajak oylar uchun 0.
function elapsedDays(month, daily) {
  const now = currentMonth();
  if (month > now) return 0;
  if (month < now) return daily.length;
  return Number(todayStr().slice(8, 10));
}

export function InsightCards({ month, summary, previous }) {
  if (!summary) {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-[84px] animate-pulse" />
        ))}
      </div>
    );
  }

  const days = elapsedDays(month, summary.daily);
  const avg = days ? Math.round(summary.expense / days) : 0;
  const top = summary.byCategory[0];
  const topShare = top && summary.expense ? Math.round((top.total / summary.expense) * 100) : 0;

  const prev = previous?.expense ?? 0;
  const change = prev > 0 ? Math.round(((summary.expense - prev) / prev) * 100) : null;

  let trend;
  if (change === null) {
    trend = { value: '—', hint: "O'tgan oy bilan taqqoslash uchun ma'lumot yo'q" };
  } else if (change === 0) {
    trend = { value: "O'zgarmadi", hint: "O'tgan oy bilan bir xil" };
  } else {
    const up = change > 0;
    const Arrow = up ? ArrowUpIcon : ArrowDownIcon;
    trend = {
      value: (
        <span className={`inline-flex items-center gap-1 ${up ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
          <Arrow className="h-4 w-4" />
          {Math.abs(change)}% {up ? "ko'p" : 'kam'}
        </span>
      ),
      hint: `O'tgan oy: ${formatSom(prev)}`,
    };
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Insight
        Icon={CalendarIcon}
        tint="bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
        label="Kunlik o'rtacha xarajat"
        value={days ? formatSom(avg) : '—'}
        hint={days ? `${days} kun bo'yicha` : 'Oy hali boshlanmagan'}
      />
      <Insight
        Icon={PieIcon}
        tint="bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
        label="Eng katta xarajat"
        value={top ? `${CATEGORY_ICONS[top.category]} ${CATEGORY_LABELS[top.category]}` : '—'}
        hint={top ? `${formatSom(top.total)} · ${topShare}%` : "Xarajat yo'q"}
      />
      <Insight
        Icon={TrendIcon}
        tint="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
        label="O'tgan oyga nisbatan"
        value={trend.value}
        hint={trend.hint}
      />
    </div>
  );
}
