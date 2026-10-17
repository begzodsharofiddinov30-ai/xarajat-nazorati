import { CATEGORY_ICONS, CATEGORY_LABELS } from '../utils/categories.js';
import { formatSom, groupDigits } from '../utils/format.js';
import { AlertIcon, CheckIcon } from './icons.jsx';

// Rang hech qachon yolg'iz ishlatilmaydi: har bir holat belgi va matn bilan birga chiqadi.
export const BUDGET_STATUS = {
  ok: { color: 'var(--status-good)', label: 'Me\'yorida', Icon: CheckIcon },
  warning: { color: 'var(--status-warning)', label: 'Limitga yaqin', Icon: AlertIcon },
  exceeded: { color: 'var(--status-critical)', label: 'Limitdan oshdi', Icon: AlertIcon },
};

export function BudgetProgress({ budget, compact = false, actions }) {
  const { category, limit, spent, remaining, percent, status, projected, projectedExceeds } = budget;
  const s = BUDGET_STATUS[status];

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <span aria-hidden="true">{CATEGORY_ICONS[category]}</span>
        <span className="flex-1 truncate text-sm font-medium">{CATEGORY_LABELS[category]}</span>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
          <s.Icon className="h-3.5 w-3.5" style={{ color: s.color }} />
          {percent}%{!compact && ` · ${s.label}`}
        </span>
        {actions}
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(percent, 100)}
        aria-label={`${CATEGORY_LABELS[category]}: ${percent}%, ${s.label}`}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: s.color }}
        />
      </div>
      <div className="mt-1 flex justify-between text-xs tabular-nums text-slate-500 dark:text-slate-400">
        <span>
          {groupDigits(spent)} / {formatSom(limit)}
        </span>
        <span className={remaining < 0 ? 'font-medium text-red-600 dark:text-red-400' : ''}>
          {remaining < 0 ? `${formatSom(-remaining)} ortiqcha` : `${formatSom(remaining)} qoldi`}
        </span>
      </div>
      {projectedExceeds && (
        <p className="mt-1 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
          <AlertIcon className="h-3.5 w-3.5 shrink-0" />
          Shu tempda oy oxirida ~{formatSom(projected)} bo'ladi, limitdan oshishi mumkin
        </p>
      )}
    </div>
  );
}
