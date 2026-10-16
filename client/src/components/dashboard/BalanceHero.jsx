import { formatSom } from '../../utils/format.js';
import { monthLabel } from '../../utils/month.js';
import { ArrowDownIcon, ArrowUpIcon } from '../icons.jsx';

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Xayrli tun';
  if (h < 12) return 'Xayrli tong';
  if (h < 18) return 'Xayrli kun';
  return 'Xayrli kech';
}

function Flow({ label, value, Icon }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-2xl bg-white/12 px-3 py-2.5 ring-1 ring-white/15 backdrop-blur">
      <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 sm:flex">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-white/75">{label}</p>
        <p className="text-sm font-semibold tabular-nums [overflow-wrap:anywhere]">{formatSom(value)}</p>
      </div>
    </div>
  );
}

export function BalanceHero({ name, month, summary }) {
  const firstName = name?.split(' ')[0];

  if (!summary) {
    return <div className="h-56 animate-pulse rounded-3xl bg-emerald-600/20 dark:bg-emerald-900/30" />;
  }

  const { income, expense, balance } = summary;
  const savedPct = income > 0 ? Math.round((balance / income) * 100) : null;
  const spentRatio = income > 0 ? Math.min(expense / income, 1) : expense > 0 ? 1 : 0;

  return (
    <section className="relative flex flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-5 text-white shadow-lg shadow-emerald-900/20 sm:p-6 dark:from-emerald-800 dark:via-emerald-900 dark:to-teal-950 dark:shadow-none">
      {/* Fondagi bezak doiralari */}
      <div className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-teal-300/20 blur-2xl" />

      <div className="relative flex flex-1 flex-col">
        <p className="text-sm text-white/80">
          {greeting()}
          {firstName && `, ${firstName}`} 👋
        </p>
        <p className="mt-4 text-xs font-medium tracking-wide text-white/70 uppercase">
          Balans · {monthLabel(month)}
        </p>
        <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums [overflow-wrap:anywhere] sm:text-4xl">
          {formatSom(balance)}
        </p>

        {savedPct !== null && (
          <p className="mt-1 text-sm text-white/80">
            {savedPct >= 0 ? `Daromadning ${savedPct}% tejaldi` : "Xarajat daromaddan oshib ketdi"}
          </p>
        )}

        <div
          className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/20"
          role="img"
          aria-label={`Daromadning ${Math.round(spentRatio * 100)}% sarflangan`}
        >
          <div className="h-full rounded-full bg-white/90" style={{ width: `${spentRatio * 100}%` }} />
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2 pt-4 sm:gap-3">
          <Flow label="Daromad" value={income} Icon={ArrowDownIcon} />
          <Flow label="Xarajat" value={expense} Icon={ArrowUpIcon} />
        </div>
      </div>
    </section>
  );
}
