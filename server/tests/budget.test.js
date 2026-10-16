import { beforeEach, describe, expect, it } from 'vitest';
import { api, bearer, createTx, expense, registerUser } from './helpers.js';

describe('Budjetlar va ogohlantirish', () => {
  let u;
  const setBudget = (category, limit) =>
    api().put('/api/budgets').set(bearer(u.token)).send({ category, limit });
  const getBudgets = () => api().get('/api/budgets').query({ month: '2026-10' }).set(bearer(u.token));

  beforeEach(async () => {
    u = await registerUser();
  });

  it('budjetni yaratadi va yangilaydi (upsert)', async () => {
    expect((await setBudget('food', 1_000_000)).status).toBe(200);
    const res = await setBudget('food', 2_000_000);
    expect(res.body.data).toMatchObject({ category: 'food', limit: 2_000_000 });

    const list = await getBudgets();
    expect(list.body.data).toHaveLength(1);
  });

  it('daromad kategoriyasi va kasr limitni rad etadi', async () => {
    expect((await setBudget('salary', 1_000)).status).toBe(400);
    expect((await setBudget('food', 10.5)).status).toBe(400);
  });

  it('limit oshganda ogohlantirish qaytaradi, lekin tranzaksiyani saqlaydi', async () => {
    await setBudget('food', 100_000);

    const first = await createTx(u.token, expense({ amount: 70_000 }));
    expect(first.status).toBe(201);
    expect(first.body.warning).toBeNull();

    const second = await createTx(u.token, expense({ amount: 40_000 }));
    expect(second.status).toBe(201);
    expect(second.body.warning).toMatchObject({
      category: 'food',
      month: '2026-10',
      limit: 100_000,
      spent: 110_000,
      exceededBy: 10_000,
    });
    expect(second.body.warning.message).toContain('Oziq-ovqat');

    // Boshqa oydagi xarajat bu oy limitiga ta'sir qilmaydi.
    const otherMonth = await createTx(u.token, expense({ amount: 40_000, date: '2026-11-01' }));
    expect(otherMonth.body.warning).toBeNull();

    // Daromad hech qachon ogohlantirish bermaydi.
    const income = await createTx(u.token, { type: 'income', amount: 1_000_000, category: 'salary', date: '2026-10-05' });
    expect(income.body.warning).toBeNull();
  });

  it('tahrirlash orqali limit oshsa ham ogohlantiradi', async () => {
    await setBudget('transport', 50_000);
    const { body } = await createTx(u.token, expense({ category: 'transport', amount: 10_000 }));

    const upd = await api()
      .put(`/api/transactions/${body.data.id}`)
      .set(bearer(u.token))
      .send(expense({ category: 'transport', amount: 60_000 }));
    expect(upd.body.warning).toMatchObject({ spent: 60_000, exceededBy: 10_000 });
  });

  it('holatni ok / warning (80%) / exceeded deb belgilaydi', async () => {
    await setBudget('food', 100_000);
    await setBudget('transport', 100_000);
    await setBudget('health', 100_000);
    await createTx(u.token, expense({ category: 'food', amount: 50_000 }));
    await createTx(u.token, expense({ category: 'transport', amount: 80_000 }));
    await createTx(u.token, expense({ category: 'health', amount: 150_000 }));

    const byCat = Object.fromEntries((await getBudgets()).body.data.map((b) => [b.category, b]));
    expect(byCat.food).toMatchObject({ status: 'ok', percent: 50, remaining: 50_000 });
    expect(byCat.transport).toMatchObject({ status: 'warning', percent: 80 });
    expect(byCat.health).toMatchObject({ status: 'exceeded', percent: 150, remaining: -50_000 });
  });

  it("budjetni o'chiradi", async () => {
    await setBudget('food', 100_000);
    expect((await api().delete('/api/budgets/food').set(bearer(u.token))).status).toBe(204);
    expect((await api().delete('/api/budgets/food').set(bearer(u.token))).status).toBe(404);
    expect((await api().delete('/api/budgets/unknown').set(bearer(u.token))).status).toBe(400);
  });
});
