import { beforeEach, describe, expect, it } from 'vitest';
import { api, bearer, registerUser } from './helpers.js';

describe('CSV import', () => {
  let u;
  const post = (rows, extra = {}, token = u.token) =>
    api().post('/api/transactions/import').set(bearer(token)).send({ rows, ...extra });
  const row = (o = {}) => ({ type: 'expense', amount: 25_000, category: 'food', date: '2026-10-05', note: 'Non', ...o });
  const list = () => api().get('/api/transactions').set(bearer(u.token));

  beforeEach(async () => {
    u = await registerUser();
  });

  it("yaroqli qatorlarni saqlaydi, yaroqsizlarini sabab bilan qaytaradi", async () => {
    const res = await post([
      row(),
      row({ amount: -5 }),
      row({ date: '2026-02-30' }),
      row({ category: 'salary' }),
      row({ type: 'income', category: 'salary', amount: 5_000_000, note: '' }),
    ]);
    expect(res.status).toBe(201);
    expect(res.body.data.imported).toBe(2);
    expect(res.body.data.skipped).toBe(0);
    expect(res.body.data.invalid.map((i) => i.row)).toEqual([2, 3, 4]);
    expect((await list()).body.data).toHaveLength(2);
  });

  it("takroriy qatorlarni o'tkazib yuboradi (xuddi shu faylni qayta yuklash xavfsiz)", async () => {
    const rows = [row(), row(), row({ note: 'Boshqa' })];
    expect((await post(rows)).body.data.imported).toBe(3);

    const again = await post(rows);
    expect(again.body.data).toMatchObject({ imported: 0, skipped: 3 });
    expect((await list()).body.data).toHaveLength(3);

    // Bitta qo'shimcha bir xil qator — faqat u saqlanadi.
    const more = await post([row(), row(), row(), row({ note: 'Boshqa' })]);
    expect(more.body.data).toMatchObject({ imported: 1, skipped: 3 });
  });

  it("skipDuplicates=false bo'lsa hammasini saqlaydi", async () => {
    await post([row()]);
    const res = await post([row()], { skipDuplicates: false });
    expect(res.body.data.imported).toBe(1);
    expect((await list()).body.data).toHaveLength(2);
  });

  it("o'z kategoriyalari bilan ishlaydi, boshqaning kategoriyasini rad etadi", async () => {
    const mine = (await api().post('/api/categories').set(bearer(u.token)).send({ type: 'expense', label: 'Sport' })).body.data;
    const other = await registerUser();
    const theirs = (await api().post('/api/categories').set(bearer(other.token)).send({ type: 'expense', label: 'Maxfiy' })).body.data;

    const res = await post([row({ category: mine.key }), row({ category: theirs.key })]);
    expect(res.body.data.imported).toBe(1);
    expect(res.body.data.invalid).toHaveLength(1);
  });

  it("bo'sh yoki juda katta ro'yxatni rad etadi", async () => {
    expect((await post([])).status).toBe(400);
    expect((await post(Array.from({ length: 1001 }, () => row()))).status).toBe(400);
  });

  it("boshqa foydalanuvchining takrorlari hisobga olinmaydi", async () => {
    const other = await registerUser();
    await post([row()], {}, other.token);
    expect((await post([row()])).body.data).toMatchObject({ imported: 1, skipped: 0 });
  });
});
