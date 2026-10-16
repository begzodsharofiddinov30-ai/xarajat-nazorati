import { formatSom } from '../../utils/format.js';

export function ChartTooltip({ active, payload, title, extra }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-800">
      <p className="font-medium text-slate-500 dark:text-slate-400">{title(row)}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
        {formatSom(row.total)}
      </p>
      {extra && <p className="text-slate-500 dark:text-slate-400">{extra(row)}</p>}
    </div>
  );
}
