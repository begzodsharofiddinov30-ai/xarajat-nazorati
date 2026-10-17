import { beforeEach, describe, expect, it } from 'vitest';
import { api, bearer, createTx, expense, registerUser } from './helpers.js';

describe("Foydalanuvchining o'z kategoriyalari", () => {
  let u;
  const create = (body, token = u.token) => api().post('/api/categories').set(bearer(token)).send(body);

  beforeEach(async () => {
    u = await registerUser();
  });

  it('kategoriya yaratadi va ro\'yxatda qaytaradi', async () => {
    const res = await create({ type: 'expense', label: 'Uy hayvonlari', icon: '🐶' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ type: 'expense', label: 'Uy hayvonlari', icon: '🐶', custom: true });
    expect(res.body.data.key).toBe(`c_${res.body.data.id}`);

    const list = await api().get('/api/categories').set(bearer(u.token));
    expect(list.body.data).toHaveLength(1);
  });

  it('bir xil nomni ikki marta qabul qilmaydi, qisqa nomni rad etadi', async () => {
    await create({ type: 'expense', label: 'Sport' });
    expect((await create({ type: 'expense', label: 'Sport' })).status).toBe(409);
    expect((await create({ type: 'expense', label: 'S' })).status).toBe(400);
  });

  it("tranzaksiyada ishlatiladi, lekin turga mos bo'lishi shart", async () => {
    const cat = (await create({ type: 'expense', label: 'Sport' })).body.data;

    const ok = await createTx(u.token, expense({ category: cat.key }));
    expect(ok.status).toBe(201);
    expect(ok.body.data.category).toBe(cat.key);

    const wrongType = await createTx(u.token, { type: 'income', amount: 1000, category: cat.key, date: '2026-10-05' });
    expect(wrongType.status).toBe(400);
    expect(wrongType.body.error.details[0].path).toBe('category');
  });

  it("boshqa foydalanuvchining kategoriyasini ishlata olmaydi", async () => {
    const other = await registerUser();
    const cat = (await create({ type: 'expense', label: 'Maxfiy' }, other.token)).body.data;
    expect((await createTx(u.token, expense({ category: cat.key }))).status).toBe(400);
    expect((await api().delete(`/api/categories/${cat.id}`).set(bearer(u.token))).status).toBe(404);
  });

  it("budjet va ogohlantirishda ishlaydi (nomi bilan)", async () => {
    const cat = (await create({ type: 'expense', label: 'Sport' })).body.data;
    const put = await api().put('/api/budgets').set(bearer(u.token)).send({ category: cat.key, limit: 100_000 });
    expect(put.status).toBe(200);

    const res = await createTx(u.token, expense({ category: cat.key, amount: 150_000 }));
    expect(res.body.warning).toMatchObject({ level: 'exceeded', exceededBy: 50_000 });
    expect(res.body.warning.message).toContain('Sport');
  });

  it("ishlatilayotgan kategoriyani o'chirib bo'lmaydi (409), bo'shini mumkin", async () => {
    const used = (await create({ type: 'expense', label: 'Ishlatilgan' })).body.data;
    const free = (await create({ type: 'expense', label: "Bo'sh" })).body.data;
    await createTx(u.token, expense({ category: used.key }));

    const blocked = await api().delete(`/api/categories/${used.id}`).set(bearer(u.token));
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe('CATEGORY_IN_USE');
    expect(blocked.body.error.details).toEqual({ transactions: 1, recurring: 0 });

    expect((await api().delete(`/api/categories/${free.id}`).set(bearer(u.token))).status).toBe(204);
  });

  it('nomi va ikonkasini yangilaydi', async () => {
    const cat = (await create({ type: 'income', label: 'Dividend' })).body.data;
    const res = await api().put(`/api/categories/${cat.id}`).set(bearer(u.token)).send({ label: 'Dividendlar', icon: '📈' });
    expect(res.body.data).toMatchObject({ label: 'Dividendlar', icon: '📈', type: 'income' });
  });
});
