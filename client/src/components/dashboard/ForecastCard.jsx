import { CATEGORY_ICONS, CATEGORY_LABELS } from '../../utils/categories.js';
import { formatSom } from '../../utils/format.js';
import { AlertIcon, TrendIcon } from '../icons.jsx';

const CONFIDENCE = {
  low: "Oy endi boshlandi, taxmin hali aniq emas",
  medium: "Taxmin o'rtacha aniqlikda",
  high: 'Taxmin yetarlicha aniq',
};

// Oy oxirigacha xarajat prognozi: bugungacha bo'lgan kunlik o'rtacha bo'yicha, takroriy to'lovlar alohida hisoblangan.
export function ForecastCard({ summary, previous, budgets = [] }) {
  const f = summary?.forecast;
  if (!f) return null;

  const done = f.projectedExpense ? Math.min(100, Math.round((summary.expense / f.projectedExpense) * 100)) : 100;
  const prev = previous?.expense ?? 0;
  const diff = prev > 0 ? Math.round(((f.projectedExpense - prev) / prev) * 100) : null;
  const risky = budgets.filter((b) => b.projectedExceeds);

  return (
    <section className="card" aria-label="Oy oxirigacha taxmin">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          <TrendIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Oy oxirigacha taxmin</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{CONFIDENCE[f.confidence]}</p>
        </div>
      </div>

      <p className="mt-4 text-2xl font-bold tabular-nums">~{formatSom(f.projectedExpense)}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Shu tempda oy oxirigacha jami xarajat
        {diff !== null && diff !== 0 && (
          <>
            {' '}
            (o'tgan oydan{' '}
            <b className={diff > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}>
              {Math.abs(diff)}% {diff > 0 ? "ko'p" : 'kam'}
            </b>
            )
          </>
        )}
      </p>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={done}
        aria-label={`Taxminiy xarajatning ${done}% i sarflangan`}
      >
        <div className="h-full rounded-full" style={{ width: `${done}%`, backgroundColor: 'var(--series-1)' }} />
      </div>
      <div className="mt-1 flex justify-between text-xs text-slate-500 tabular-nums dark:text-slate-400">
        <span>Hozirgacha: {formatSom(summary.expense)}</span>
        <span>{f.daysRemaining} kun qoldi</span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Kunlik o'rtacha (takroriysiz)</dt>
          <dd className="font-semibold tabular-nums">{formatSom(f.dailyAverage)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Kutilayotgan takroriy to'lovlar</dt>
          <dd className="font-semibold tabular-nums">{formatSom(f.upcomingRecurring)}</dd>
        </div>
      </dl>

      {risky.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
          {risky.map((b) => (
            <li key={b.category} className="flex items-start gap-2">
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--status-warning)' }} />
              <span>
                <b>
                  {CATEGORY_ICONS[b.category]} {CATEGORY_LABELS[b.category]}
                </b>
                : shu tempda ~{formatSom(b.projected)} bo'ladi, limit {formatSom(b.limit)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
