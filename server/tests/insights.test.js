import { beforeEach, describe, expect, it } from 'vitest';
import { api, bearer, createTx, expense, registerUser } from './helpers.js';

describe('Trend, prognoz va kengaytirilgan filtrlar', () => {
  let u;
  const get = (url, query = {}) => api().get(url).query(query).set(bearer(u.token));

  beforeEach(async () => {
    u = await registerUser();
  });

  it("6 oylik trend: bo'sh oylar 0 bilan to'ldiriladi, oylar tartib bilan", async () => {
    await createTx(u.token, { type: 'income', amount: 5_000_000, category: 'salary', date: '2026-10-01' });
    await createTx(u.token, expense({ amount: 100_000, date: '2026-10-03' }));
    await createTx(u.token, expense({ amount: 70_000, date: '2026-08-15' }));
    await createTx(u.token, expense({ amount: 1, date: '2026-04-30' })); // oynadan tashqarida

    const res = await get('/api/summary/trend', { month: '2026-10', months: 6 });
    expect(res.status).toBe(200);
    expect(res.body.data.map((m) => m.month)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
    expect(res.body.data[3]).toMatchObject({ month: '2026-08', income: 0, expense: 70_000, balance: -70_000 });
    expect(res.body.data[4]).toMatchObject({ income: 0, expense: 0 });
    expect(res.body.data[5]).toMatchObject({ income: 5_000_000, expense: 100_000, balance: 4_900_000 });
    expect((await get('/api/summary/trend', { months: 1 })).status).toBe(400);
  });

  it("yil chegarasidan o'tuvchi trend", async () => {
    const res = await get('/api/summary/trend', { month: '2027-02', months: 4 });
    expect(res.body.data.map((m) => m.month)).toEqual(['2026-11', '2026-12', '2027-01', '2027-02']);
  });

  it("oy oxiri prognozi: joriy oy uchun beriladi, boshqa oylar uchun null", async () => {
    await createTx(u.token, expense({ amount: 60_000, date: '2026-10-02' }));
    await createTx(u.token, expense({ amount: 40_000, date: '2026-10-09' }));

    const res = await get('/api/summary', { month: '2026-10', today: '2026-10-10' });
    expect(res.body.data.forecast).toMatchObject({
      projectedExpense: 310_000, // 100 000 + 10 000 * 21 kun
      dailyAverage: 10_000,
      daysElapsed: 10,
      daysRemaining: 21,
      upcomingRecurring: 0,
      confidence: 'medium',
    });

    const past = await get('/api/summary', { month: '2026-09', today: '2026-10-10' });
    expect(past.body.data.forecast).toBeNull();
  });

  it("budjet bo'yicha prognoz: shu tempda limitdan oshishini aytadi", async () => {
    await api().put('/api/budgets').set(bearer(u.token)).send({ category: 'food', limit: 200_000 });
    await createTx(u.token, expense({ amount: 100_000, date: '2026-10-05' }));

    const res = await get('/api/budgets', { month: '2026-10', today: '2026-10-10' });
    expect(res.body.data[0]).toMatchObject({
      status: 'ok',
      projected: 310_000,
      projectedExceeds: true,
    });

    const other = await get('/api/budgets', { month: '2026-09', today: '2026-10-10' });
    expect(other.body.data[0]).toMatchObject({ projected: null, projectedExceeds: false });
  });

  it("limitning 80% iga yetganda ogohlantirish (warning) beradi", async () => {
    await api().put('/api/budgets').set(bearer(u.token)).send({ category: 'food', limit: 100_000 });
    const below = await createTx(u.token, expense({ amount: 70_000 }));
    expect(below.body.warning).toBeNull();

    const near = await createTx(u.token, expense({ amount: 15_000 }));
    expect(near.body.warning).toMatchObject({ level: 'warning', spent: 85_000, exceededBy: 0 });

    const over = await createTx(u.token, expense({ amount: 30_000 }));
    expect(over.body.warning).toMatchObject({ level: 'exceeded', exceededBy: 15_000 });
  });

  describe("tranzaksiya ro'yxati filtrlari", () => {
    beforeEach(async () => {
      await createTx(u.token, expense({ amount: 10_000, date: '2026-10-01', note: 'a' }));
      await createTx(u.token, expense({ amount: 50_000, date: '2026-10-10', note: 'b' }));
      await createTx(u.token, expense({ amount: 90_000, date: '2026-11-05', note: 'c' }));
      await createTx(u.token, { type: 'income', amount: 1_000_000, category: 'salary', date: '2026-10-10', note: 'd' });
    });

    it("sana oralig'i (from/to, chegaralar kiritilgan) oyni e'tiborsiz qoldiradi", async () => {
      const res = await get('/api/transactions', { from: '2026-10-10', to: '2026-11-05' });
      expect(res.body.data.map((t) => t.note).sort()).toEqual(['b', 'c', 'd']);
      expect((await get('/api/transactions', { from: '2026-11-01', to: '2026-10-01' })).status).toBe(400);
    });

    it('summa oralig\'i va saralash', async () => {
      const res = await get('/api/transactions', { minAmount: 20_000, maxAmount: 100_000, sort: 'amount_desc' });
      expect(res.body.data.map((t) => t.amount)).toEqual([90_000, 50_000]);
      const asc = await get('/api/transactions', { type: 'expense', sort: 'amount_asc' });
      expect(asc.body.data.map((t) => t.amount)).toEqual([10_000, 50_000, 90_000]);
      const byDate = await get('/api/transactions', { type: 'expense', sort: 'date_asc' });
      expect(byDate.body.data.map((t) => t.note)).toEqual(['a', 'b', 'c']);
    });

    it("sahifalash va jami summalar butun filtr bo'yicha hisoblanadi", async () => {
      const res = await get('/api/transactions', { month: '2026-10', limit: 2, page: 2 });
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta).toMatchObject({
        total: 3,
        page: 2,
        pages: 2,
        totals: { income: 1_000_000, expense: 60_000 },
      });
    });
  });
});
