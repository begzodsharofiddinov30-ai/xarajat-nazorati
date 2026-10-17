// CSV import uchun sof funksiyalar (React'ga bog'liq emas). Eksport formati: Sana, Tur, Kategoriya, Summa, Izoh.

// Qo'shtirnoq, vergul/nuqtali vergul ajratgich, CRLF va BOM bilan ishlaydi. Qatorlar massivi qaytaradi.
export function parseCsv(text) {
  const src = String(text ?? '').replace(/^\uFEFF/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';

  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      row.push(cell);
      cell = '';
      rows.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

const norm = (s) => String(s ?? '').trim().toLowerCase().replace(/[\u2018\u2019\u02bb\u02bc`]/g, "'");

const HEADERS = {
  date: ['sana', 'date', 'kun'],
  type: ['tur', 'type'],
  category: ['kategoriya', 'category'],
  amount: ['summa', 'amount', 'miqdor'],
  note: ['izoh', 'note', 'description', 'comment', 'tavsif'],
};

function findColumns(header) {
  const names = header.map(norm);
  const cols = {};
  for (const [field, aliases] of Object.entries(HEADERS)) {
    const idx = names.findIndex((n) => aliases.some((a) => n === a || n.startsWith(`${a} `) || n.startsWith(`${a}(`)));
    if (idx !== -1) cols[field] = idx;
  }
  return cols;
}

export function parseDate(value) {
  const s = String(value ?? '').trim();
  let y;
  let m;
  let d;
  let match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) [, y, m, d] = match;
  else if ((match = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/))) [, d, m, y] = match;
  else return null;
  const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const date = new Date(`${iso}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === iso ? iso : null;
}

// "1 250 000", "1,250,000", "-50000", "50 000 so'm", "1500.50" -> butun son (kasr yaxlitlanadi)
export function parseAmountCell(value) {
  let s = String(value ?? '').replace(/[\s\u00a0]/g, '').replace(/so'?m|uzs/gi, '');
  if (!s) return null;
  const negative = /^[-\u2212(]/.test(s);
  s = s.replace(/[^0-9.,]/g, '');
  if (!s) return null;
  // Oxirgi ajratgich 1-2 raqamdan keyin bo'lsa kasr, aks holda minglik ajratgich.
  const frac = s.match(/[.,](\d{1,2})$/);
  const digits = frac ? s.slice(0, -frac[0].length).replace(/[.,]/g, '') : s.replace(/[.,]/g, '');
  const n = Number(digits) + (frac ? Number(`0.${frac[1]}`) : 0);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  return negative ? -rounded : rounded;
}

const INCOME_WORDS = ['daromad', 'income', 'kirim', 'plus'];
const EXPENSE_WORDS = ['xarajat', 'expense', 'chiqim', 'minus'];

function resolveType(typeCell, amount) {
  const t = norm(typeCell);
  if (INCOME_WORDS.includes(t)) return 'income';
  if (EXPENSE_WORDS.includes(t)) return 'expense';
  if (t) return null;
  // Tur ustuni bo'lmasa, ishora bo'yicha: manfiy — xarajat (eksport formati bilan bir xil).
  return amount < 0 ? 'expense' : 'income';
}

const FALLBACK = { expense: 'other', income: 'other_income' };

// rows — parseCsv natijasi, index — categoryIndex() natijasi.
// Qaytaradi: { items: [{ row, type, amount, category, date, note, guessed }], errors: [{ row, message }] }
export function mapRows(rows, index) {
  if (rows.length < 2) return { items: [], errors: [{ row: 0, message: "Faylda ma'lumot qatorlari yo'q" }] };

  const cols = findColumns(rows[0]);
  if (cols.date === undefined || cols.amount === undefined) {
    return {
      items: [],
      errors: [{ row: 0, message: "Sarlavha topilmadi: kamida 'Sana' va 'Summa' ustunlari kerak" }],
    };
  }

  const items = [];
  const errors = [];
  rows.slice(1).forEach((cells, i) => {
    const row = i + 2; // faylda ko'ringan qator raqami (1-qator sarlavha)
    const date = parseDate(cells[cols.date]);
    const raw = parseAmountCell(cells[cols.amount]);
    if (!date) return errors.push({ row, message: `Sana tushunarsiz: "${cells[cols.date] ?? ''}"` });
    if (raw === null || raw === 0) return errors.push({ row, message: `Summa tushunarsiz: "${cells[cols.amount] ?? ''}"` });

    const type = resolveType(cols.type === undefined ? '' : cells[cols.type], raw);
    if (!type) return errors.push({ row, message: `Tur tushunarsiz: "${cells[cols.type]}"` });

    const label = norm(cols.category === undefined ? '' : cells[cols.category]);
    const list = index[type];
    const found = label && list.find((c) => norm(c.label) === label || c.key === label);
    const category = found ? found.key : FALLBACK[type];

    items.push({
      row,
      type,
      amount: Math.abs(raw),
      category,
      date,
      note: String(cells[cols.note] ?? '').trim().slice(0, 200),
      guessed: !found,
    });
  });
  return { items, errors };
}
