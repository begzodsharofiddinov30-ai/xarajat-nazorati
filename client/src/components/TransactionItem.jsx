import { CATEGORY_ICONS, CATEGORY_LABELS } from '../utils/categories.js';
import { formatSom } from '../utils/format.js';
import { dateLabel } from '../utils/month.js';
import { PencilIcon, TrashIcon } from './icons.jsx';

// Mobilda butun qator bosiladi (tahrirlash oynasida o'chirish ham bor), kattaroq ekranda alohida tugmalar.
export function TransactionItem({ tx, onEdit, onDelete, showDate = true }) {
  const income = tx.type === 'income';
  const Row = onEdit ? 'button' : 'div';

  return (
    <li className="flex items-center gap-1">
      <Row
        {...(onEdit && { type: 'button', onClick: () => onEdit(tx), 'aria-label': `Tahrirlash: ${tx.note || CATEGORY_LABELS[tx.category]}` })}
        className={`flex min-w-0 flex-1 items-center gap-3 py-3 text-left ${
          onEdit ? '-mx-2 rounded-lg px-2 transition hover:bg-slate-50 sm:hover:bg-transparent dark:hover:bg-slate-800/50 sm:dark:hover:bg-transparent' : ''
        }`}
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg dark:bg-slate-800"
          aria-hidden="true"
        >
          {CATEGORY_ICONS[tx.category]}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{tx.note || CATEGORY_LABELS[tx.category]}</span>
          <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
            {CATEGORY_LABELS[tx.category]}
            {showDate && ` · ${dateLabel(tx.date)}`}
          </span>
        </span>
        <span
          className={`shrink-0 text-sm font-semibold tabular-nums ${
            income ? 'text-emerald-700 dark:text-emerald-400' : ''
          }`}
        >
          {formatSom(income ? tx.amount : -tx.amount, { sign: true })}
        </span>
      </Row>
      {(onEdit || onDelete) && (
        <div className="hidden shrink-0 sm:flex">
          {onEdit && (
            <button className="btn-icon" onClick={() => onEdit(tx)} aria-label="Tahrirlash" tabIndex={-1}>
              <PencilIcon className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              className="btn-icon hover:text-red-600 dark:hover:text-red-400"
              onClick={() => onDelete(tx)}
              aria-label="O'chirish"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </li>
  );
}
