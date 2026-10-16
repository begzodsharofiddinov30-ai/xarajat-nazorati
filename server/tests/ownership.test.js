import { beforeEach, describe, expect, it } from 'vitest';
import { api, bearer, createTx, expense, registerUser } from './helpers.js';

describe("Egalik: foydalanuvchilar bir-birining ma'lumotini ko'ra olmaydi", () => {
  let alice;
  let bob;
  let aliceTxId;

  beforeEach(async () => {
    alice = await registerUser({ name: 'Alice' });
    bob = await registerUser({ name: 'Bob' });
    const res = await createTx(alice.token, expense({ amount: 120_000 }));
    aliceTxId = res.body.data.id;
    await api().put('/api/budgets').set(bearer(alice.token)).send({ category: 'food', limit: 1_000_000 });
  });

  it("ro'yxat va hisobotda boshqaning tranzaksiyasi ko'rinmaydi", async () => {
    const list = await api().get('/api/transactions').set(bearer(bob.token));
    expect(list.body.data).toHaveLength(0);

    const summary = await api().get('/api/summary').query({ month: '2026-10' }).set(bearer(bob.token));
    expect(summary.body.data.expense).toBe(0);
  });

  it("boshqaning tranzaksiyasini tahrirlay va o'chira olmaydi (404)", async () => {
    const upd = await api()
      .put(`/api/transactions/${aliceTxId}`)
      .set(bearer(bob.token))
      .send(expense({ amount: 1 }));
    expect(upd.status).toBe(404);

    const del = await api().delete(`/api/transactions/${aliceTxId}`).set(bearer(bob.token));
    expect(del.status).toBe(404);

    const aliceList = await api().get('/api/transactions').set(bearer(alice.token));
    expect(aliceList.body.data).toHaveLength(1);
    expect(aliceList.body.data[0].amount).toBe(120_000);
  });

  it("budjetlar alohida: Bob Alice budjetini ko'rmaydi va o'chira olmaydi", async () => {
    const list = await api().get('/api/budgets').set(bearer(bob.token));
    expect(list.body.data).toHaveLength(0);

    const del = await api().delete('/api/budgets/food').set(bearer(bob.token));
    expect(del.status).toBe(404);

    // Bob o'z budjetini qo'yadi, Alice budjeti o'zgarmaydi.
    await api().put('/api/budgets').set(bearer(bob.token)).send({ category: 'food', limit: 5 });
    const aliceBudgets = await api().get('/api/budgets').set(bearer(alice.token));
    expect(aliceBudgets.body.data[0].limit).toBe(1_000_000);
  });

  it("Bobning xarajati Alice budjeti ogohlantirishiga ta'sir qilmaydi", async () => {
    await createTx(bob.token, expense({ amount: 5_000_000 }));
    const budgets = await api().get('/api/budgets').query({ month: '2026-10' }).set(bearer(alice.token));
    expect(budgets.body.data[0].spent).toBe(120_000);
  });
});
