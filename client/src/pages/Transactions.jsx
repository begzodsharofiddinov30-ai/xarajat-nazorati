import { useEffect, useState } from 'react';
import { transactionsApi } from '../api/transactions.js';
import { AmountInput } from '../components/AmountInput.jsx';
import { Fab } from '../components/Fab.jsx';
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon, FilterIcon, PlusIcon, SearchIcon, UploadIcon } from '../components/icons.jsx';
import { ImportModal } from '../components/ImportModal.jsx';
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

const PAGE_SIZE = 50;
const EXPORT_PAGE = 1000;

const SORTS = [
  ['date_desc', "Sana: yangidan eskiga"],
  ['date_asc', 'Sana: eskidan yangiga'],
  ['amount_desc', "Summa: kattadan kichikka"],
  ['amount_asc', 'Summa: kichikdan kattaga'],
];

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
  // Qo'shimcha filtrlar
  const [showMore, setShowMore] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [minAmount, setMinAmount] = useState(0);
  const [maxAmount, setMaxAmount] = useState(0);
  const minDebounced = useDebounced(minAmount);
  const maxDebounced = useDebounced(maxAmount);
  const [sort, setSort] = useState('date_desc');

  const [editing, setEditing] = useState(null); // null | {} (yangi) | tx
  const [deleting, setDeleting] = useState(null);
  const [importing, setImporting] = useState(false);
  const [busy, setBusy] = useState(false);

  const rangeActive = Boolean(from || to);
  const filterKey = JSON.stringify([month, rangeActive, type, category, q, from, to, minDebounced, maxDebounced, sort]);
  // Filtr o'zgarganda sahifa avtomatik 1-sahifaga qaytadi (qo'shimcha so'rovsiz).
  const [pageState, setPageState] = useState({ key: '', page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (p) => setPageState({ key: filterKey, page: p });

  const baseQuery = {
    ...(rangeActive ? { from, to } : { month }),
    type,
    category,
    q,
    minAmount: minDebounced || undefined,
    maxAmount: maxDebounced || undefined,
    sort,
  };

  const list = useAsync(
    () => transactionsApi.list({ ...baseQuery, page, limit: PAGE_SIZE }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterKey, page],
  );
  const items = list.data?.data ?? [];
  const meta = list.data?.meta;

  // Oxirgi sahifadagi so'nggi yozuv o'chirilsa (yoki filtr natijasi qisqarsa), mavjud oxirgi sahifaga o'tadi.
  useEffect(() => {
    if (meta && page > meta.pages) setPage(meta.pages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta?.pages, page]);
  const totals = meta?.totals ?? { income: 0, expense: 0 };
  const flat = sort.startsWith('amount');

  const groups = (() => {
    const map = new Map();
    for (const t of items) {
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date).push(t);
    }
    return [...map.entries()];
  })();

  function changeType(value) {
    setType(value);
    const allowed = value === 'income' ? INCOME_CATEGORIES : value === 'expense' ? EXPENSE_CATEGORIES : null;
    if (allowed && category && !allowed.includes(category)) setCategory('');
  }

  function clearFilters() {
    setType('');
    setCategory('');
    setSearch('');
    setFrom('');
    setTo('');
    setMinAmount(0);
    setMaxAmount(0);
    setSort('date_desc');
  }

  // O'chirilgan yozuvni xuddi shu ma'lumot bilan qayta yaratadi (yangi id bilan).
  async function undoDelete(tx) {
    try {
      await transactionsApi.create({ type: tx.type, amount: tx.amount, category: tx.category, date: tx.date, note: tx.note });
      toast('Tranzaksiya qaytarildi');
      list.reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function confirmDelete() {
    const tx = deleting;
    setBusy(true);
    try {
      await transactionsApi.remove(tx.id);
      toast("Tranzaksiya o'chirildi", 'success', { action: { label: 'Qaytarish', onClick: () => undoDelete(tx) } });
      setDeleting(null);
      list.reload();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  // CSV tanlangan davrning (oy yoki sana oralig'i) barcha tranzaksiyalarini oladi; tur, kategoriya va qidiruv filtrlari qo'llanmaydi.
  async function exportCsv() {
    setBusy(true);
    try {
      const period = rangeActive ? { from, to } : { month };
      const all = [];
      for (let p = 1; ; p++) {
        const res = await transactionsApi.list({ ...period, page: p, limit: EXPORT_PAGE });
        all.push(...res.data);
        if (all.length >= res.meta.total || res.data.length === 0) break;
      }
      if (!all.length) return toast("Bu davrda eksport qilinadigan tranzaksiya yo'q", 'error');
      downloadCsv(`xarajatlar-${rangeActive ? `${from || 'boshidan'}_${to || 'hozirgacha'}` : month}.csv`, transactionsToCsv(all));
      toast(`${all.length} ta tranzaksiya yuklab olindi`);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  const filtered = type || category || q || rangeActive || minDebounced || maxDebounced;
  const pages = meta?.pages ?? 1;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {rangeActive ? (
          <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium dark:border-slate-800 dark:bg-slate-900">
            {from ? dateLabel(from) : 'Boshidan'} — {to ? dateLabel(to) : 'hozirgacha'}
          </p>
        ) : (
          <MonthPicker />
        )}
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setImporting(true)} disabled={busy}>
            <UploadIcon className="h-4 w-4" /> Import
          </button>
          <button className="btn-secondary" onClick={exportCsv} disabled={busy}>
            <DownloadIcon className="h-4 w-4" /> CSV
          </button>
          <button className="btn-primary hidden md:inline-flex" onClick={() => setEditing({})}>
            <PlusIcon className="h-4 w-4" /> Qo'shish
          </button>
        </div>
      </div>

      <div className="card mb-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
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

        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            onClick={() => setShowMore((v) => !v)}
            aria-expanded={showMore}
          >
            <FilterIcon className="h-4 w-4" /> Qo'shimcha filtr
          </button>
          {filtered && (
            <button type="button" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400" onClick={clearFilters}>
              Filtrlarni tozalash
            </button>
          )}
        </div>

        {showMore && (
          <div className="grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 dark:border-slate-800">
            <div>
              <label className="label" htmlFor="f-from">
                Boshlanish sanasi
              </label>
              <input id="f-from" type="date" className="input" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="f-to">
                Tugash sanasi
              </label>
              <input id="f-to" type="date" className="input" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="f-min">
                Eng kam summa
              </label>
              <AmountInput id="f-min" value={minAmount} onChange={setMinAmount} />
            </div>
            <div>
              <label className="label" htmlFor="f-max">
                Eng ko'p summa
              </label>
              <AmountInput id="f-max" value={maxAmount} onChange={setMaxAmount} />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="f-sort">
                Saralash
              </label>
              <select id="f-sort" className="input" value={sort} onChange={(e) => setSort(e.target.value)}>
                {SORTS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            {rangeActive && (
              <p className="text-xs text-slate-500 sm:col-span-2 dark:text-slate-400">
                Sana oralig'i tanlangan, shuning uchun oy tanlagichi o'chirilgan. Oyga qaytish uchun sanalarni tozalang.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 px-1 text-sm text-slate-500 dark:text-slate-400">
        <span>{meta?.total ?? 0} ta tranzaksiya</span>
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
      ) : items.length === 0 ? (
        <div className="card py-12 text-center text-sm text-slate-500">
          {filtered ? 'Filtrga mos tranzaksiya topilmadi' : "Bu oyda hali tranzaksiya yo'q"}
        </div>
      ) : (
        <div className={`space-y-4 transition-opacity ${list.loading ? 'opacity-60' : ''}`}>
          {flat ? (
            <section className="card py-1">
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((tx) => (
                  <TransactionItem key={tx.id} tx={tx} onEdit={setEditing} onDelete={setDeleting} />
                ))}
              </ul>
            </section>
          ) : (
            groups.map(([date, txs]) => (
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
            ))
          )}

          {pages > 1 && (
            <nav className="flex items-center justify-center gap-3 pt-1" aria-label="Sahifalar">
              <button className="btn-secondary px-3" onClick={() => setPage(page - 1)} disabled={page <= 1 || list.loading} aria-label="Oldingi sahifa">
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <span className="text-sm tabular-nums text-slate-600 dark:text-slate-300">
                {page} / {pages}
              </span>
              <button className="btn-secondary px-3" onClick={() => setPage(page + 1)} disabled={page >= pages || list.loading} aria-label="Keyingi sahifa">
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </nav>
          )}
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
      {importing && <ImportModal onClose={() => setImporting(false)} onDone={list.reload} />}
      {deleting && (
        <ConfirmDialog
          title="Tranzaksiyani o'chirish"
          message={`${dateLabel(deleting.date)}dagi ${formatSom(deleting.amount)} miqdoridagi yozuv o'chiriladi. Keyin "Qaytarish" tugmasi bilan tiklashingiz mumkin.`}
          onConfirm={confirmDelete}
          onClose={() => setDeleting(null)}
          busy={busy}
        />
      )}
    </>
  );
}
