import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCompact, formatSom } from '../../utils/format.js';
import { monthLabel, shortMonthLabel } from '../../utils/month.js';

const tick = { fill: 'var(--chart-text)', fontSize: 11 };

function TrendTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-800">
      <p className="font-medium text-slate-500 dark:text-slate-400">{monthLabel(row.month)}</p>
      <p className="mt-1 tabular-nums">
        Daromad: <b className="text-emerald-700 dark:text-emerald-400">{formatSom(row.income)}</b>
      </p>
      <p className="tabular-nums">
        Xarajat: <b>{formatSom(row.expense)}</b>
      </p>
      <p className="mt-0.5 tabular-nums text-slate-500 dark:text-slate-400">Farq: {formatSom(row.balance, { sign: true })}</p>
    </div>
  );
}

// Oxirgi oylar bo'yicha daromad va xarajat. Daromad yashil, xarajat qizil: ikkalasi legendada ham nom bilan ko'rsatilgan.
export function TrendChart({ data }) {
  if (!data.some((m) => m.income > 0 || m.expense > 0)) {
    return <p className="py-10 text-center text-sm text-slate-500">Hali ma'lumot yo'q</p>;
  }
  const rows = data.map((m) => ({ ...m, label: shortMonthLabel(m.month) }));

  return (
    <>
      <div className="h-56" role="img" aria-label="Oxirgi oylardagi daromad va xarajat grafigi">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barGap={2} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={tick} />
            <YAxis tickFormatter={formatCompact} width={62} tickLine={false} axisLine={false} tick={tick} />
            <Tooltip cursor={{ fill: 'var(--chart-grid)', opacity: 0.6 }} content={<TrendTooltip />} />
            <Bar dataKey="income" name="Daromad" fill="var(--series-income)" radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
            <Bar dataKey="expense" name="Xarajat" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <i className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: 'var(--series-income)' }} /> Daromad
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: 'var(--series-1)' }} /> Xarajat
        </span>
      </div>
    </>
  );
}
