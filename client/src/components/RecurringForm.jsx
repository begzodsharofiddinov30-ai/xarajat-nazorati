import { useState } from 'react';
import { recurringApi } from '../api/recurring.js';
import { useToast } from '../context/ToastContext.jsx';
import { categoriesFor } from '../utils/categories.js';
import { todayStr } from '../utils/month.js';
import { AmountInput } from './AmountInput.jsx';
import { CategoryPicker } from './CategoryPicker.jsx';
import { Modal } from './Modal.jsx';

export const FREQUENCY_LABELS = { daily: 'Har kuni', weekly: 'Har hafta', monthly: 'Har oy' };

function FieldError({ children }) {
  return children ? <p className="mt-1 text-sm text-red-600 dark:text-red-400">{children}</p> : null;
}

export function RecurringForm({ initial, onClose, onSaved }) {
  const toast = useToast();
  const editing = Boolean(initial?.id);
  const [form, setForm] = useState(() => ({
    type: initial?.type ?? 'expense',
    amount: initial?.amount ?? 0,
    category: initial?.category ?? 'housing',
    note: initial?.note ?? '',
    frequency: initial?.frequency ?? 'monthly',
    startDate: initial?.startDate ?? todayStr(),
    endDate: initial?.endDate ?? '',
    active: initial?.active ?? true,
    // Mobil aloqa qoidasi bog'langan raqam: tahrirlashda yo'qolmasligi kerak.
    phone: initial?.phone ?? null,
  }));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setType = (type) =>
    setForm((f) => {
      const list = categoriesFor(type);
      return { ...f, type, category: list.includes(f.category) ? f.category : list[0] };
    });

  async function submit(e) {
    e.preventDefault();
    if (!form.amount) return setErrors({ amount: 'Summani kiriting' });
    if (!form.startDate) return setErrors({ startDate: 'Boshlanish sanasini kiriting' });

    setBusy(true);
    setErrors({});
    const body = { ...form, endDate: form.endDate || null, phone: form.category === 'mobile' ? form.phone : null };
    try {
      if (editing) await recurringApi.update(initial.id, body);
      else await recurringApi.create(body);
      toast(editing ? 'Qoida yangilandi' : "Takroriy qoida qo'shildi");
      onSaved?.();
      onClose();
    } catch (err) {
      setErrors(err.code === 'VALIDATION_ERROR' ? err.fieldErrors : { form: err.message });
      setBusy(false);
    }
  }

  const startDay = Number(form.startDate.slice(8, 10));
  const pastStart = form.startDate && form.startDate < todayStr();

  return (
    <Modal title={editing ? 'Takroriy qoidani tahrirlash' : 'Yangi takroriy to\'lov'} onClose={onClose}>
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
          <label className="label" htmlFor="rc-amount">
            Summa
          </label>
          <AmountInput id="rc-amount" value={form.amount} onChange={(amount) => set({ amount })} autoFocus={!editing} invalid={Boolean(errors.amount)} />
          <FieldError>{errors.amount}</FieldError>
        </div>

        <CategoryPicker type={form.type} value={form.category} onChange={(category) => set({ category })} />
        <FieldError>{errors.category}</FieldError>

        <div>
          <label className="label" htmlFor="rc-note">
            Izoh <span className="font-normal text-slate-400">(ixtiyoriy)</span>
          </label>
          <input
            id="rc-note"
            className="input"
            maxLength={200}
            placeholder="Masalan: Ijara, Netflix, Internet"
            value={form.note}
            onChange={(e) => set({ note: e.target.value })}
          />
          <FieldError>{errors.note}</FieldError>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="rc-freq">
              Takrorlanish
            </label>
            <select id="rc-freq" className="input" value={form.frequency} onChange={(e) => set({ frequency: e.target.value })}>
              {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <FieldError>{errors.frequency}</FieldError>
          </div>
          <div>
            <label className="label" htmlFor="rc-start">
              Boshlanish sanasi
            </label>
            <input id="rc-start" type="date" className="input" value={form.startDate} onChange={(e) => set({ startDate: e.target.value })} required />
            <FieldError>{errors.startDate}</FieldError>
          </div>
          <div>
            <label className="label" htmlFor="rc-end">
              Tugash sanasi <span className="font-normal text-slate-400">(ixtiyoriy)</span>
            </label>
            <input id="rc-end" type="date" className="input" value={form.endDate} min={form.startDate || undefined} onChange={(e) => set({ endDate: e.target.value })} />
            <FieldError>{errors.endDate}</FieldError>
          </div>
        </div>

        {editing && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4" checked={form.active} onChange={(e) => set({ active: e.target.checked })} />
            Faol (o'chirilsa, yangi yozuvlar yaratilmaydi)
          </label>
        )}

        <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
          {pastStart && !editing && <p>Boshlanish sanasi o'tgan: o'tgan sanalar uchun yozuvlar hozir yaratiladi.</p>}
          {editing && <p>O'zgarishlar bugundan boshlab amal qiladi, avval yaratilgan yozuvlarga tegilmaydi.</p>}
          {form.frequency === 'monthly' && startDay > 28 && (
            <p>Qisqa oylarda ({startDay}-sana bo'lmasa) oyning oxirgi kuni yoziladi.</p>
          )}
        </div>

        <FieldError>{errors.form}</FieldError>

        <div className="flex gap-2 pt-1">
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
