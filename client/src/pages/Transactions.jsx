import { useMemo, useState } from 'react';
import { transactionsApi } from '../api/transactions.js';
import { Fab } from '../components/Fab.jsx';
import { DownloadIcon, PlusIcon, SearchIcon } from '../components/icons.jsx';
import { ConfirmDialog } from '../components/Modal.jsx';
import { MonthPicker } from '../components/MonthPicker.jsx';
import { TransactionForm } from '../components/TransactionForm.jsx';
import { TransactionItem } from '../components/TransactionItem.jsx';
import { useMonth } from '../context/MonthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAsync, useDebounced } from '../hooks/useAsync.js';
import { CATEGORY_LABELS, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../utils/categories.js';
import { downloadCsv, transactionsToCsv } from '../utils/csv.js';
import { formatSom } from '../utils/format.js';
import { dateLabel } from '../utils/month.js';

const PAGE_LIMIT = 1000;

function CategoryOptions({ type }) {
  const groups = [
    ['expense', 'Xarajat', EXPENSE_CATEGORIES],
    ['income', 'Daromad', INCOME_CATEGORIES],
  ].filter(([t]) => !type || t === type);
  return groups.map(([t, label, list]) => (
    <optgroup key={t} label={label}>
      {list.map((c) => (
        <option key={c} value={c}>
          {CATEGORY_LABELS[c]}
        </option>
      ))}
    </optgroup>
  ));
}

export default function Transactions() {
  const { month } = useMonth();
  const toast = useToast();
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());

  const [editing, setEditing] = useState(null); // null | {} (yangi) | tx
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const list = useAsync(
    () => transactionsApi.list({ month, type, category, q, limit: PAGE_LIMIT }),
    [month, type, category, q],
  );
  const items = list.data?.data ?? [];

  const totals = useMemo(
    () =>
      items.reduce(
        (acc, t) => ({ ...acc, [t.type]: acc[t.type] + t.amount }),
        { income: 0, expense: 0 },
      ),
    [items],
  );

  const groups = useMemo(() => {
    const map = new Map();
    for (const t of items) {
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date).push(t);
    }
    return [...map.entries()];
  }, [items]);

  function changeType(value) {
    setType(value);
    const allowed = value === 'income' ? INCOME_CATEGORIES : value === 'expense' ? EXPENSE_CATEGORIES : null;
    if (allowed && category && !allowed.includes(category)) setCategory('');
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      await transactionsApi.remove(deleting.id);
      toast("Tranzaksiya o'chirildi");
      setDeleting(null);
      list.reload();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  // CSV tanlangan oyning barcha tranzaksiyalarini oladi (filtrlardan qat'i nazar).
  async function exportCsv() {
    setBusy(true);
    try {
      const all = [];
      for (let page = 1; ; page++) {
        const res = await transactionsApi.list({ month, page, limit: PAGE_LIMIT });
        all.push(...res.data);
        if (all.length >= res.meta.total || res.data.length === 0) break;
      }
      if (!all.length) return toast("Bu oyda eksport qilinadigan tranzaksiya yo'q", 'error');
      downloadCsv(`xarajatlar-${month}.csv`, transactionsToCsv(all));
      toast(`${all.length} ta tranzaksiya yuklab olindi`);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  const filtered = type || category || q;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <MonthPicker />
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={exportCsv} disabled={busy}>
            <DownloadIcon className="h-4 w-4" /> CSV
          </button>
          <button className="btn-primary hidden md:inline-flex" onClick={() => setEditing({})}>
            <PlusIcon className="h-4 w-4" /> Qo'shish
          </button>
        </div>
      </div>

      <div className="card mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <label className="relative">
          <span className="sr-only">Izoh bo'yicha qidirish</span>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            type="search"
            placeholder="Izoh bo'yicha qidirish…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className="grid grid-cols-2 gap-3 sm:contents">
          <select className="input sm:w-36" value={type} onChange={(e) => changeType(e.target.value)} aria-label="Tur">
            <option value="">Barcha turlar</option>
            <option value="expense">Xarajat</option>
            <option value="income">Daromad</option>
          </select>
          <select
            className="input sm:w-44"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Kategoriya"
          >
            <option value="">Kategoriyalar</option>
            <CategoryOptions type={type} />
          </select>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 px-1 text-sm text-slate-500 dark:text-slate-400">
        <span>{list.data?.meta.total ?? 0} ta tranzaksiya</span>
        <span>
          Daromad: <b className="font-semibold text-emerald-700 dark:text-emerald-400">{formatSom(totals.income)}</b>
        </span>
        <span>
          Xarajat: <b className="font-semibold text-slate-900 dark:text-slate-100">{formatSom(totals.expense)}</b>
        </span>
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
      ) : groups.length === 0 ? (
        <div className="card py-12 text-center text-sm text-slate-500">
          {filtered ? "Filtrga mos tranzaksiya topilmadi" : "Bu oyda hali tranzaksiya yo'q"}
        </div>
      ) : (
        <div className={`space-y-4 transition-opacity ${list.loading ? 'opacity-60' : ''}`}>
          {groups.map(([date, txs]) => (
            <section key={date} className="card py-1">
              <h3 className="border-b border-slate-100 py-2 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:border-slate-800 dark:text-slate-400">
                {dateLabel(date)}
              </h3>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {txs.map((tx) => (
                  <TransactionItem key={tx.id} tx={tx} showDate={false} onEdit={setEditing} onDelete={setDeleting} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Fab onClick={() => setEditing({})} />
      {editing && (
        <TransactionForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={list.reload}
          onDelete={(tx) => {
            setEditing(null);
            setDeleting(tx);
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Tranzaksiyani o'chirish"
          message={`${dateLabel(deleting.date)}dagi ${formatSom(deleting.amount)} miqdoridagi yozuv butunlay o'chiriladi.`}
          onConfirm={confirmDelete}
          onClose={() => setDeleting(null)}
          busy={busy}
        />
      )}
    </>
  );
}
