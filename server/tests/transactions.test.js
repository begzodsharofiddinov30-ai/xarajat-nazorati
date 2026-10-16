import { beforeEach, describe, expect, it } from 'vitest';
import { api, bearer, createTx, expense, registerUser } from './helpers.js';

describe('Tranzaksiyalar CRUD', () => {
  let u;
  beforeEach(async () => {
    u = await registerUser();
  });

  it('tranzaksiya yaratadi', async () => {
    const res = await createTx(u.token, expense());

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      type: 'expense',
      amount: 50_000,
      category: 'food',
      date: '2026-10-05',
      note: 'Korzinka',
    });
    expect(res.body.data.id).toBeTypeOf('string');
    expect(res.body.data.user).toBeUndefined();
    expect(res.body.warning).toBeNull();
  });

  it("kasr summa, noto'g'ri sana va turga mos kelmaydigan kategoriyani rad etadi", async () => {
    const cases = [
      [expense({ amount: 1500.5 }), 'amount'],
      [expense({ amount: -100 }), 'amount'],
      [expense({ date: '2026-02-30' }), 'date'],
      [expense({ category: 'salary' }), 'category'],
      [{ ...expense(), type: 'income', category: 'food' }, 'category'],
    ];
    for (const [body, path] of cases) {
      const res = await createTx(u.token, body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d) => d.path === path)).toBe(true);
    }
  });

  it("oy, tur, kategoriya va izoh bo'yicha filtrlaydi", async () => {
    await createTx(u.token, expense({ note: 'Korzinka do\'koni' }));
    await createTx(u.token, expense({ category: 'transport', amount: 20_000, note: 'Taksi' }));
    await createTx(u.token, { type: 'income', amount: 8_000_000, category: 'salary', date: '2026-10-05' });
    await createTx(u.token, expense({ date: '2026-09-28', note: 'Korzinka' }));

    const get = (q) => api().get('/api/transactions').query(q).set(bearer(u.token));

    expect((await get({})).body.meta.total).toBe(4);
    expect((await get({ month: '2026-10' })).body.data).toHaveLength(3);
    expect((await get({ month: '2026-10', type: 'expense' })).body.data).toHaveLength(2);
    expect((await get({ category: 'transport' })).body.data[0].note).toBe('Taksi');
    expect((await get({ q: 'korzinka' })).body.data).toHaveLength(2);
    expect((await get({ q: 'korzinka', month: '2026-09' })).body.data).toHaveLength(1);
    // Regex belgilari oddiy matn sifatida qidiriladi.
    expect((await get({ q: '.*' })).body.data).toHaveLength(0);

    expect((await get({ month: '2026-13' })).status).toBe(400);
  });

  it("tahrirlaydi va o'chiradi", async () => {
    const { body } = await createTx(u.token, expense());
    const id = body.data.id;

    const upd = await api()
      .put(`/api/transactions/${id}`)
      .set(bearer(u.token))
      .send(expense({ amount: 75_000, note: 'Bozor' }));
    expect(upd.status).toBe(200);
    expect(upd.body.data).toMatchObject({ id, amount: 75_000, note: 'Bozor' });

    const del = await api().delete(`/api/transactions/${id}`).set(bearer(u.token));
    expect(del.status).toBe(204);

    const again = await api().delete(`/api/transactions/${id}`).set(bearer(u.token));
    expect(again.status).toBe(404);

    const bogus = await api().delete('/api/transactions/not-an-id').set(bearer(u.token));
    expect(bogus.status).toBe(404);
  });

  it('oylik hisobotni hisoblaydi', async () => {
    await createTx(u.token, { type: 'income', amount: 5_000_000, category: 'salary', date: '2026-10-01' });
    await createTx(u.token, expense({ amount: 100_000, date: '2026-10-03' }));
    await createTx(u.token, expense({ amount: 50_000, date: '2026-10-03' }));
    await createTx(u.token, expense({ category: 'transport', amount: 30_000, date: '2026-10-31' }));
    await createTx(u.token, expense({ amount: 999_000, date: '2026-11-01' }));

    const res = await api().get('/api/summary').query({ month: '2026-10' }).set(bearer(u.token));

    expect(res.status).toBe(200);
    const s = res.body.data;
    expect(s).toMatchObject({ month: '2026-10', income: 5_000_000, expense: 180_000, balance: 4_820_000 });
    expect(s.byCategory).toEqual([
      { category: 'food', total: 150_000 },
      { category: 'transport', total: 30_000 },
    ]);
    expect(s.daily).toHaveLength(31);
    expect(s.daily[2]).toEqual({ date: '2026-10-03', total: 150_000 });
    expect(s.daily[30]).toEqual({ date: '2026-10-31', total: 30_000 });
  });
});
