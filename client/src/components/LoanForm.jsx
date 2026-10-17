import { useState } from 'react';
import { loansApi } from '../api/loans.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatSom } from '../utils/format.js';
import { LOAN_KINDS, LOAN_METHODS, buildSchedule } from '../utils/loan.js';
import { dateLabel, todayStr } from '../utils/month.js';
import { AmountInput } from './AmountInput.jsx';
import { Modal } from './Modal.jsx';

const TERMS = [3, 6, 12, 24, 36, 60];

function FieldError({ children }) {
  return children ? <p className="mt-1 text-sm text-red-600 dark:text-red-400">{children}</p> : null;
}

// "24,5" yoki "24.5" -> 24.5
const parseRate = (s) => {
  const n = Number(String(s).replace(',', '.').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : NaN;
};

export function LoanForm({ initial, onClose, onSaved }) {
  const toast = useToast();
  const editing = Boolean(initial?.id);
  const [form, setForm] = useState(() => ({
    name: initial?.name ?? '',
    lender: initial?.lender ?? '',
    kind: initial?.kind ?? 'credit',
    principal: initial?.principal ?? 0,
    rate: initial?.annualRate != null ? String(initial.annualRate).replace('.', ',') : '',
    termMonths: initial?.termMonths ?? 12,
    firstPaymentDate: initial?.firstPaymentDate ?? todayStr(),
    method: initial?.method ?? 'annuity',
  }));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const rate = form.rate === '' ? 0 : parseRate(form.rate);
  const term = Number(form.termMonths);
  const preview =
    form.principal > 0 && term >= 1 && term <= 360 && rate >= 0 && rate <= 200
      ? buildSchedule({ principal: form.principal, annualRate: rate, termMonths: term, firstPaymentDate: form.firstPaymentDate, method: rate ? form.method : 'annuity' })
      : [];
  const total = preview.reduce((s, r) => s + r.payment, 0);

  async function submit(e) {
    e.preventDefault();
    if (!form.principal) return setErrors({ principal: 'Summani kiriting' });
    if (Number.isNaN(rate)) return setErrors({ annualRate: "Foiz noto'g'ri" });
    setBusy(true);
    setErrors({});
    const body = {
      name: form.name,
      lender: form.lender,
      kind: form.kind,
      principal: form.principal,
      annualRate: rate,
      termMonths: term,
      firstPaymentDate: form.firstPaymentDate,
      method: rate ? form.method : 'annuity',
      closed: initial?.closed ?? false,
    };
    try {
      const saved = editing ? await loansApi.update(initial.id, body) : await loansApi.create(body);
      toast(editing ? 'Kredit yangilandi' : "Kredit qo'shildi");
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setErrors(err.code === 'VALIDATION_ERROR' ? err.fieldErrors : { form: err.message });
      setBusy(false);
    }
  }

  return (
    <Modal title={editing ? 'Kreditni tahrirlash' : "Kredit qo'shish"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="radiogroup">
          {Object.entries(LOAN_KINDS).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={form.kind === value}
              onClick={() => set({ kind: value, ...(value === 'installment' && !editing && form.rate === '' && { rate: '0' }) })}
              className={`rounded-lg py-2 text-sm font-semibold transition ${
                form.kind === value ? 'bg-white shadow-sm dark:bg-slate-900' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="ln-name">
              Nomi
            </label>
            <input id="ln-name" className="input" maxLength={40} placeholder={form.kind === 'credit' ? 'Masalan: Avtokredit' : 'Masalan: Telefon (nasiya)'} value={form.name} onChange={(e) => set({ name: e.target.value })} autoFocus={!editing} />
            <FieldError>{errors.name}</FieldError>
          </div>
          <div>
            <label className="label" htmlFor="ln-lender">
              {form.kind === 'credit' ? 'Bank' : "Do'kon / xizmat"} <span className="font-normal text-slate-400">(ixtiyoriy)</span>
            </label>
            <input id="ln-lender" className="input" maxLength={50} placeholder={form.kind === 'credit' ? 'Masalan: Kapitalbank' : 'Masalan: Uzum Nasiya'} value={form.lender} onChange={(e) => set({ lender: e.target.value })} />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="ln-principal">
            {form.kind === 'credit' ? 'Kredit summasi' : 'Mahsulot narxi (qarz summasi)'}
          </label>
          <AmountInput id="ln-principal" value={form.principal} onChange={(principal) => set({ principal })} invalid={Boolean(errors.principal)} />
          <FieldError>{errors.principal}</FieldError>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="ln-rate">
              Yillik foiz, %
            </label>
            <input id="ln-rate" className="input tabular-nums" inputMode="decimal" placeholder="Masalan: 24" value={form.rate} onChange={(e) => set({ rate: e.target.value })} />
            <FieldError>{errors.annualRate}</FieldError>
          </div>
          <div>
            <label className="label" htmlFor="ln-term">
              Muddat, oy
            </label>
            <input id="ln-term" className="input tabular-nums" inputMode="numeric" value={form.termMonths} onChange={(e) => set({ termMonths: e.target.value.replace(/\D/g, '').slice(0, 3) })} />
            <FieldError>{errors.termMonths}</FieldError>
          </div>
        </div>
        <div className="-mt-2 flex flex-wrap gap-2">
          {TERMS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set({ termMonths: t })}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                term === t
                  ? 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-500/10 dark:text-brand-300'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {t} oy
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="ln-first">
              Birinchi to'lov sanasi
            </label>
            <input id="ln-first" type="date" className="input" value={form.firstPaymentDate} onChange={(e) => set({ firstPaymentDate: e.target.value })} />
            <FieldError>{errors.firstPaymentDate}</FieldError>
          </div>
          {rate > 0 && (
            <div>
              <label className="label" htmlFor="ln-method">
                Hisoblash usuli
              </label>
              <select id="ln-method" className="input" value={form.method} onChange={(e) => set({ method: e.target.value })}>
                {Object.entries(LOAN_METHODS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {preview.length > 0 && (
          <div className="rounded-2xl bg-slate-100 p-4 text-sm dark:bg-slate-800">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400">Oylik to'lov</span>
              <span className="text-lg font-bold tabular-nums">
                {form.method === 'differentiated' && rate > 0
                  ? `${formatSom(preview[0].payment)} → ${formatSom(preview.at(-1).payment)}`
                  : formatSom(preview[0].payment)}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span>
                Jami foiz: <b className="tabular-nums">{formatSom(total - form.principal)}</b>
              </span>
              <span className="text-right">
                Jami: <b className="tabular-nums">{formatSom(total)}</b>
              </span>
              <span className="col-span-2">Oxirgi to'lov: {dateLabel(preview.at(-1).date)}</span>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Bank jadvali bilan bir necha so'm farq qilishi mumkin (yaxlitlash). Bank shartnomasidagi oylik to'lov asosiy hisoblanadi.
            </p>
          </div>
        )}

        <FieldError>{errors.form}</FieldError>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>
            Bekor qilish
          </button>
          <button className="btn-primary flex-1" disabled={busy || !form.name.trim()}>
            {busy ? 'Saqlanmoqda…' : 'Saqlash'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// To'lov qo'shish: summa standart holda keyingi to'lov (qisman yoki ko'proq to'lash ham mumkin).
export function LoanPayForm({ loan, onClose, onSaved }) {
  const toast = useToast();
  const [amount, setAmount] = useState(loan.next?.amount ?? 0);
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!amount) return setErrors({ amount: 'Summani kiriting' });
    setBusy(true);
    setErrors({});
    try {
      const res = await loansApi.pay(loan.id, { amount, date, note });
      toast(res.warning?.message ?? "To'lov qo'shildi", res.warning ? 'warning' : 'success');
      onSaved();
      onClose();
    } catch (err) {
      setErrors(err.code === 'VALIDATION_ERROR' ? err.fieldErrors : { form: err.message });
      setBusy(false);
    }
  }

  const quick = [
    loan.next && ['Keyingi to\'lov', loan.next.amount],
    loan.remaining && loan.remaining !== loan.next?.amount && ["Hammasini yopish", loan.remaining],
  ].filter(Boolean);

  return (
    <Modal title="Kredit to'lovi" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="rounded-2xl bg-slate-100 p-3 text-sm dark:bg-slate-800">
          <p className="font-semibold">{loan.name}</p>
          <p className="text-slate-500 dark:text-slate-400">
            Qolgan qarz: <b className="tabular-nums">{formatSom(loan.remaining)}</b>
            {loan.next && ` · ${loan.next.n}-to'lov ${dateLabel(loan.next.date)}`}
          </p>
        </div>
        <div>
          <label className="label" htmlFor="lp-amount">
            Summa
          </label>
          <AmountInput id="lp-amount" value={amount} onChange={setAmount} autoFocus invalid={Boolean(errors.amount)} />
          <div className="mt-2 flex flex-wrap gap-2">
            {quick.map(([label, value]) => (
              <button key={label} type="button" onClick={() => setAmount(value)} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                {label}: {formatSom(value)}
              </button>
            ))}
          </div>
          <FieldError>{errors.amount}</FieldError>
        </div>
        <div>
          <label className="label" htmlFor="lp-date">
            Sana
          </label>
          <input id="lp-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="lp-note">
            Izoh <span className="font-normal text-slate-400">(ixtiyoriy)</span>
          </label>
          <input id="lp-note" className="input" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <FieldError>{errors.form}</FieldError>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>
            Bekor qilish
          </button>
          <button className="btn-primary flex-1" disabled={busy}>
            {busy ? 'Saqlanmoqda…' : "To'lash"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
