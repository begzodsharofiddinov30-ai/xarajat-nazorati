import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCompact } from '../../utils/format.js';
import { dateLabel, dayOf } from '../../utils/month.js';
import { ChartTooltip } from './ChartTooltip.jsx';

const tick = { fill: 'var(--chart-text)', fontSize: 11 };

export function DailyChart({ data }) {
  const rows = data.map((d) => ({ ...d, day: dayOf(d.date) }));
  const hasData = rows.some((r) => r.total > 0);

  if (!hasData) {
    return <p className="py-10 text-center text-sm text-slate-500">Bu oyda xarajat yo'q</p>;
  }

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="15%">
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="day" tickLine={false} axisLine={false} tick={tick} interval="preserveStartEnd" minTickGap={6} />
          <YAxis tickFormatter={formatCompact} width={52} tickLine={false} axisLine={false} tick={tick} />
          <Tooltip
            cursor={{ fill: 'var(--chart-grid)', opacity: 0.6 }}
            content={<ChartTooltip title={(r) => dateLabel(r.date)} />}
          />
          <Bar dataKey="total" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
