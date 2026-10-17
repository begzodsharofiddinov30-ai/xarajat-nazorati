import { beforeEach, describe, expect, it } from 'vitest';
import { api, bearer, registerUser } from './helpers.js';

const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => iso(new Date(Date.now() - n * 24 * 60 * 60 * 1000));

describe('Takroriy tranzaksiyalar', () => {
  let u;
  const create = (body, token = u.token) => api().post('/api/recurring').set(bearer(token)).send(body);
  const txs = (token = u.token) => api().get('/api/transactions').query({ limit: 1000 }).set(bearer(token));
  const rule = (overrides = {}) => ({
    type: 'expense',
    amount: 30_000,
    category: 'utilities',
    note: 'Internet',
    frequency: 'daily',
    startDate: daysAgo(3),
    ...overrides,
  });

  beforeEach(async () => {
    u = await registerUser();
  });

  it("o'tgan sanalar uchun yozuvlarni yaratadi va qayta so'rovda takrorlamaydi", async () => {
    const res = await create(rule());
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ frequency: 'daily', active: true, nextIndex: 4 });

    const first = await txs();
    expect(first.body.data).toHaveLength(4);
    expect(first.body.data.every((t) => t.recurring === res.body.data.id)).toBe(true);

    // Qayta so'rovlar yangi yozuv qo'shmaydi.
    await txs();
    expect((await txs()).body.data).toHaveLength(4);
  });

  it("kelajakdagi boshlanish sanasi uchun hozircha hech narsa yaratmaydi", async () => {
    const future = iso(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000));
    const res = await create(rule({ startDate: future }));
    expect(res.status).toBe(201);
    expect(res.body.data.nextDate).toBe(future);
    expect((await txs()).body.data).toHaveLength(0);
  });

  it("tugash sanasidan keyin yaratmaydi", async () => {
    await create(rule({ startDate: daysAgo(5), endDate: daysAgo(3) }));
    expect((await txs()).body.data).toHaveLength(3);
  });

  it("noto'g'ri kategoriya va tugash sanasini rad etadi", async () => {
    expect((await create(rule({ category: 'salary' }))).status).toBe(400);
    expect((await create(rule({ endDate: daysAgo(10) }))).status).toBe(400);
    expect((await create(rule({ frequency: 'yearly' }))).status).toBe(400);
  });

  it("pauza qilingan qoida yangi yozuv yaratmaydi", async () => {
    const future = iso(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000));
    const { body } = await create(rule({ startDate: future }));
    const upd = await api()
      .put(`/api/recurring/${body.data.id}`)
      .set(bearer(u.token))
      .send(rule({ startDate: daysAgo(2), active: false }));
    expect(upd.status).toBe(200);
    expect(upd.body.data.active).toBe(false);
    expect((await txs()).body.data).toHaveLength(0);
  });

  it("qoida o'chirilsa, avval yaratilgan tranzaksiyalar qoladi", async () => {
    const { body } = await create(rule());
    await txs();
    expect((await api().delete(`/api/recurring/${body.data.id}`).set(bearer(u.token))).status).toBe(204);
    expect((await txs()).body.data).toHaveLength(4);
    expect((await api().delete(`/api/recurring/${body.data.id}`).set(bearer(u.token))).status).toBe(404);
  });

  it("boshqa foydalanuvchining qoidasiga tegib bo'lmaydi", async () => {
    const other = await registerUser();
    const { body } = await create(rule(), other.token);
    expect((await api().delete(`/api/recurring/${body.data.id}`).set(bearer(u.token))).status).toBe(404);
    expect((await api().get('/api/recurring').set(bearer(u.token))).body.data).toHaveLength(0);
  });
});
