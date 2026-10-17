// Takroriy tranzaksiyalar uchun sof (bazaga bog'liq bo'lmagan) mantiq.
// Barcha sanalar UTC yarim tunida. n-chi uchrashuv doim boshlanish sanasidan hisoblanadi,
// shuning uchun oylik takrorlanishda kun siljib ketmaydi (31-kun -> fevralda 28, mart oyida yana 31).

export const FREQUENCIES = ['daily', 'weekly', 'monthly'];
const DAY = 24 * 60 * 60 * 1000;

export function occurrenceDate(start, frequency, n) {
  if (frequency === 'daily') return new Date(start.getTime() + n * DAY);
  if (frequency === 'weekly') return new Date(start.getTime() + n * 7 * DAY);
  const y = start.getUTCFullYear();
  const m = start.getUTCMonth() + n;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(start.getUTCDate(), lastDay)));
}

// today gacha (shu kun ham) yaratilishi kerak bo'lgan uchrashuvlar.
export function dueOccurrences({ start, frequency, end = null, nextIndex = 0, today, limit = 366 }) {
  const dates = [];
  let n = nextIndex;
  while (dates.length < limit) {
    const d = occurrenceDate(start, frequency, n);
    if (d > today || (end && d > end)) break;
    dates.push(d);
    n += 1;
  }
  return { dates, nextIndex: n };
}

// Hali yaratilmagan (nextIndex dan boshlab) uchrashuvlar, rangeEnd (shu kun ham) gacha.
export function pendingOccurrences({ start, frequency, end = null, nextIndex = 0, rangeEnd, limit = 400 }) {
  const dates = [];
  for (let n = nextIndex; dates.length < limit; n++) {
    const d = occurrenceDate(start, frequency, n);
    if (d > rangeEnd || (end && d > end)) break;
    dates.push(d);
  }
  return dates;
}

// date yoki undan keyingi birinchi uchrashuv raqami (qoida o'zgartirilganda "bugundan boshlab" uchun).
export function firstIndexOnOrAfter(start, frequency, date, maxIndex = 20000) {
  for (let n = 0; n < maxIndex; n++) {
    if (occurrenceDate(start, frequency, n) >= date) return n;
  }
  return maxIndex;
}
