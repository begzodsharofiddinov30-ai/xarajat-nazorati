import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCompact, formatSom } from '../../utils/format.js';
import { dateLabel, dayOf, todayStr } from '../../utils/month.js';
import { ChartTooltip } from './ChartTooltip.jsx';

const tick = { fill: 'var(--chart-text)', fontSize: 11 };

// Bugungi kun to'liq rangda, qolgan kunlar och tusda; punktir chiziq — xarajat bo'lgan kunlar o'rtachasi.
export function DailyChart({ data }) {
  const today = todayStr();
  const rows = data.map((d) => ({ ...d, day: dayOf(d.date) }));
  const spendDays = rows.filter((r) => r.total > 0);

  if (!spendDays.length) {
    return <p className="py-10 text-center text-sm text-slate-500">Bu oyda xarajat yo'q</p>;
  }

  const avg = Math.round(spendDays.reduce((s, r) => s + r.total, 0) / spendDays.length);
  const hasToday = rows.some((r) => r.date === today);

  return (
    <>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 16, right: 4, bottom: 0, left: 0 }} barCategoryGap="18%">
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tick={tick} interval="preserveStartEnd" minTickGap={6} />
            <YAxis tickFormatter={formatCompact} width={62} tickLine={false} axisLine={false} tick={tick} />
            <Tooltip
              cursor={{ fill: 'var(--chart-grid)', opacity: 0.6 }}
              content={<ChartTooltip title={(r) => (r.date === today ? 'Bugun' : dateLabel(r.date))} />}
            />
            <ReferenceLine
              y={avg}
              stroke="var(--chart-text)"
              strokeDasharray="4 4"
              strokeOpacity={0.7}
              label={{ value: "o'rtacha", position: 'insideTopRight', fill: 'var(--chart-text)', fontSize: 11 }}
            />
            <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={16} isAnimationActive={false}>
              {rows.map((r) => (
                <Cell
                  key={r.date}
                  fill={!hasToday || r.date === today ? 'var(--series-1)' : 'var(--series-1-muted)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Xarajat qilingan kunlarda o'rtacha: <b className="font-semibold text-slate-700 dark:text-slate-200">{formatSom(avg)}</b>
        {hasToday && ' · to\'q rang — bugun'}
      </p>
    </>
  );
}
