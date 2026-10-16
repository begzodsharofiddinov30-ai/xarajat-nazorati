import { useState } from 'react';
import { budgetsApi } from '../api/budgets.js';
import { summaryApi } from '../api/summary.js';
import { AmountInput } from '../components/AmountInput.jsx';
import { BudgetProgress } from '../components/BudgetProgress.jsx';
import { PencilIcon, TrashIcon } from '../components/icons.jsx';
import { ConfirmDialog } from '../components/Modal.jsx';
import { MonthPicker } from '../components/MonthPicker.jsx';
import { useMonth } from '../context/MonthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { CATEGORY_ICONS, CATEGORY_LABELS, EXPENSE_CATEGORIES } from '../utils/categories.js';
import { formatSom } from '../utils/format.js';

function LimitEditor({ category, initial, onSave, onCancel }) {
  const [limit, setLimit] = useState(initial ?? 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!limit) return setError('Limitni kiriting');
    setBusy(true);
    try {
      await onSave(limit);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3">
      <label className="label" htmlFor={`limit-${category}`}>
        Oylik limit
      </label>
      <div className="flex gap-2">
        <div className="flex-1">
          <AmountInput id={`limit-${category}`} value={limit} onChange={setLimit} autoFocus invalid={Boolean(error)} />
        </div>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Bekor
        </button>
        <button className="btn-primary" disabled={busy}>
          Saqlash
        </button>
      </div>
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}

export default function Budgets() {
  const { month } = useMonth();
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const budgets = useAsync(() => budgetsApi.list(month), [month]);
  const summary = useAsync(() => summaryApi.get(month), [month]);

  const byCategory = new Map((budgets.data ?? []).map((b) => [b.category, b]));
  const spentMap = new Map((summary.data?.byCategory ?? []).map((c) => [c.category, c.total]));

  const totalLimit = (budgets.data ?? []).reduce((s, b) => s + b.limit, 0);
  const totalSpent = (budgets.data ?? []).reduce((s, b) => s + b.spent, 0);
  const overCount = (budgets.data ?? []).filter((b) => b.status === 'exceeded').length;

  async function save(category, limit) {
    await budgetsApi.upsert(category, limit);
    toast(`${CATEGORY_LABELS[category]} uchun limit saqlandi`);
    setEditing(null);
    budgets.reload();
  }

  async function remove() {
    try {
      await budgetsApi.remove(deleting);
      toast("Limit o'chirildi");
      budgets.reload();
    } catch (err) {
      toast(err.message, 'error');
    }
    setDeleting(null);
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <MonthPicker />
        <p className="text-sm text-slate-500 dark:text-slate-400">Limitlar har oy uchun amal qiladi</p>
      </div>

      {budgets.data?.length > 0 && (
        <div className="card mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-slate-500 dark:text-slate-400">Jami limit</p>
            <p className="text-lg font-bold tabular-nums">{formatSom(totalLimit)}</p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400">Sarflangan</p>
            <p className="text-lg font-bold tabular-nums">{formatSom(totalSpent)}</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="text-slate-500 dark:text-slate-400">Limitdan oshgan</p>
            <p className={`text-lg font-bold ${overCount ? 'text-red-600 dark:text-red-400' : ''}`}>
              {overCount} ta kategoriya
            </p>
          </div>
        </div>
      )}

      {budgets.error && (
        <div className="card mb-4 text-sm text-red-600 dark:text-red-400">{budgets.error.message}</div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {EXPENSE_CATEGORIES.map((c) => {
          const b = byCategory.get(c);
          const isEditing = editing === c;
          return (
            <div key={c} className="card">
              {b ? (
                <BudgetProgress
                  budget={b}
                  actions={
                    !isEditing && (
                      <span className="-my-2 -mr-2 flex">
                        <button className="btn-icon" onClick={() => setEditing(c)} aria-label="Limitni tahrirlash">
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          className="btn-icon hover:text-red-600 dark:hover:text-red-400"
                          onClick={() => setDeleting(c)}
                          aria-label="Limitni o'chirish"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </span>
                    )
                  }
                />
              ) : (
                <div className="flex items-center gap-2">
                  <span aria-hidden="true">{CATEGORY_ICONS[c]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{CATEGORY_LABELS[c]}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Limit yo'q · bu oy {formatSom(spentMap.get(c) ?? 0)}
                    </p>
                  </div>
                  {!isEditing && (
                    <button className="btn-secondary py-1.5" onClick={() => setEditing(c)}>
                      Limit qo'yish
                    </button>
                  )}
                </div>
              )}
              {isEditing && (
                <LimitEditor
                  category={c}
                  initial={b?.limit}
                  onSave={(limit) => save(c, limit)}
                  onCancel={() => setEditing(null)}
                />
              )}
            </div>
          );
        })}
      </div>

      {deleting && (
        <ConfirmDialog
          title="Limitni o'chirish"
          message={`"${CATEGORY_LABELS[deleting]}" kategoriyasi uchun oylik limit o'chiriladi. Tranzaksiyalar saqlanib qoladi.`}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}
