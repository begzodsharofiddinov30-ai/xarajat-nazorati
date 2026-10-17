import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { loansApi } from '../api/loans.js';
import { recurringApi } from '../api/recurring.js';
import { LoanForm, LoanPayForm } from '../components/LoanForm.jsx';
import { ConfirmDialog } from '../components/Modal.jsx';
import { AlertIcon, ChevronLeftIcon, PencilIcon, PlusIcon, RepeatIcon, TrashIcon } from '../components/icons.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { formatSom } from '../utils/format.js';
import { LOAN_KINDS, LOAN_METHODS } from '../utils/loan.js';
import { dateLabel, todayStr } from '../utils/month.js';
import { ProgressBar, StatusBadge } from './Loans.jsx';

const ROW_STATUS = {
  paid: { label: "To'langan", cls: 'text-emerald-700 dark:text-emerald-400' },
  overdue: { label: 'Kechikkan', cls: 'text-red-600 dark:text-red-400' },
  upcoming: { label: 'Kutilmoqda', cls: 'text-slate-500 dark:text-slate-400' },
  closed: { label: 'Yopilgan', cls: 'text-slate-400' },
};

function Stat({ label, value, sub, danger }) {
  return (
    <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800/70">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-0.5 font-semibold tabular-nums ${danger ? 'text-red-600 dark:text-red-400' : ''}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
    </div>
  );
}

const loanBody = (l, patch = {}) => ({
  name: l.name,
  lender: l.lender,
  kind: l.kind,
  principal: l.principal,
  annualRate: l.annualRate,
  termMonths: l.termMonths,
  firstPaymentDate: l.firstPaymentDate,
  method: l.method,
  closed: l.closed,
  ...patch,
});

export default function LoanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const loan = useAsync(() => loansApi.get(id), [id]);
  const [modal, setModal] = useState(null); // 'pay' | 'edit' | 'delete'
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);

  if (loan.error) {
    return (
      <div className="card text-center text-sm">
        <p className="text-red-600 dark:text-red-400">{loan.error.message}</p>
        <Link to="/loans" className="btn-secondary mt-3">
          Kreditlarga qaytish
        </Link>
      </div>
    );
  }
  if (!loan.data) return <div className="card h-64 animate-pulse" />;

  const l = loan.data;
  const today = todayStr();
  const isClosed = l.status === 'closed';
  // Avtomatik to'lov: bugundan keyingi birinchi to'lanmagan oydan oxirgi to'lovgacha, har oy bir xil summa.
  const autoStart = l.schedule.find((r, i) => i >= l.paidCount && r.date >= today);
  const canAutoPay = !isClosed && !l.autoPay && (l.method === 'annuity' || !l.annualRate) && autoStart;

  async function run(fn, message) {
    setBusy(true);
    try {
      await fn();
      if (message) toast(message);
      loan.reload();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  const enableAutoPay = () =>
    run(
      () =>
        recurringApi.create({
          type: 'expense',
          category: 'loan',
          loan: l.id,
          amount: l.monthlyPayment,
          note: `${l.name}: oylik to'lov`,
          frequency: 'monthly',
          startDate: autoStart.date,
          endDate: l.lastPaymentDate,
          active: true,
        }),
      `Avtomatik to'lov yoqildi: ${dateLabel(autoStart.date)} dan har oy`,
    );

  const toggleClosed = () =>
    run(() => loansApi.update(l.id, loanBody(l, { closed: !l.closed })), l.closed ? 'Kredit qayta ochildi' : 'Kredit yopildi');

  async function remove() {
    setBusy(true);
    try {
      await loansApi.remove(l.id);
      toast("Kredit o'chirildi. To'lovlar xarajatlarda saqlanib qoldi");
      navigate('/loans');
    } catch (err) {
      toast(err.message, 'error');
      setBusy(false);
    }
  }

  // Jadval uzun bo'lsa: to'langanlardan oxirgi 2 tasi va keyingi 6 oy ko'rsatiladi.
  const from = Math.max(0, l.paidCount - 2);
  const rows = showAll ? l.schedule : l.schedule.slice(from, from + 8);

  return (
    <div className="space-y-4">
      <Link to="/loans" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
        <ChevronLeftIcon className="h-4 w-4" /> Kreditlar
      </Link>

      <section className="card">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-2xl dark:bg-slate-800" aria-hidden="true">
            {l.kind === 'installment' ? '🛍️' : '🏦'}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-semibold">{l.name}</h1>
              <StatusBadge status={l.status} />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{[LOAN_KINDS[l.kind], l.lender].filter(Boolean).join(' · ')}</p>
          </div>
          <div className="-mt-1 -mr-2 flex shrink-0">
            <button className="btn-icon" onClick={() => setModal('edit')} aria-label="Tahrirlash">
              <PencilIcon className="h-4 w-4" />
            </button>
            <button className="btn-icon hover:text-red-600 dark:hover:text-red-400" onClick={() => setModal('delete')} aria-label="O'chirish">
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">Qolgan qarz</p>
          <p className="text-3xl font-bold tabular-nums">{formatSom(l.remaining)}</p>
          <div className="mt-3">
            <ProgressBar percent={l.percent} status={l.status} />
            <p className="mt-1.5 flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>To'langan: {formatSom(l.paid)}</span>
              <span>Jami: {formatSom(l.totalToPay)}</span>
            </p>
          </div>
        </div>

        {l.status === 'overdue' && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-300">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {l.overdueCount} oylik to'lov kechikkan: {formatSom(l.overdueAmount)}. Iloji boricha tezroq to'lang, bank jarima hisoblashi mumkin.
            </span>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Stat label="Oylik to'lov" value={formatSom(l.monthlyPayment)} sub={l.method === 'differentiated' && l.annualRate ? 'Har oy kamayib boradi' : undefined} />
          {l.next ? (
            <Stat label={`Keyingi to'lov (${l.next.n}-oy)`} value={formatSom(l.next.amount)} sub={dateLabel(l.next.date)} danger={l.next.date < today} />
          ) : (
            <Stat label="Keyingi to'lov" value="—" />
          )}
          <Stat label="Asosiy qarz qoldig'i" value={formatSom(l.remainingPrincipal)} />
          <Stat label="Jami foiz" value={formatSom(l.totalInterest)} sub={l.annualRate ? `${String(l.annualRate).replace('.', ',')}% yillik` : 'Foizsiz'} />
          <Stat label="Muddat" value={`${l.paidCount}/${l.termMonths} oy`} sub={`${dateLabel(l.lastPaymentDate)} gacha`} />
          <Stat label="Kredit summasi" value={formatSom(l.principal)} sub={l.annualRate ? LOAN_METHODS[l.method].split(' ')[0] : undefined} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {!isClosed && (
            <button className="btn-primary flex-1 whitespace-nowrap sm:flex-none" onClick={() => setModal('pay')}>
              <PlusIcon className="h-4 w-4" /> To'lov qo'shish
            </button>
          )}
          {canAutoPay && (
            <button className="btn-secondary flex-1 whitespace-nowrap sm:flex-none" onClick={enableAutoPay} disabled={busy}>
              <RepeatIcon className="h-4 w-4" /> Har oy avtomatik
            </button>
          )}
          {/* To'lovlar bilan to'liq yopilgan kreditda bu tugma kerak emas. */}
          {(l.closed || !isClosed) && (
            <button
              className="btn-secondary whitespace-nowrap"
              onClick={toggleClosed}
              disabled={busy}
              title={l.closed ? undefined : 'Kredit muddatidan oldin yopilgan bo\'lsa belgilang'}
            >
              {l.closed ? 'Qayta ochish' : 'Kreditni yopish'}
            </button>
          )}
        </div>

        {l.autoPay && (
          <Link
            to="/recurring"
            className="mt-3 flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-xs text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <RepeatIcon className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">
              {l.autoPay.active
                ? `Avtomatik to'lov: har oy ${formatSom(l.autoPay.amount)}${l.autoPay.nextDate ? ` · keyingisi ${dateLabel(l.autoPay.nextDate)}` : ''}`
                : "Avtomatik to'lov pauzada"}
            </span>
            <span className="shrink-0 font-semibold">Boshqarish</span>
          </Link>
        )}
      </section>

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">To'lov jadvali</h2>
          {l.schedule.length > 8 && (
            <button className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400" onClick={() => setShowAll((s) => !s)}>
              {showAll ? 'Qisqartirish' : `Hammasi (${l.schedule.length})`}
            </button>
          )}
        </div>
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
                <th className="py-2 pr-2 font-medium">№</th>
                <th className="py-2 pr-2 font-medium">Sana</th>
                <th className="py-2 pr-2 text-right font-medium">To'lov</th>
                <th className="py-2 pr-2 text-right font-medium">Asosiy</th>
                <th className="py-2 pr-2 text-right font-medium">Foiz</th>
                <th className="py-2 pr-2 text-right font-medium">Qoldiq</th>
                <th className="py-2 text-right font-medium">Holat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((r) => (
                <tr key={r.n} className={`tabular-nums ${l.next?.n === r.n ? 'bg-brand-500/5' : ''} ${r.status === 'paid' ? 'text-slate-400 dark:text-slate-500' : ''}`}>
                  <td className="py-2 pr-2">{r.n}</td>
                  <td className="py-2 pr-2 whitespace-nowrap">{dateLabel(r.date)}</td>
                  <td className="py-2 pr-2 text-right font-semibold whitespace-nowrap">{formatSom(r.payment)}</td>
                  <td className="py-2 pr-2 text-right whitespace-nowrap">{formatSom(r.principal)}</td>
                  <td className="py-2 pr-2 text-right whitespace-nowrap">{formatSom(r.interest)}</td>
                  <td className="py-2 pr-2 text-right whitespace-nowrap">{formatSom(r.balance)}</td>
                  <td className={`py-2 text-right text-xs font-medium whitespace-nowrap ${ROW_STATUS[r.status].cls}`}>{ROW_STATUS[r.status].label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2 className="mb-3 font-semibold">To'lovlar tarixi</h2>
        {l.payments.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Hali to'lov qo'shilmagan.</p>
        ) : (
          <ul className="-my-2 divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {l.payments.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2">
                <span className="w-24 shrink-0 text-slate-500 dark:text-slate-400">{dateLabel(p.date)}</span>
                <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">
                  {p.recurring && <RepeatIcon className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />}
                  {p.note}
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{formatSom(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {modal === 'pay' && <LoanPayForm loan={l} onClose={() => setModal(null)} onSaved={loan.reload} />}
      {modal === 'edit' && <LoanForm initial={l} onClose={() => setModal(null)} onSaved={loan.reload} />}
      {modal === 'delete' && (
        <ConfirmDialog
          title="Kreditni o'chirish"
          message={`"${l.name}" o'chiriladi. Unga qilingan to'lovlar xarajatlarda qoladi, avtomatik to'lov esa to'xtatiladi.`}
          onConfirm={remove}
          onClose={() => setModal(null)}
          busy={busy}
        />
      )}
    </div>
  );
}
