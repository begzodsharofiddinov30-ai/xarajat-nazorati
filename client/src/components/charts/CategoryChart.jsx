import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CATEGORY_LABELS } from '../../utils/categories.js';
import { formatCompact, formatSom } from '../../utils/format.js';
import { ChartTooltip } from './ChartTooltip.jsx';

const ROW_HEIGHT = 36;
const tick = { fill: 'var(--chart-text)', fontSize: 12 };

// 9 ta kategoriyani pie chartda ranglar bilan ajratib bo'lmaydi, shuning uchun
// bitta rangli, kamayish tartibidagi gorizontal bar: uzunlik = summa.
export function CategoryChart({ data, total }) {
  if (!data.length) {
    return <p className="py-10 text-center text-sm text-slate-500">Bu oyda xarajat yo'q</p>;
  }

  const rows = data.map((d) => ({
    ...d,
    label: CATEGORY_LABELS[d.category] ?? d.category,
    share: total ? Math.round((d.total / total) * 100) : 0,
  }));

  return (
    <>
      <div style={{ height: rows.length * ROW_HEIGHT + 8 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 60, bottom: 4, left: 0 }} barCategoryGap={6}>
            <XAxis type="number" hide domain={[0, 'dataMax']} />
            <YAxis type="category" dataKey="label" width={100} tickLine={false} axisLine={false} tick={tick} />
            <Tooltip
              cursor={{ fill: 'var(--chart-grid)', opacity: 0.6 }}
              content={<ChartTooltip title={(r) => r.label} extra={(r) => `Jami xarajatning ${r.share}%`} />}
            />
            <Bar dataKey="total" fill="var(--series-1)" radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false}>
              <LabelList dataKey="total" position="right" formatter={formatCompact} style={{ ...tick, fontWeight: 500 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
          Jadval ko'rinishi
        </summary>
        <table className="mt-2 w-full tabular-nums">
          <tbody>
            {rows.map((r) => (
              <tr key={r.category} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-1.5">{r.label}</td>
                <td className="py-1.5 text-right">{formatSom(r.total)}</td>
                <td className="w-12 py-1.5 text-right text-slate-500">{r.share}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}
