import { useState } from 'react';
import { transactionsApi } from '../api/transactions.js';
import { useToast } from '../context/ToastContext.jsx';
import { CATEGORY_LABELS, categoryIndex } from '../utils/categories.js';
import { mapRows, parseCsv } from '../utils/csvImport.js';
import { formatSom } from '../utils/format.js';
import { dateLabel } from '../utils/month.js';
import { UploadIcon } from './icons.jsx';
import { Modal } from './Modal.jsx';

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const CHUNK = 1000; // server bir so'rovda shuncha qatorni qabul qiladi
const PREVIEW_ROWS = 6;

export function ImportModal({ onClose, onDone }) {
  const toast = useToast();
  const [preview, setPreview] = useState(null); // { fileName, items, errors }
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function pickFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    if (file.size > MAX_FILE_SIZE) return setError("Fayl juda katta (eng ko'pi bilan 2 MB)");
    try {
      const { items, errors } = mapRows(parseCsv(await file.text()), categoryIndex());
      setPreview({ fileName: file.name, items, errors });
    } catch {
      setError("Faylni o'qib bo'lmadi. CSV format ekanini tekshiring");
    }
  }

  async function submit() {
    setBusy(true);
    setError('');
    const total = { imported: 0, skipped: 0, invalid: [] };
    try {
      // Qatorlar 1000 tadan bo'laklab yuboriladi. Server qaytargan qator raqami bo'lak ichidagi o'rin, shuning uchun fayldagi raqamga qaytariladi.
      for (let i = 0; i < preview.items.length; i += CHUNK) {
        const chunk = preview.items.slice(i, i + CHUNK);
        const rows = chunk.map(({ type, amount, category, date, note }) => ({ type, amount, category, date, note }));
        const res = await transactionsApi.import(rows, skipDuplicates);
        total.imported += res.imported;
        total.skipped += res.skipped;
        total.invalid.push(...res.invalid.map((r) => ({ row: chunk[r.row - 1]?.row ?? r.row, message: r.message })));
      }
      setResult(total);
      if (total.imported) {
        toast(`${total.imported} ta tranzaksiya import qilindi`);
        onDone?.();
      }
    } catch (err) {
      // Bo'lak muvaffaqiyatli o'tgan bo'lsa ham xato chiqishi mumkin: qayta urinsa, takrorlar o'tkazib yuboriladi.
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const guessed = preview?.items.filter((i) => i.guessed).length ?? 0;

  return (
    <Modal title="CSV import" onClose={onClose}>
      {result ? (
        <div className="space-y-3 text-sm">
          <p>
            <b>{result.imported}</b> ta qo'shildi
            {result.skipped > 0 && <>, <b>{result.skipped}</b> ta takror o'tkazib yuborildi</>}
            {result.invalid.length > 0 && <>, <b>{result.invalid.length}</b> ta qator yaroqsiz</>}.
          </p>
          {result.invalid.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5 text-red-600 dark:text-red-400">
              {result.invalid.slice(0, 5).map((r) => (
                <li key={r.row}>
                  {r.row}-qator: {r.message}
                </li>
              ))}
            </ul>
          )}
          <button className="btn-primary w-full" onClick={onClose}>
            Yopish
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Ustunlar: <b>Sana, Tur, Kategoriya, Summa, Izoh</b> (CSV eksport formati). "Tur" bo'lmasa, manfiy summa xarajat
            hisoblanadi. Sana: 2026-10-05 yoki 05.10.2026.
          </p>

          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 transition hover:border-slate-400 dark:border-slate-700 dark:text-slate-400">
            <UploadIcon className="h-6 w-6" />
            <span>{preview ? preview.fileName : 'CSV faylni tanlang'}</span>
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={pickFile} />
          </label>

          {preview && (
            <>
              <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
                <p>
                  Tayyor: <b>{preview.items.length}</b> ta qator
                  {preview.errors.length > 0 && (
                    <>
                      {' '}
                      · Yaroqsiz: <b className="text-red-600 dark:text-red-400">{preview.errors.length}</b>
                    </>
                  )}
                </p>
                {guessed > 0 && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {guessed} ta qatorda kategoriya topilmadi: ular "Boshqa" ga qo'shiladi.
                  </p>
                )}
              </div>

              {preview.items.length > 0 && (
                <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                  {preview.items.slice(0, PREVIEW_ROWS).map((i) => (
                    <li key={i.row} className="flex items-center gap-2 py-1.5">
                      <span className="w-20 shrink-0 text-xs text-slate-500">{dateLabel(i.date)}</span>
                      <span className="min-w-0 flex-1 truncate">
                        {i.note || CATEGORY_LABELS[i.category]}
                        {i.guessed && <span className="text-slate-400"> (taxminiy)</span>}
                      </span>
                      <span className={`shrink-0 tabular-nums ${i.type === 'income' ? 'text-emerald-700 dark:text-emerald-400' : ''}`}>
                        {formatSom(i.type === 'income' ? i.amount : -i.amount, { sign: true })}
                      </span>
                    </li>
                  ))}
                  {preview.items.length > PREVIEW_ROWS && (
                    <li className="py-1.5 text-xs text-slate-500">…va yana {preview.items.length - PREVIEW_ROWS} ta</li>
                  )}
                </ul>
              )}

              {preview.errors.length > 0 && (
                <ul className="list-disc space-y-0.5 pl-5 text-xs text-red-600 dark:text-red-400">
                  {preview.errors.slice(0, 4).map((r) => (
                    <li key={`${r.row}-${r.message}`}>
                      {r.row ? `${r.row}-qator: ` : ''}
                      {r.message}
                    </li>
                  ))}
                  {preview.errors.length > 4 && <li>…va yana {preview.errors.length - 4} ta</li>}
                </ul>
              )}

              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                />
                <span>
                  Takrorlarni o'tkazib yuborish
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    Sana, tur, summa, kategoriya va izohi bir xil mavjud yozuvlar qayta qo'shilmaydi.
                  </span>
                </span>
              </label>
            </>
          )}

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex gap-2">
            <button className="btn-secondary flex-1" onClick={onClose}>
              Bekor qilish
            </button>
            <button className="btn-primary flex-1" onClick={submit} disabled={busy || !preview?.items.length}>
              {busy ? 'Yuklanmoqda…' : `Import (${preview?.items.length ?? 0})`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
