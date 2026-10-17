import { useState } from 'react';
import { goalsApi } from '../api/goals.js';
import { AmountInput } from '../components/AmountInput.jsx';
import { AlertIcon, CheckIcon, PencilIcon, PlusIcon, TrashIcon } from '../components/icons.jsx';
import { ConfirmDialog, Modal } from '../components/Modal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { formatSom } from '../utils/format.js';
import { dateLabel, todayStr } from '../utils/month.js';

function FieldError({ children }) {
  return children ? <p className="mt-1 text-sm text-red-600 dark:text-red-400">{children}</p> : null;
}

function GoalForm({ initial, onClose, onSaved }) {
  const toast = useToast();
  const editing = Boolean(initial?.id);
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    targetAmount: initial?.targetAmount ?? 0,
    deadline: initial?.deadline ?? '',
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return setErrors({ name: 'Maqsad nomini kiriting' });
    if (!form.targetAmount) return setErrors({ targetAmount: 'Maqsad summasini kiriting' });
    setBusy(true);
    setErrors({});
    const body = { ...form, deadline: form.deadline || null };
    try {
      if (editing) await goalsApi.update(initial.id, body);
      else await goalsApi.create(body);
      toast(editing ? 'Maqsad yangilandi' : "Maqsad qo'shildi");
      onSaved();
      onClose();
    } catch (err) {
      setErrors(err.code === 'VALIDATION_ERROR' ? err.fieldErrors : { form: err.message });
      setBusy(false);
    }
  }

  return (
    <Modal title={editing ? 'Maqsadni tahrirlash' : 'Yangi maqsad'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label className="label" htmlFor="g-name">
            Nomi
          </label>
          <input
            id="g-name"
            className="input"
            maxLength={60}
            placeholder="Masalan: Noutbuk, Ta'tilga sayohat"
            value={form.name}
            autoFocus={!editing}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <FieldError>{errors.name}</FieldError>
        </div>
        <div>
          <label className="label" htmlFor="g-target">
            Maqsad summasi
          </label>
          <AmountInput id="g-target" value={form.targetAmount} onChange={(targetAmount) => setForm((f) => ({ ...f, targetAmount }))} invalid={Boolean(errors.targetAmount)} />
          <FieldError>{errors.targetAmount}</FieldError>
        </div>
        <div>
          <label className="label" htmlFor="g-deadline">
            Muddat <span className="font-normal text-slate-400">(ixtiyoriy)</span>
          </label>
          <input
            id="g-deadline"
            type="date"
            className="input"
            value={form.deadline}
            onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
          />
          <FieldError>{errors.deadline}</FieldError>
        </div>
        <FieldError>{errors.form}</FieldError>
        <div className="flex gap-2 pt-1">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>
            Bekor qilish
          </button>
          <button className="btn-primary flex-1" disabled={busy}>
            {busy ? 'Saqlanmoqda…' : 'Saqlash'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ContributionForm({ goal, onClose, onSaved }) {
  const toast = useToast();
  const [mode, setMode] = useState('deposit'); // deposit | withdraw
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!amount) return setError('Summani kiriting');
    setBusy(true);
    setError('');
    try {
      await goalsApi.addContribution(goal.id, { amount: mode === 'deposit' ? amount : -amount, date, note });
      toast(mode === 'deposit' ? "Jamg'armaga qo'shildi" : 'Qaytarib olindi');
      onSaved();
      onClose();
    } catch (err) {
      setError(err.fieldErrors?.amount ?? err.message);
      setBusy(false);
    }
  }

  return (
    <Modal title={goal.name} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="radiogroup">
          {[
            ['deposit', "Qo'shish"],
            ['withdraw', 'Qaytarib olish'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              onClick={() => setMode(value)}
              className={`rounded-lg py-2 text-sm font-semibold transition ${
                mode === value ? 'bg-white shadow-sm dark:bg-slate-900' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div>
          <label className="label" htmlFor="c-amount">
            Summa
          </label>
          <AmountInput id="c-amount" value={amount} onChange={setAmount} autoFocus invalid={Boolean(error)} />
          {mode === 'withdraw' && <p className="mt-1 text-xs text-slate-500">Jamg'armada: {formatSom(goal.saved)}</p>}
          <FieldError>{error}</FieldError>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="c-date">
              Sana
            </label>
            <input id="c-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="c-note">
              Izoh
            </label>
            <input id="c-note" className="input" maxLength={100} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Jamg'arma yozuvlari tranzaksiyalar va balansga ta'sir qilmaydi: ular faqat shu maqsad uchun hisoblanadi.
        </p>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>
            Bekor qilish
          </button>
          <button className="btn-primary flex-1" disabled={busy}>
            {busy ? 'Saqlanmoqda…' : 'Saqlash'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function GoalCard({ goal, onAdd, onEdit, onDelete, onRemoveContribution }) {
  const [open, setOpen] = useState(false);
  const color = goal.completed ? 'var(--status-good)' : goal.overdue ? 'var(--status-critical)' : 'var(--series-1)';

  let hint = null;
  if (goal.completed) {
    hint = (
      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
        <CheckIcon className="h-3.5 w-3.5" /> Maqsadga erishildi
      </span>
    );
  } else if (goal.overdue) {
    hint = (
      <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
        <AlertIcon className="h-3.5 w-3.5" /> Muddat o'tgan
      </span>
    );
  } else if (goal.monthlyNeeded != null) {
    hint = `Muddatga yetish uchun oyiga ~${formatSom(goal.monthlyNeeded)}`;
  }

  return (
    <li className="card">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold">{goal.name}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {goal.deadline
              ? `Muddat: ${dateLabel(goal.deadline)}${goal.daysLeft >= 0 && !goal.completed ? ` (${goal.daysLeft} kun qoldi)` : ''}`
              : 'Muddatsiz'}
          </p>
        </div>
        <div className="-my-1 -mr-2 flex shrink-0">
          <button className="btn-icon" onClick={() => onEdit(goal)} aria-label="Tahrirlash">
            <PencilIcon className="h-4 w-4" />
          </button>
          <button className="btn-icon hover:text-red-600 dark:hover:text-red-400" onClick={() => onDelete(goal)} aria-label="O'chirish">
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-2">
        <span className="text-xl font-bold tabular-nums">{formatSom(goal.saved)}</span>
        <span className="text-sm text-slate-500 tabular-nums dark:text-slate-400">/ {formatSom(goal.targetAmount)}</span>
      </div>
      <div
        className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(goal.percent, 100)}
        aria-label={`${goal.name}: ${goal.percent}%`}
      >
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(goal.percent, 100)}%`, backgroundColor: color }} />
      </div>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="tabular-nums">{goal.percent}%{!goal.completed && ` · ${formatSom(goal.remaining)} qoldi`}</span>
        {hint && <span>{hint}</span>}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn-primary py-2" onClick={() => onAdd(goal)}>
          <PlusIcon className="h-4 w-4" /> Jamg'arma
        </button>
        {goal.contributions.length > 0 && (
          <button className="btn-secondary py-2" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            Tarix ({goal.contributions.length})
          </button>
        )}
      </div>

      {open && (
        <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100 text-sm dark:divide-slate-800 dark:border-slate-800">
          {goal.contributions.map((c) => (
            <li key={c.id} className="flex items-center gap-2 py-2">
              <span className="w-24 shrink-0 text-xs text-slate-500">{dateLabel(c.date)}</span>
              <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">{c.note}</span>
              <span className={`shrink-0 font-medium tabular-nums ${c.amount > 0 ? 'text-emerald-700 dark:text-emerald-400' : ''}`}>
                {formatSom(c.amount, { sign: true })}
              </span>
              <button
                className="btn-icon -mr-2 h-8 w-8 hover:text-red-600 dark:hover:text-red-400"
                onClick={() => onRemoveContribution(goal, c)}
                aria-label="Yozuvni o'chirish"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default function Goals() {
  const toast = useToast();
  const list = useAsync(() => goalsApi.list(), []);
  const [editing, setEditing] = useState(null); // null | {} | goal
  const [contributing, setContributing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const goals = list.data ?? [];

  async function confirmDelete() {
    setBusy(true);
    try {
      await goalsApi.remove(deleting.id);
      toast("Maqsad o'chirildi");
      setDeleting(null);
      list.reload();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function removeContribution(goal, c) {
    try {
      await goalsApi.removeContribution(goal.id, c.id);
      toast("Yozuv o'chirildi");
      list.reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Jamg'arma maqsadlari</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Katta xarid yoki sayohat uchun mablag' to'plang</p>
        </div>
        <button className="btn-primary" onClick={() => setEditing({})}>
          <PlusIcon className="h-4 w-4" /> Yangi maqsad
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
        <div className="card h-40 animate-pulse" />
      ) : goals.length === 0 ? (
        <div className="card py-12 text-center">
          <span className="text-3xl" aria-hidden="true">🎯</span>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Hali maqsad yo'q. Birinchisini qo'shing, masalan "Noutbuk".</p>
          <button className="btn-secondary mt-3" onClick={() => setEditing({})}>
            Maqsad qo'shish
          </button>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} onAdd={setContributing} onEdit={setEditing} onDelete={setDeleting} onRemoveContribution={removeContribution} />
          ))}
        </ul>
      )}

      {editing && <GoalForm initial={editing} onClose={() => setEditing(null)} onSaved={list.reload} />}
      {contributing && <ContributionForm goal={contributing} onClose={() => setContributing(null)} onSaved={list.reload} />}
      {deleting && (
        <ConfirmDialog
          title="Maqsadni o'chirish"
          message={`"${deleting.name}" maqsadi va uning barcha jamg'arma yozuvlari o'chiriladi.`}
          onConfirm={confirmDelete}
          onClose={() => setDeleting(null)}
          busy={busy}
        />
      )}
    </>
  );
}
