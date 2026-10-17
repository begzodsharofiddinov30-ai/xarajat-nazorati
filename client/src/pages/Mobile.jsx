import { useState } from 'react';
import { Link } from 'react-router';
import { phonesApi } from '../api/phones.js';
import { recurringApi } from '../api/recurring.js';
import { transactionsApi } from '../api/transactions.js';
import { AmountInput } from '../components/AmountInput.jsx';
import { MonthPicker } from '../components/MonthPicker.jsx';
import { ConfirmDialog, Modal } from '../components/Modal.jsx';
import { PencilIcon, PlusIcon, RepeatIcon, TrashIcon } from '../components/icons.jsx';
import { useMonth } from '../context/MonthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { formatCompact, formatSom } from '../utils/format.js';
import { dateLabel, todayStr } from '../utils/month.js';
import { OPERATORS, detectOperator, formatPhone, normalizePhone } from '../utils/phone.js';

const PRESETS = [10_000, 20_000, 30_000, 50_000, 100_000];

function FieldError({ children }) {
  return children ? <p className="mt-1 text-sm text-red-600 dark:text-red-400">{children}</p> : null;
}

function OperatorBadge({ operator, className = '' }) {
  const op = OPERATORS[operator] ?? OPERATORS.other;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${className}`} style={{ background: op.bg, color: op.fg }}>
      {op.label}
    </span>
  );
}

// Bir oy keyingi shu kun (31-yanvar -> 28/29-fevral): avtomatik to'lov keyingi oydan boshlanadi.
function nextMonthSameDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d, last))).toISOString().slice(0, 10);
}

function PhoneForm({ initial, onClose, onSaved }) {
  const editing = Boolean(initial?.id);
  const [label, setLabel] = useState(initial?.label ?? '');
  const [number, setNumber] = useState(initial?.number ? formatPhone(initial.number) : '+998 ');
  const [operator, setOperator] = useState(initial?.operator ?? '');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const normalized = normalizePhone(number);
  // Operator qo'lda tanlanmagan bo'lsa, raqamdan aniqlanadi.
  const shownOperator = operator || (normalized ? detectOperator(normalized) : '');

  async function submit(e) {
    e.preventDefault();
    if (!normalized) return setErrors({ number: "Raqam noto'g'ri. Masalan: +998 90 123 45 67" });
    setBusy(true);
    setErrors({});
    try {
      const body = { label, number: normalized, ...(operator && { operator }) };
      onSaved(editing ? await phonesApi.update(initial.id, body) : await phonesApi.create(body));
      onClose();
    } catch (err) {
      setErrors(err.code === 'VALIDATION_ERROR' ? err.fieldErrors : { form: err.message });
      setBusy(false);
    }
  }

  return (
    <Modal title={editing ? 'Raqamni tahrirlash' : "Raqam qo'shish"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label className="label" htmlFor="ph-label">
            Nomi
          </label>
          <input id="ph-label" className="input" maxLength={30} placeholder="Masalan: Mening raqamim, Onam" value={label} autoFocus onChange={(e) => setLabel(e.target.value)} />
          <FieldError>{errors.label}</FieldError>
        </div>
        <div>
          <label className="label" htmlFor="ph-number">
            Telefon raqami
          </label>
          <input id="ph-number" className="input tabular-nums" type="tel" inputMode="tel" autoComplete="tel" value={number} onChange={(e) => setNumber(e.target.value)} />
          <FieldError>{errors.number}</FieldError>
        </div>
        <div>
          <label className="label" htmlFor="ph-operator">
            Operator
          </label>
          <select id="ph-operator" className="input" value={operator} onChange={(e) => setOperator(e.target.value)}>
            <option value="">Avtomatik{shownOperator && !operator ? `: ${OPERATORS[shownOperator].label}` : ''}</option>
            {Object.entries(OPERATORS).map(([key, op]) => (
              <option key={key} value={key}>
                {op.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Raqam boshqa operatorga o'tkazilgan bo'lsa, qo'lda tanlang.</p>
        </div>
        <FieldError>{errors.form}</FieldError>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>
            Bekor qilish
          </button>
          <button className="btn-primary flex-1" disabled={busy || !label.trim()}>
            {busy ? 'Saqlanmoqda…' : 'Saqlash'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PayForm({ phone, onClose, onSaved }) {
  const toast = useToast();
  const [amount, setAmount] = useState(phone.lastPayment?.amount ?? 0);
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState('');
  const [monthly, setMonthly] = useState(false);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!amount) return setErrors({ amount: 'Summani kiriting' });
    setBusy(true);
    setErrors({});
    try {
      const res = await transactionsApi.create({ type: 'expense', category: 'mobile', phone: phone.id, amount, date, note });
      if (monthly) {
        // Bugungi to'lov hozir yozildi, shuning uchun avtomatik to'lov keyingi oydan boshlanadi.
        await recurringApi.create({
          type: 'expense',
          category: 'mobile',
          phone: phone.id,
          amount,
          note: note || `${phone.label} balansi`,
          frequency: 'monthly',
          startDate: nextMonthSameDay(date),
          active: true,
        });
      }
      if (res.warning) toast(res.warning.message, 'warning');
      else toast(monthly ? "To'lov qo'shildi, keyingi oydan har oy o'zi qo'shiladi" : "To'lov qo'shildi");
      onSaved();
      onClose();
    } catch (err) {
      setErrors(err.code === 'VALIDATION_ERROR' ? err.fieldErrors : { form: err.message });
      setBusy(false);
    }
  }

  return (
    <Modal title="Balansni to'ldirish" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="flex items-center gap-2 rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
          <OperatorBadge operator={phone.operator} />
          <span className="min-w-0 truncate text-sm font-medium">{phone.label}</span>
          <span className="ml-auto text-sm text-slate-500 tabular-nums dark:text-slate-400">{formatPhone(phone.number)}</span>
        </div>
        <div>
          <label className="label" htmlFor="pay-amount">
            Summa
          </label>
          <AmountInput id="pay-amount" value={amount} onChange={setAmount} autoFocus invalid={Boolean(errors.amount)} />
          <div className="mt-2 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setAmount(p)}
                className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                  amount === p
                    ? 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-500/10 dark:text-brand-300'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {formatCompact(p)}
              </button>
            ))}
          </div>
          <FieldError>{errors.amount}</FieldError>
        </div>
        <div>
          <label className="label" htmlFor="pay-date">
            Sana
          </label>
          <input id="pay-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          <FieldError>{errors.date}</FieldError>
        </div>
        <div>
          <label className="label" htmlFor="pay-note">
            Izoh <span className="font-normal text-slate-400">(ixtiyoriy)</span>
          </label>
          <input id="pay-note" className="input" maxLength={200} placeholder="Masalan: Click orqali, oylik tarif" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        {!phone.autoPay && (
          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-3 text-sm dark:border-slate-700">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={monthly} onChange={(e) => setMonthly(e.target.checked)} />
            <span>
              <span className="block font-medium">Har oy avtomatik qo'shish</span>
              <span className="block text-slate-500 dark:text-slate-400">
                Oylik tarif to'lovi har oy {Number(date.slice(8, 10))}-sanada xarajatlarga o'zi yoziladi
              </span>
            </span>
          </label>
        )}
        <FieldError>{errors.form ?? errors.phone}</FieldError>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>
            Bekor qilish
          </button>
          <button className="btn-primary flex-1" disabled={busy}>
            {busy ? 'Saqlanmoqda…' : "To'lovni qo'shish"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function History({ phone, version }) {
  const list = useAsync(() => transactionsApi.list({ phone: phone.id, limit: 10, sort: 'date_desc' }), [phone.id, version]);
  if (list.loading && !list.data) return <div className="mt-3 h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />;
  const items = list.data?.data ?? [];
  if (!items.length) return <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Hali to'lov yo'q.</p>;
  return (
    <ul className="mt-3 divide-y divide-slate-100 rounded-2xl bg-slate-50 px-3 text-sm dark:divide-slate-800 dark:bg-slate-800/50">
      {items.map((t) => (
        <li key={t.id} className="flex items-center gap-3 py-2">
          <span className="w-24 shrink-0 text-slate-500 dark:text-slate-400">{dateLabel(t.date)}</span>
          <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">
            {t.recurring && <RepeatIcon className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />}
            {t.note}
          </span>
          <span className="shrink-0 font-semibold tabular-nums">{formatSom(t.amount)}</span>
        </li>
      ))}
      {list.data.meta.total > items.length && (
        <li className="py-2 text-center text-xs text-slate-500 dark:text-slate-400">
          Oxirgi {items.length} ta to'lov ko'rsatildi (jami {list.data.meta.total} ta)
        </li>
      )}
    </ul>
  );
}

function PhoneCard({ phone, version, onPay, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="card">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl" style={{ background: OPERATORS[phone.operator]?.bg }} aria-hidden="true">
          📱
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold">{phone.label}</p>
            <OperatorBadge operator={phone.operator} />
          </div>
          <p className="text-sm text-slate-500 tabular-nums dark:text-slate-400">{formatPhone(phone.number)}</p>
        </div>
        <div className="-mt-1 -mr-2 flex shrink-0">
          <button className="btn-icon" onClick={() => onEdit(phone)} aria-label="Tahrirlash">
            <PencilIcon className="h-4 w-4" />
          </button>
          <button className="btn-icon hover:text-red-600 dark:hover:text-red-400" onClick={() => onDelete(phone)} aria-label="O'chirish">
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Shu oy to'langan</p>
          <p className="text-lg font-bold tabular-nums">{formatSom(phone.paid)}</p>
          {phone.count > 1 && <p className="text-xs text-slate-500 dark:text-slate-400">{phone.count} ta to'lov</p>}
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Oxirgi to'lov</p>
          {phone.lastPayment ? (
            <>
              <p className="font-semibold tabular-nums">{formatSom(phone.lastPayment.amount)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{dateLabel(phone.lastPayment.date)}</p>
            </>
          ) : (
            <p className="text-slate-400">Hali yo'q</p>
          )}
        </div>
      </div>

      {phone.autoPay && (
        <Link
          to="/recurring"
          className="mt-3 flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-xs text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <RepeatIcon className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">
            {phone.autoPay.active
              ? `Har oy ${formatSom(phone.autoPay.amount)}${phone.autoPay.nextDate ? ` · keyingisi ${dateLabel(phone.autoPay.nextDate)}` : ''}`
              : `Avtomatik to'lov pauzada (${formatSom(phone.autoPay.amount)})`}
          </span>
          <span className="shrink-0 font-semibold">Boshqarish</span>
        </Link>
      )}

      <div className="mt-4 flex gap-2">
        <button className="btn-primary flex-1" onClick={() => onPay(phone)}>
          <PlusIcon className="h-4 w-4" /> To'lov qo'shish
        </button>
        <button className="btn-secondary" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          Tarix
        </button>
      </div>
      {open && <History phone={phone} version={version} />}
    </li>
  );
}

function TrendBars({ trend }) {
  const max = Math.max(...trend.map((t) => t.total), 1);
  const MONTHS = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'];
  return (
    <div className="mt-4 flex h-24 items-end gap-2" role="img" aria-label="Oxirgi 6 oy bo'yicha mobil aloqa xarajatlari">
      {trend.map((t, i) => (
        <div key={t.month} className="flex flex-1 flex-col items-center gap-1" title={`${t.month}: ${formatSom(t.total)}`}>
          <span className="text-[10px] text-slate-500 tabular-nums dark:text-slate-400">{t.total ? formatCompact(t.total) : ''}</span>
          <div
            className={`w-full rounded-md ${i === trend.length - 1 ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'}`}
            style={{ height: `${Math.max((t.total / max) * 56, t.total ? 4 : 2)}px` }}
          />
          <span className="text-[10px] text-slate-500 dark:text-slate-400">{MONTHS[Number(t.month.slice(5)) - 1]}</span>
        </div>
      ))}
    </div>
  );
}

export default function Mobile() {
  const toast = useToast();
  const { month } = useMonth();
  const list = useAsync(() => phonesApi.list(month), [month]);
  const [editing, setEditing] = useState(null); // null | {} | phone
  const [paying, setPaying] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  // To'lov qo'shilganda ochiq tarix ro'yxatlari ham yangilanadi.
  const [version, setVersion] = useState(0);

  const phones = list.data?.data ?? [];
  const meta = list.data?.meta;

  const reload = () => {
    setVersion((v) => v + 1);
    list.reload();
  };

  async function confirmDelete() {
    setBusy(true);
    try {
      await phonesApi.remove(deleting.id);
      toast("Raqam o'chirildi. To'lovlar xarajatlarda saqlanib qoldi");
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
          <h1 className="text-lg font-semibold">Mobil aloqa</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Telefon balansi to'lovlari raqamlar bo'yicha</p>
        </div>
        <MonthPicker />
      </div>

      {list.error ? (
        <div className="card text-center text-sm text-red-600 dark:text-red-400">
          {list.error.message}{' '}
          <button className="underline" onClick={list.reload}>
            Qayta urinish
          </button>
        </div>
      ) : list.loading && !list.data ? (
        <div className="space-y-3">
          <div className="card h-40 animate-pulse" />
          <div className="card h-48 animate-pulse" />
        </div>
      ) : (
        <div className="space-y-4">
          <section className="card">
            <p className="text-sm text-slate-500 dark:text-slate-400">Shu oy mobil aloqaga</p>
            <p className="text-2xl font-bold tabular-nums">{formatSom(meta.total)}</p>
            {meta.unassigned > 0 && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Shundan {formatSom(meta.unassigned)} hech qaysi raqamga bog'lanmagan ("Mobil aloqa" kategoriyasidagi boshqa yozuvlar)
              </p>
            )}
            <TrendBars trend={meta.trend} />
          </section>

          {phones.length === 0 ? (
            <div className="card py-12 text-center">
              <span className="text-3xl" aria-hidden="true">
                📱
              </span>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Telefon raqamlaringizni qo'shing: o'zingizniki, oila a'zolariniki. Har biriga qancha to'layotganingiz ko'rinib turadi.
              </p>
              <button className="btn-primary mt-3" onClick={() => setEditing({})}>
                <PlusIcon className="h-4 w-4" /> Raqam qo'shish
              </button>
            </div>
          ) : (
            <>
              <ul className="space-y-3">
                {phones.map((p) => (
                  <PhoneCard key={p.id} phone={p} version={version} onPay={setPaying} onEdit={setEditing} onDelete={setDeleting} />
                ))}
              </ul>
              <button className="btn-secondary w-full" onClick={() => setEditing({})}>
                <PlusIcon className="h-4 w-4" /> Yana raqam qo'shish
              </button>
            </>
          )}
        </div>
      )}

      {editing && (
        <PhoneForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            toast(editing.id ? 'Raqam yangilandi' : "Raqam qo'shildi");
            list.reload();
          }}
        />
      )}
      {paying && <PayForm phone={paying} onClose={() => setPaying(null)} onSaved={reload} />}
      {deleting && (
        <ConfirmDialog
          title="Raqamni o'chirish"
          message={`"${deleting.label}" (${formatPhone(deleting.number)}) o'chiriladi. Unga qilingan to'lovlar xarajatlarda qoladi.`}
          onConfirm={confirmDelete}
          onClose={() => setDeleting(null)}
          busy={busy}
        />
      )}
    </>
  );
}
