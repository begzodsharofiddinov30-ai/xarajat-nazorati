import { useState } from 'react';
import { recurringApi } from '../api/recurring.js';
import { PencilIcon, PlusIcon, TrashIcon } from '../components/icons.jsx';
import { ConfirmDialog } from '../components/Modal.jsx';
import { FREQUENCY_LABELS, RecurringForm } from '../components/RecurringForm.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { CATEGORY_ICONS, CATEGORY_LABELS } from '../utils/categories.js';
import { formatSom } from '../utils/format.js';
import { dateLabel } from '../utils/month.js';

function RuleCard({ rule, onEdit, onToggle, onDelete }) {
  const income = rule.type === 'income';
  return (
    <li className={`card flex items-center gap-3 ${rule.active ? '' : 'opacity-60'}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg dark:bg-slate-800" aria-hidden="true">
        {CATEGORY_ICONS[rule.category]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{rule.note || CATEGORY_LABELS[rule.category]}</p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
          {FREQUENCY_LABELS[rule.frequency]} ·{' '}
          {!rule.active ? 'Pauzada' : rule.nextDate ? `Keyingisi: ${dateLabel(rule.nextDate)}` : 'Tugagan'}
          {rule.endDate && ` · ${dateLabel(rule.endDate)} gacha`}
        </p>
      </div>
      <span className={`shrink-0 text-sm font-semibold tabular-nums ${income ? 'text-emerald-700 dark:text-emerald-400' : ''}`}>
        {formatSom(income ? rule.amount : -rule.amount, { sign: true })}
      </span>
      <div className="-mr-2 flex shrink-0">
        <button className="btn-secondary mr-1 hidden px-3 py-1.5 sm:inline-flex" onClick={() => onToggle(rule)}>
          {rule.active ? 'Pauza' : 'Davom ettirish'}
        </button>
        <button className="btn-icon" onClick={() => onEdit(rule)} aria-label="Tahrirlash">
          <PencilIcon className="h-4 w-4" />
        </button>
        <button className="btn-icon hover:text-red-600 dark:hover:text-red-400" onClick={() => onDelete(rule)} aria-label="O'chirish">
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

export default function Recurring() {
  const toast = useToast();
  const list = useAsync(() => recurringApi.list(), []);
  const [editing, setEditing] = useState(null); // null | {} (yangi) | rule
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const rules = list.data ?? [];

  async function toggle(rule) {
    const { id, nextDate, nextIndex, createdAt, updatedAt, ...rest } = rule;
    try {
      await recurringApi.update(id, { ...rest, active: !rule.active });
      toast(rule.active ? 'Qoida pauzaga qo\'yildi' : 'Qoida davom ettirildi');
      list.reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      await recurringApi.remove(deleting.id);
      toast("Qoida o'chirildi");
      setDeleting(null);
      list.reload();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Takroriy to'lovlar</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Ijara, obuna, maosh kabi muntazam yozuvlar o'zi qo'shiladi</p>
        </div>
        <button className="btn-primary" onClick={() => setEditing({})}>
          <PlusIcon className="h-4 w-4" /> Qo'shish
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
        <div className="card h-28 animate-pulse" />
      ) : rules.length === 0 ? (
        <div className="card py-12 text-center">
          <span className="text-3xl" aria-hidden="true">🔁</span>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Hali takroriy to'lov yo'q. Masalan, oylik ijara yoki obunani qo'shing.</p>
          <button className="btn-secondary mt-3" onClick={() => setEditing({})}>
            Birinchisini qo'shish
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {rules.map((r) => (
            <RuleCard key={r.id} rule={r} onEdit={setEditing} onToggle={toggle} onDelete={setDeleting} />
          ))}
        </ul>
      )}

      {rules.length > 0 && (
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          Yozuvlar sahifani ochganingizda yaratiladi. Qoida o'chirilsa, avval yaratilgan tranzaksiyalar saqlanib qoladi.
        </p>
      )}

      {editing && <RecurringForm initial={editing} onClose={() => setEditing(null)} onSaved={list.reload} />}
      {deleting && (
        <ConfirmDialog
          title="Qoidani o'chirish"
          message={`"${deleting.note || CATEGORY_LABELS[deleting.category]}" qoidasi o'chiriladi. Avval yaratilgan tranzaksiyalar qoladi.`}
          onConfirm={confirmDelete}
          onClose={() => setDeleting(null)}
          busy={busy}
        />
      )}
    </>
  );
}
