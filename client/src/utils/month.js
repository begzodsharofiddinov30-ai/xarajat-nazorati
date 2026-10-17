const MONTHS = [
  'Yanvar',
  'Fevral',
  'Mart',
  'Aprel',
  'May',
  'Iyun',
  'Iyul',
  'Avgust',
  'Sentabr',
  'Oktabr',
  'Noyabr',
  'Dekabr',
];

const pad = (n) => String(n).padStart(2, '0');

// Foydalanuvchining mahalliy sanasi (UTC emas): Toshkentda yarim tundan keyin ham "bugun" to'g'ri chiqadi.
export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function currentMonth() {
  return todayStr().slice(0, 7);
}

export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function monthLabel(month) {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

// Grafik o'qi uchun qisqa nom: "Okt"
export function shortMonthLabel(month) {
  const m = Number(month.slice(5, 7));
  return MONTHS[m - 1].slice(0, 3);
}

export function dateLabel(date) {
  const [y, m, d] = date.split('-').map(Number);
  const label = `${d}-${MONTHS[m - 1].toLowerCase()}`;
  return y === new Date().getFullYear() ? label : `${label}, ${y}`;
}

export function dayOf(date) {
  return Number(date.slice(8, 10));
}
