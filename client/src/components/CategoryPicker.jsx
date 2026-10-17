import { CATEGORY_ICONS, CATEGORY_LABELS, categoriesFor } from '../utils/categories.js';

// Kategoriya tanlash tarmog'i (tayyor va foydalanuvchining o'z kategoriyalari).
export function CategoryPicker({ type, value, onChange, legend = 'Kategoriya' }) {
  return (
    <fieldset>
      <legend className="label">{legend}</legend>
      <div className="grid grid-cols-3 gap-2">
        {categoriesFor(type).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-pressed={value === c}
            className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-xs font-medium transition ${
              value === c
                ? 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-500/10 dark:text-brand-300'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <span className="text-lg" aria-hidden="true">
              {CATEGORY_ICONS[c]}
            </span>
            <span className="max-w-full truncate">{CATEGORY_LABELS[c]}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
