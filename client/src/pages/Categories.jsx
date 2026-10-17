import { useState } from 'react';
import { Link } from 'react-router';
import { categoriesApi } from '../api/categories.js';
import { PencilIcon, PlusIcon, TrashIcon } from '../components/icons.jsx';
import { ConfirmDialog, Modal } from '../components/Modal.jsx';
import { useCategories } from '../context/CategoriesContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { CATEGORY_ICONS, CATEGORY_LABELS, EXPENSE_CATEGORIES, INCOME_CATEGORIES, isCustomKey } from '../utils/categories.js';

const ICON_PRESETS = ['🐶', '🏋️', '☕', '🎮', '✈️', '🎓', '🧾', '🚗', '🎁', '💄', '🍔', '🛠️', '📱', '🏥', '👶', '💼'];

function FieldError({ children }) {
  return children ? <p className="mt-1 text-sm text-red-600 dark:text-red-400">{children}</p> : null;
}

function CategoryForm({ initial, onClose, onSaved }) {
  const toast = useToast();
  const editing = Boolean(initial?.id);
  const [form, setForm] = useState({
    type: initial?.type ?? 'expense',
    label: initial?.label ?? '',
    icon: initial?.icon ?? '📦',
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (form.label.trim().length < 2) return setErrors({ label: 'Nom kamida 2 ta belgi bo\'lsin' });
    setBusy(true);
    setErrors({});
    try {
      if (editing) await categoriesApi.update(initial.id, { label: form.label, icon: form.icon });
      else await categoriesApi.create(form);
      toast(editing ? 'Kategoriya yangilandi' : "Kategoriya qo'shildi");
      await onSaved();
      onClose();
    } catch (err) {
      setErrors(err.code === 'VALIDATION_ERROR' ? err.fieldErrors : { form: err.message });
      setBusy(false);
    }
  }

  return (
    <Modal title={editing ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {!editing && (
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
                onClick={() => setForm((f) => ({ ...f, type: value }))}
                className={`rounded-lg py-2 text-sm font-semibold transition ${
                  form.type === value ? 'bg-white shadow-sm dark:bg-slate-900' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div>
          <label className="label" htmlFor="cat-label">
            Nomi
          </label>
          <input
            id="cat-label"
            className="input"
            maxLength={30}
            placeholder="Masalan: Uy hayvonlari"
            value={form.label}
            autoFocus
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          />
          <FieldError>{errors.label}</FieldError>
        </div>

        <div>
          <label className="label" htmlFor="cat-icon">
            Ikonka (emoji)
          </label>
          <input
            id="cat-icon"
            className="input w-24 text-center text-xl"
            maxLength={8}
            value={form.icon}
            onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ICON_PRESETS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition ${
                  form.icon === emoji ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                }`}
                onClick={() => setForm((f) => ({ ...f, icon: emoji }))}
                aria-label={`Ikonka ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <FieldError>{errors.icon}</FieldError>
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

function Section({ title, type, builtin, custom, onAdd, onEdit, onDelete }) {
  return (
    <section className="card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        <button className="btn-secondary py-1.5" onClick={() => onAdd(type)}>
          <PlusIcon className="h-4 w-4" /> Qo'shish
        </button>
      </div>

      {custom.length > 0 && (
        <ul className="mb-3 divide-y divide-slate-100 dark:divide-slate-800">
          {custom.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg dark:bg-slate-800" aria-hidden="true">
                {c.icon}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.label}</span>
              <button className="btn-icon" onClick={() => onEdit(c)} aria-label={`Tahrirlash: ${c.label}`}>
                <PencilIcon className="h-4 w-4" />
              </button>
              <button className="btn-icon hover:text-red-600 dark:hover:text-red-400" onClick={() => onDelete(c)} aria-label={`O'chirish: ${c.label}`}>
                <TrashIcon className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">Tayyor kategoriyalar</p>
      <div className="flex flex-wrap gap-1.5">
        {builtin.map((key) => (
          <span key={key} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs dark:bg-slate-800">
            <span aria-hidden="true">{CATEGORY_ICONS[key]}</span>
            {CATEGORY_LABELS[key]}
          </span>
        ))}
      </div>
    </section>
  );
}

export default function Categories() {
  const toast = useToast();
  const { custom, refresh } = useCategories();
  const [editing, setEditing] = useState(null); // null | { type } (yangi) | category
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  async function confirmDelete() {
    setBusy(true);
    try {
      await categoriesApi.remove(deleting.id);
      toast("Kategoriya o'chirildi");
      setDeleting(null);
      await refresh();
    } catch (err) {
      // Masalan, kategoriyada tranzaksiya bo'lsa server 409 qaytaradi va sababini yozadi.
      toast(err.message, 'error');
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  }

  const builtinOf = (list) => list.filter((k) => !isCustomKey(k));

  return (
    <>
      <div className="mb-4">
        <h1 className="text-lg font-semibold">Kategoriyalar</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          O'zingizga kerakli kategoriyalarni qo'shing. Ular tranzaksiya, budjet va takroriy to'lovlarda ishlaydi.{' '}
          <Link to="/settings" className="text-brand-600 hover:underline dark:text-brand-400">
            Sozlamalarga qaytish
          </Link>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Section
          title="Xarajat kategoriyalari"
          type="expense"
          builtin={builtinOf(EXPENSE_CATEGORIES)}
          custom={custom.filter((c) => c.type === 'expense')}
          onAdd={(type) => setEditing({ type })}
          onEdit={setEditing}
          onDelete={setDeleting}
        />
        <Section
          title="Daromad kategoriyalari"
          type="income"
          builtin={builtinOf(INCOME_CATEGORIES)}
          custom={custom.filter((c) => c.type === 'income')}
          onAdd={(type) => setEditing({ type })}
          onEdit={setEditing}
          onDelete={setDeleting}
        />
      </div>

      {editing && <CategoryForm initial={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
      {deleting && (
        <ConfirmDialog
          title="Kategoriyani o'chirish"
          message={`"${deleting.label}" kategoriyasi o'chiriladi. Agar unda tranzaksiya yoki takroriy qoida bo'lsa, o'chirib bo'lmaydi.`}
          onConfirm={confirmDelete}
          onClose={() => setDeleting(null)}
          busy={busy}
        />
      )}
    </>
  );
}
