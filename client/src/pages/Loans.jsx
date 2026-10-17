import { useState } from 'react';
import { Link } from 'react-router';
import { loansApi } from '../api/loans.js';
import { LoanForm } from '../components/LoanForm.jsx';
import { AlertIcon, ChevronRightIcon, PlusIcon } from '../components/icons.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { formatSom } from '../utils/format.js';
import { LOAN_KINDS, LOAN_STATUS } from '../utils/loan.js';
import { dateLabel } from '../utils/month.js';

export function StatusBadge({ status }) {
  const s = LOAN_STATUS[status];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}>{s.label}</span>;
}

export function ProgressBar({ percent, status }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={`h-full rounded-full transition-all ${status === 'overdue' ? 'bg-red-500' : status === 'closed' ? 'bg-slate-400' : 'bg-emerald-500'}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function LoanCard({ loan }) {
  return (
    <li>
      <Link to={`/loans/${loan.id}`} className="card block transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xl dark:bg-slate-800" aria-hidden="true">
            {loan.kind === 'installment' ? '🛍️' : '🏦'}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-semibold">{loan.name}</p>
              <StatusBadge status={loan.status} />
            </div>
            <p className="truncate text-sm text-slate-500 dark:text-slate-400">
              {[LOAN_KINDS[loan.kind], loan.lender, loan.annualRate ? `${String(loan.annualRate).replace('.', ',')}%` : 'foizsiz'].filter(Boolean).join(' · ')}
            </p>
          </div>
          <ChevronRightIcon className="mt-1 h-5 w-5 shrink-0 text-slate-400" />
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Qolgan qarz</p>
            <p className="text-lg font-bold tabular-nums">{formatSom(loan.remaining)}</p>
          </div>
          {loan.next && (
            <div className="text-right">
              <p className={`text-xs ${loan.status === 'overdue' ? 'font-semibold text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {loan.status === 'overdue' ? `Kechikkan: ${loan.overdueCount} oy` : `Keyingi: ${dateLabel(loan.next.date)}`}
              </p>
              <p className="font-semibold tabular-nums">{formatSom(loan.status === 'overdue' ? loan.overdueAmount : loan.next.amount)}</p>
            </div>
          )}
        </div>
        <div className="mt-3">
          <ProgressBar percent={loan.percent} status={loan.status} />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {loan.paidCount}/{loan.termMonths} oy to'langan · {loan.percent}%
          </p>
        </div>
      </Link>
    </li>
  );
}

export default function Loans() {
  const list = useAsync(() => loansApi.list(), []);
  const [creating, setCreating] = useState(false);
  const [showClosed, setShowClosed] = useState(false);

  const loans = list.data?.data ?? [];
  const meta = list.data?.meta;
  const open = loans.filter((l) => l.status !== 'closed');
  const closed = loans.filter((l) => l.status === 'closed');

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Kreditlar</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Bank kreditlari va muddatli to'lovlar</p>
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <PlusIcon className="h-4 w-4" /> Kredit qo'shish
        </button>
      </div>

      {list.error ? (
        <div className="card text-center text-sm text-red-600 dark:text-red-400">
          {list.error.message}{' '}
          <button className="underline" onClick={list.reload}>
            Qayta urinish
          </button>
        </div>
      ) : list.loading && !list.data ? (
        <div className="space-y-3">
          <div className="card h-32 animate-pulse" />
          <div className="card h-44 animate-pulse" />
        </div>
      ) : loans.length === 0 ? (
        <div className="card py-12 text-center">
          <span className="text-3xl" aria-hidden="true">
            🏦
          </span>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Kredit yoki muddatli to'lovni qo'shing: oylik to'lov, to'lov jadvali va qolgan qarz avtomatik hisoblanadi, to'lov kuni o'tib ketsa ogohlantiramiz.
          </p>
          <button className="btn-primary mt-3" onClick={() => setCreating(true)}>
            <PlusIcon className="h-4 w-4" /> Birinchi kreditni qo'shish
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {meta.overdueCount > 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" />
              <p>
                {meta.overdueCount} ta kredit bo'yicha to'lov muddati o'tib ketgan. Kechikish uchun bank jarima hisoblashi mumkin.
              </p>
            </div>
          )}

          {open.length > 0 && (
            <section className="card grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Jami qolgan qarz</p>
                <p className="text-2xl font-bold tabular-nums">{formatSom(meta.remaining)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Navbatdagi to'lovlar jami</p>
                <p className="text-lg font-semibold tabular-nums">{formatSom(meta.monthlyPayment)}</p>
              </div>
              {meta.nextPayment && (
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Eng yaqin to'lov</p>
                  <p className="font-semibold">
                    {dateLabel(meta.nextPayment.date)} · <span className="tabular-nums">{formatSom(meta.nextPayment.amount)}</span>
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{meta.nextPayment.name}</p>
                </div>
              )}
            </section>
          )}

          <ul className="space-y-3">
            {open.map((l) => (
              <LoanCard key={l.id} loan={l} />
            ))}
          </ul>

          {closed.length > 0 && (
            <div>
              <button className="text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white" onClick={() => setShowClosed((s) => !s)}>
                {showClosed ? 'Yopilganlarni yashirish' : `Yopilgan kreditlar (${closed.length})`}
              </button>
              {showClosed && (
                <ul className="mt-3 space-y-3 opacity-80">
                  {closed.map((l) => (
                    <LoanCard key={l.id} loan={l} />
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {creating && <LoanForm onClose={() => setCreating(false)} onSaved={list.reload} />}
    </>
  );
}
