import { describe, expect, it } from 'vitest';
import { projectSpending, confidenceFor } from '../src/utils/forecast.js';
import { dueOccurrences, firstIndexOnOrAfter, occurrenceDate, pendingOccurrences } from '../src/utils/recurrence.js';

const d = (s) => new Date(`${s}T00:00:00.000Z`);
const iso = (date) => date.toISOString().slice(0, 10);

describe('Takrorlanish mantiqi (sof funksiyalar)', () => {
  it("oylik takrorlanishda oy oxiri kunini to'g'ri qisqartiradi va keyingi oyda qaytaradi", () => {
    const start = d('2026-01-31');
    expect([0, 1, 2, 3].map((n) => iso(occurrenceDate(start, 'monthly', n)))).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
    // Kabisa yili
    expect(iso(occurrenceDate(d('2028-01-31'), 'monthly', 1))).toBe('2028-02-29');
  });

  it('kunlik va haftalik', () => {
    expect(iso(occurrenceDate(d('2026-10-30'), 'daily', 3))).toBe('2026-11-02');
    expect(iso(occurrenceDate(d('2026-10-30'), 'weekly', 2))).toBe('2026-11-13');
  });

  it('dueOccurrences bugungacha (shu kun ham) yaratadi va nextIndex ni oldinga suradi', () => {
    const res = dueOccurrences({ start: d('2026-08-15'), frequency: 'monthly', nextIndex: 0, today: d('2026-10-15') });
    expect(res.dates.map(iso)).toEqual(['2026-08-15', '2026-09-15', '2026-10-15']);
    expect(res.nextIndex).toBe(3);

    // Yana chaqirilsa, yangi narsa yaratilmaydi.
    const again = dueOccurrences({ start: d('2026-08-15'), frequency: 'monthly', nextIndex: 3, today: d('2026-10-15') });
    expect(again.dates).toEqual([]);
  });

  it('tugash sanasidan keyin yaratmaydi', () => {
    const res = dueOccurrences({
      start: d('2026-10-01'),
      frequency: 'daily',
      end: d('2026-10-03'),
      nextIndex: 0,
      today: d('2026-10-10'),
    });
    expect(res.dates.map(iso)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03']);
  });

  it('pendingOccurrences oy oxirigacha hali yaratilmaganlarni beradi', () => {
    const dates = pendingOccurrences({
      start: d('2026-10-01'),
      frequency: 'weekly',
      nextIndex: 2,
      rangeEnd: d('2026-10-31'),
    });
    expect(dates.map(iso)).toEqual(['2026-10-15', '2026-10-22', '2026-10-29']);
  });

  it('firstIndexOnOrAfter', () => {
    expect(firstIndexOnOrAfter(d('2026-10-01'), 'daily', d('2026-10-05'))).toBe(4);
    expect(firstIndexOnOrAfter(d('2026-12-01'), 'monthly', d('2026-10-05'))).toBe(0);
    expect(firstIndexOnOrAfter(d('2026-08-31'), 'monthly', d('2026-10-05'))).toBe(2);
  });
});

describe('Oy oxiri prognozi (sof funksiya)', () => {
  it("o'zgaruvchan xarajatni kunlik o'rtacha bo'yicha davom ettiradi", () => {
    const p = projectSpending({ spent: 100_000, daysElapsed: 10, daysInMonth: 31 });
    expect(p).toEqual({ projected: 310_000, dailyAverage: 10_000, daysElapsed: 10, daysRemaining: 21 });
  });

  it("takroriy to'lovlar tempga ko'paytirilmaydi, kutilayotgani oxirida qo'shiladi", () => {
    // 1-kuni 1 000 000 ijara to'langan, qolgan 90 000 — o'zgaruvchan xarajat.
    const p = projectSpending({
      spent: 1_090_000,
      recurringSpent: 1_000_000,
      upcomingRecurring: 200_000,
      daysElapsed: 10,
      daysInMonth: 30,
    });
    // o'rtacha 9 000/kun * 20 kun = 180 000; jami 1 090 000 + 180 000 + 200 000
    expect(p.projected).toBe(1_470_000);
  });

  it('oy tugagan kuni prognoz haqiqiy xarajatga teng', () => {
    expect(projectSpending({ spent: 500_000, daysElapsed: 31, daysInMonth: 31 }).projected).toBe(500_000);
  });

  it('ishonch darajasi', () => {
    expect([2, 8, 20].map(confidenceFor)).toEqual(['low', 'medium', 'high']);
  });
});
