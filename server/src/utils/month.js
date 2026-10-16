// Barcha sanalar UTC yarim tunida saqlanadi, shuning uchun vaqt zonasi siljishi
// tranzaksiyani boshqa kunga yoki oyga o'tkazib yubormaydi.

export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function monthRange(month) {
  const [y, m] = month.split('-').map(Number);
  return {
    start: new Date(Date.UTC(y, m - 1, 1)),
    end: new Date(Date.UTC(y, m, 1)),
  };
}

export function daysInMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function currentMonth(d = new Date()) {
  return d.toISOString().slice(0, 7);
}

export function monthOf(date) {
  return date.toISOString().slice(0, 7);
}

export function isValidDateString(str) {
  if (!DATE_RE.test(str)) return false;
  const d = new Date(`${str}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === str;
}

export function parseDateOnly(str) {
  return new Date(`${str}T00:00:00.000Z`);
}
