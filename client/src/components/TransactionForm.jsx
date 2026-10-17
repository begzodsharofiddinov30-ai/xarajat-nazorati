import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { loansApi } from '../api/loans.js';
import { transactionsApi } from '../api/transactions.js';
import { useToast } from '../context/ToastContext.jsx';
import { CATEGORY_ICONS, CATEGORY_LABELS, categoriesFor } from '../utils/categories.js';
import { todayStr } from '../utils/month.js';
import { AmountInput } from './AmountInput.jsx';
import { TrashIcon } from './icons.jsx';
import { Modal } from './Modal.jsx';

function FieldError({ children }) {
  return children ? <p className="mt-1 text-sm text-red-600 dark:text-red-400">{children}</p> : null;
}

export function TransactionForm({ initial, onClose, onSaved, onDelete }) {
  const toast = useToast();
  const editing = Boolean(initial?.id);
  const [form, setForm] = useState(() => ({
    type: initial?.type ?? 'expense',
    amount: initial?.amount ?? 0,
    category: initial?.category ?? 'food',
    date: initial?.date ?? todayStr(),
    note: initial?.note ?? '',
    loan: initial?.loan ?? null,
  }));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  // "Kredit to'lovi" tanlanganda foydalanuvchining ochiq kreditlari bir marta yuklanadi.
  const [loans, setLoans] = useState(null);

  useEffect(() => {
    if (form.category !== 'loan' || loans) return;
    loansApi.list().then(
      (r) => setLoans(r.data.filter((l) => l.status !== 'closed' || l.id === initial?.loan)),
      () => setLoans([]),
    );
  }, [form.category, loans, initial?.loan]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setType = (type) =>
    setForm((f) => {
      const list = categoriesFor(type);
      return { ...f, type, category: list.includes(f.category) ? f.category : list[0] };
    });

  async function submit(e) {
    e.preventDefault();
    if (!form.amount) return setErrors({ amount: 'Summani kiriting' });
    if (!form.date) return setErrors({ date: 'Sanani kiriting' });

    setBusy(true);
    setErrors({});
    try {
      const body = { ...form, loan: form.category === 'loan' ? form.loan : null };
      const res = editing ? await transactionsApi.update(initial.id, body) : await transactionsApi.create(body);
      if (res.warning) toast(res.warning.message, 'warning');
      else toast(editing ? 'Tranzaksiya yangilandi' : "Tranzaksiya qo'shildi");
      onSaved?.(res.data);
      onClose();
    } catch (err) {
      setErrors(err.code === 'VALIDATION_ERROR' ? err.fieldErrors : { form: err.message });
      setBusy(false);
    }
  }

  return (
    <Modal title={editing ? 'Tranzaksiyani tahrirlash' : 'Yangi tranzaksiya'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="radiogroup">
          {[
            ['expense', 'Xarajat'],
            ['income', 'Daromad'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={form.type === value}
              onClick={() => setType(value)}
              className={`rounded-lg py-2 text-sm font-semibold transition ${
                form.type === value
                  ? 'bg-white shadow-sm dark:bg-slate-900 ' +
                    (value === 'income' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100')
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div>
          <label className="label" htmlFor="tx-amount">
            Summa
          </label>
          <AmountInput
            id="tx-amount"
            value={form.amount}
            onChange={(amount) => set({ amount })}
            autoFocus={!editing}
            invalid={Boolean(errors.amount)}
          />
          <FieldError>{errors.amount}</FieldError>
        </div>

        <fieldset>
          <legend className="label">Kategoriya</legend>
          <div className="grid grid-cols-3 gap-2">
            {categoriesFor(form.type).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set({ category: c })}
                aria-pressed={form.category === c}
                className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-xs font-medium transition ${
                  form.category === c
                    ? 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-500/10 dark:text-brand-300'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <span className="text-lg" aria-hidden="true">
                  {CATEGORY_ICONS[c]}
                </span>
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
          <FieldError>{errors.category}</FieldError>
          <Link
            to="/categories"
            onClick={onClose}
            className="mt-2 inline-block text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            + O'z kategoriyangizni qo'shing
          </Link>
        </fieldset>

        {form.category === 'loan' && (
          <fieldset>
            <legend className="label">Qaysi kredit</legend>
            {loans === null ? (
              <div className="h-9 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            ) : (
              <div className="flex flex-wrap gap-2">
                {[{ id: null, name: "Ko'rsatilmagan" }, ...loans].map((l) => (
                  <button
                    key={l.id ?? 'none'}
                    type="button"
                    onClick={() => set({ loan: l.id })}
                    aria-pressed={form.loan === l.id}
                    className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                      form.loan === l.id
                        ? 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-500/10 dark:text-brand-300'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    {l.name}
                  </button>
                ))}
                <Link to="/loans" onClick={onClose} className="self-center text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                  + Kredit qo'shish
                </Link>
              </div>
            )}
            <FieldError>{errors.loan}</FieldError>
          </fieldset>
        )}

        <div>
          <label className="label" htmlFor="tx-date">
            Sana
          </label>
          <input
            id="tx-date"
            type="date"
            className="input"
            value={form.date}
            onChange={(e) => set({ date: e.target.value })}
            required
          />
          <FieldError>{errors.date}</FieldError>
        </div>

        <div>
          <label className="label" htmlFor="tx-note">
            Izoh <span className="font-normal text-slate-400">(ixtiyoriy)</span>
          </label>
          <input
            id="tx-note"
            className="input"
            maxLength={200}
            placeholder="Masalan: Korzinka"
            value={form.note}
            onChange={(e) => set({ note: e.target.value })}
          />
          <FieldError>{errors.note}</FieldError>
        </div>

        <FieldError>{errors.form}</FieldError>

        <div className="flex gap-2 pt-1">
          {editing && onDelete && (
            <button
              type="button"
              className="btn-secondary px-3 text-red-600 dark:text-red-400"
              onClick={() => onDelete(initial)}
              aria-label="O'chirish"
              title="O'chirish"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          )}
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>
            Bekor qilish
          </button>
          <button type="submit" className="btn-primary flex-1" disabled={busy}>
            {busy ? 'Saqlanmoqda…' : 'Saqlash'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
