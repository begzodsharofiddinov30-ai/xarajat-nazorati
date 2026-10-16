import { CATEGORY_ICONS, CATEGORY_LABELS } from '../../utils/categories.js';
import { formatSom } from '../../utils/format.js';

// Kategoriyalar bo'yicha xarajat: ikonka, nom, summa va ulush. Bitta rang, uzunlik = summa
// (eng kattasiga nisbatan), shuning uchun 9 ta kategoriya ham rang bilan adashtirilmaydi.
export function CategoryBreakdown({ data, total }) {
  if (!data.length) {
    return <p className="py-10 text-center text-sm text-slate-500">Bu oyda xarajat yo'q</p>;
  }
  const max = data[0].total;

  return (
    <ul className="space-y-3.5">
      {data.map((d) => {
        const share = total ? Math.round((d.total / total) * 100) : 0;
        return (
          <li key={d.category} className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-lg dark:bg-slate-800"
              aria-hidden="true"
            >
              {CATEGORY_ICONS[d.category]}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium">{CATEGORY_LABELS[d.category] ?? d.category}</span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">{formatSom(d.total)}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(d.total / max) * 100}%`, backgroundColor: 'var(--series-1)' }}
                  />
                </div>
                <span className="w-9 shrink-0 text-right text-xs text-slate-500 tabular-nums dark:text-slate-400">
                  {share}%
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
