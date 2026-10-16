import { formatSom } from '../utils/format.js';

export function StatCard({ label, value, tone = 'default', loading }) {
  const color =
    tone === 'income'
      ? 'text-emerald-700 dark:text-emerald-400'
      : tone === 'negative'
        ? 'text-red-600 dark:text-red-400'
        : '';
  return (
    <div className="card">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      {loading ? (
        <div className="mt-2 h-7 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      ) : (
        <p className={`mt-1 text-lg font-bold tabular-nums [overflow-wrap:anywhere] sm:text-2xl ${color}`}>{formatSom(value)}</p>
      )}
    </div>
  );
}
