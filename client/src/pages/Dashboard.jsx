import { useState } from 'react';
import { Link } from 'react-router';
import { formatSom } from '../utils/format.js';
import { budgetsApi } from '../api/budgets.js';
import { summaryApi } from '../api/summary.js';
import { transactionsApi } from '../api/transactions.js';
import { BudgetProgress } from '../components/BudgetProgress.jsx';
import { CategoryBreakdown } from '../components/charts/CategoryBreakdown.jsx';
import { DailyChart } from '../components/charts/DailyChart.jsx';
import { TrendChart } from '../components/charts/TrendChart.jsx';
import { BalanceHero } from '../components/dashboard/BalanceHero.jsx';
import { ForecastCard } from '../components/dashboard/ForecastCard.jsx';
import { InsightCards } from '../components/dashboard/InsightCards.jsx';
import { WelcomeCard } from '../components/dashboard/WelcomeCard.jsx';
import { Fab } from '../components/Fab.jsx';
import { PlusIcon } from '../components/icons.jsx';
import { MonthPicker } from '../components/MonthPicker.jsx';
import { TransactionForm } from '../components/TransactionForm.jsx';
import { TransactionItem } from '../components/TransactionItem.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useMonth } from '../context/MonthContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { shiftMonth } from '../utils/month.js';

const STATUS_ORDER = { exceeded: 0, warning: 1, ok: 2 };

function Section({ title, subtitle, link, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        {link && (
          <Link
            to={link.to}
            className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            {link.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function ErrorBox({ error, onRetry }) {
  return (
    <div className="card flex items-center justify-between gap-3 border-red-200 text-sm text-red-700 dark:border-red-900 dark:text-red-300">
      <span>{error.message}</span>
      <button className="btn-secondary py-1.5" onClick={onRetry}>
        Qayta urinish
      </button>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { month } = useMonth();
  const [form, setForm] = useState(null); // null | { type? } — yangi tranzaksiya oynasi

  const summary = useAsync(() => summaryApi.get(month), [month]);
  const previous = useAsync(() => summaryApi.get(shiftMonth(month, -1)), [month]);
  const trend = useAsync(() => summaryApi.trend(month, 6), [month]);
  const budgets = useAsync(() => budgetsApi.list(month), [month]);
  const recent = useAsync(() => transactionsApi.list({ month, limit: 5 }), [month]);

  const reloadAll = () => {
    summary.reload();
    budgets.reload();
    recent.reload();
    trend.reload();
  };

  const s = summary.data;
  const empty = s && s.transactionCount === 0;
  const topBudgets = [...(budgets.data ?? [])]
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.percent - a.percent)
    .slice(0, 4);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthPicker />
        <button className="btn-primary hidden md:inline-flex" onClick={() => setForm({})}>
          <PlusIcon className="h-4 w-4" /> Qo'shish
        </button>
      </div>

      {summary.error && <ErrorBox error={summary.error} onRetry={reloadAll} />}

      <div className={`grid gap-4 ${empty ? '' : 'lg:grid-cols-[1.4fr_1fr]'}`}>
        <BalanceHero name={user?.name} month={month} summary={s} />
        {!empty && (
        <Section title="Budjetlar" subtitle="Oylik limitlar holati" link={{ to: '/budgets', label: 'Barchasi' }}>
          {budgets.data?.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-4 text-center">
              <span className="text-3xl" aria-hidden="true">🎯</span>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Limit qo'ysangiz, oshib ketishidan oldin ogohlantiramiz.
              </p>
              <Link to="/budgets" className="btn-secondary mt-3 py-1.5">
                Limit qo'yish
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {topBudgets.map((b) => (
                <BudgetProgress key={b.category} budget={b} compact />
              ))}
            </div>
          )}
        </Section>
        )}
      </div>

      {empty ? (
        <WelcomeCard onAddIncome={() => setForm({ type: 'income', category: 'salary' })} onAddExpense={() => setForm({})} />
      ) : (
        <>
          <InsightCards month={month} summary={s} previous={previous.data} />

          <ForecastCard summary={s} previous={previous.data} budgets={budgets.data ?? []} />

          <Link to="/mobile" className="card flex items-center gap-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xl dark:bg-slate-800" aria-hidden="true">
              📱
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Mobil aloqa</span>
              <span className="block text-sm text-slate-500 dark:text-slate-400">Telefon balansi to'lovlari raqamlar bo'yicha</span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block font-semibold tabular-nums">{formatSom(s?.byCategory.find((c) => c.category === 'mobile')?.total ?? 0)}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">shu oy</span>
            </span>
          </Link>

          <div className="grid gap-4 md:grid-cols-2">
            <Section title="Kategoriyalar" subtitle="Bu oydagi xarajatlar taqsimoti">
              {s ? <CategoryBreakdown data={s.byCategory} total={s.expense} /> : <div className="h-48" />}
            </Section>

            <Section title="Kunlik xarajatlar" subtitle="Har bir kun bo'yicha">
              {s ? <DailyChart data={s.daily} /> : <div className="h-56" />}
            </Section>
          </div>

          <Section title="Oxirgi 6 oy" subtitle="Daromad va xarajat dinamikasi">
            {trend.data ? <TrendChart data={trend.data} /> : <div className="h-56" />}
          </Section>

          <Section title="So'nggi tranzaksiyalar" link={{ to: '/transactions', label: 'Barchasi' }}>
            <ul className="-my-3 divide-y divide-slate-100 dark:divide-slate-800">
              {recent.data?.data.map((tx) => (
                <TransactionItem key={tx.id} tx={tx} />
              ))}
            </ul>
          </Section>
        </>
      )}

      <Fab onClick={() => setForm({})} />
      {form && <TransactionForm initial={form} onClose={() => setForm(null)} onSaved={reloadAll} />}
    </div>
  );
}
