import { useState } from 'react';
import { Link } from 'react-router';
import { budgetsApi } from '../api/budgets.js';
import { summaryApi } from '../api/summary.js';
import { transactionsApi } from '../api/transactions.js';
import { BudgetProgress } from '../components/BudgetProgress.jsx';
import { CategoryChart } from '../components/charts/CategoryChart.jsx';
import { DailyChart } from '../components/charts/DailyChart.jsx';
import { PlusIcon } from '../components/icons.jsx';
import { MonthPicker } from '../components/MonthPicker.jsx';
import { StatCard } from '../components/StatCard.jsx';
import { TransactionForm } from '../components/TransactionForm.jsx';
import { TransactionItem } from '../components/TransactionItem.jsx';
import { useMonth } from '../context/MonthContext.jsx';
import { useAsync } from '../hooks/useAsync.js';

const STATUS_ORDER = { exceeded: 0, warning: 1, ok: 2 };

function Section({ title, link, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        {link && (
          <Link to={link.to} className="text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400">
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
    <div className="card mb-4 flex items-center justify-between gap-3 border-red-200 text-sm text-red-700 dark:border-red-900 dark:text-red-300">
      <span>{error.message}</span>
      <button className="btn-secondary py-1.5" onClick={onRetry}>
        Qayta urinish
      </button>
    </div>
  );
}

export default function Dashboard() {
  const { month } = useMonth();
  const [formOpen, setFormOpen] = useState(false);

  const summary = useAsync(() => summaryApi.get(month), [month]);
  const budgets = useAsync(() => budgetsApi.list(month), [month]);
  const recent = useAsync(() => transactionsApi.list({ month, limit: 5 }), [month]);

  const reloadAll = () => {
    summary.reload();
    budgets.reload();
    recent.reload();
  };

  const s = summary.data;
  const topBudgets = [...(budgets.data ?? [])]
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.percent - a.percent)
    .slice(0, 4);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <MonthPicker />
        <button className="btn-primary" onClick={() => setFormOpen(true)}>
          <PlusIcon className="h-4 w-4" /> Qo'shish
        </button>
      </div>

      {summary.error && <ErrorBox error={summary.error} onRetry={reloadAll} />}

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label="Daromad" value={s?.income ?? 0} tone="income" loading={!s} />
        <StatCard label="Xarajat" value={s?.expense ?? 0} loading={!s} />
        <div className="col-span-2 md:col-span-1">
          <StatCard label="Balans" value={s?.balance ?? 0} tone={s?.balance < 0 ? 'negative' : 'default'} loading={!s} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Kategoriyalar bo'yicha xarajat">
          {s ? <CategoryChart data={s.byCategory} total={s.expense} /> : <div className="h-48" />}
        </Section>

        <Section title="Kunlik xarajatlar">
          {s ? <DailyChart data={s.daily} /> : <div className="h-56" />}
        </Section>

        <Section title="Budjetlar" link={{ to: '/budgets', label: 'Barchasi' }}>
          {budgets.data?.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              Hali limit qo'yilmagan.{' '}
              <Link to="/budgets" className="font-medium text-emerald-600 dark:text-emerald-400">
                Limit qo'yish
              </Link>
            </p>
          ) : (
            <div className="space-y-4">
              {topBudgets.map((b) => (
                <BudgetProgress key={b.category} budget={b} compact />
              ))}
            </div>
          )}
        </Section>

        <Section title="So'nggi tranzaksiyalar" link={{ to: '/transactions', label: 'Barchasi' }}>
          {recent.data?.data.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Bu oyda tranzaksiya yo'q</p>
          ) : (
            <ul className="-my-3 divide-y divide-slate-100 dark:divide-slate-800">
              {recent.data?.data.map((tx) => (
                <TransactionItem key={tx.id} tx={tx} />
              ))}
            </ul>
          )}
        </Section>
      </div>

      {formOpen && <TransactionForm onClose={() => setFormOpen(false)} onSaved={reloadAll} />}
    </>
  );
}
