import { beforeEach, describe, expect, it } from 'vitest';
import { api, bearer, registerUser } from './helpers.js';

describe("Jamg'arma maqsadlari", () => {
  let u;
  const create = (body = {}, token = u.token) =>
    api().post('/api/goals').set(bearer(token)).send({ name: 'Noutbuk', targetAmount: 10_000_000, ...body });
  const contribute = (id, body, token = u.token) =>
    api().post(`/api/goals/${id}/contributions`).set(bearer(token)).send(body);

  beforeEach(async () => {
    u = await registerUser();
  });

  it('maqsad yaratadi va boshida 0% bo\'ladi', async () => {
    const res = await create();
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ name: 'Noutbuk', targetAmount: 10_000_000, saved: 0, percent: 0, completed: false });
  });

  it("mablag' qo'shadi, foiz va qolgan summani hisoblaydi", async () => {
    const { body } = await create();
    const res = await contribute(body.data.id, { amount: 2_500_000, date: '2026-10-05', note: 'Maosh' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ saved: 2_500_000, percent: 25, remaining: 7_500_000 });
    expect(res.body.data.contributions[0]).toMatchObject({ amount: 2_500_000, date: '2026-10-05', note: 'Maosh' });
  });

  it("muddat bo'lsa, oylik kerakli summani beradi", async () => {
    const { body } = await create({ targetAmount: 6_000_000, deadline: '2027-04-10' });
    const res = await api().get('/api/goals').query({ today: '2026-10-10' }).set(bearer(u.token));
    const goal = res.body.data.find((g) => g.id === body.data.id);
    // 182 kun ≈ 7 oy -> 6 000 000 / 7 = 857 143 (yuqoriga yaxlitlanadi)
    expect(goal.daysLeft).toBe(182);
    expect(goal.monthlyNeeded).toBe(Math.ceil(6_000_000 / 7));
    expect(goal.overdue).toBe(false);
  });

  it("muddat o'tib ketgan va bajarilmagan maqsadni belgilaydi", async () => {
    await create({ deadline: '2026-01-01' });
    const res = await api().get('/api/goals').query({ today: '2026-10-10' }).set(bearer(u.token));
    expect(res.body.data[0]).toMatchObject({ overdue: true, monthlyNeeded: null });
  });

  it("maqsadga yetganda completed bo'ladi", async () => {
    const { body } = await create({ targetAmount: 1_000_000 });
    const res = await contribute(body.data.id, { amount: 1_000_000 });
    expect(res.body.data).toMatchObject({ completed: true, percent: 100, remaining: 0 });
  });

  it("jamg'armadan ortiqcha qaytarib bo'lmaydi, lekin qisman qaytarish mumkin", async () => {
    const { body } = await create();
    await contribute(body.data.id, { amount: 500_000 });

    const tooMuch = await contribute(body.data.id, { amount: -600_000 });
    expect(tooMuch.status).toBe(400);
    expect(tooMuch.body.error.details[0].path).toBe('amount');

    const partial = await contribute(body.data.id, { amount: -200_000 });
    expect(partial.body.data.saved).toBe(300_000);
    expect((await contribute(body.data.id, { amount: 0 })).status).toBe(400);
  });

  it("yozuvni o'chirganda jamg'arma manfiy bo'lib qolsa rad etadi", async () => {
    const { body } = await create();
    const first = await contribute(body.data.id, { amount: 500_000, date: '2026-10-01' });
    await contribute(body.data.id, { amount: -400_000, date: '2026-10-02' });
    const depositId = first.body.data.contributions.find((c) => c.amount > 0).id;

    const blocked = await api().delete(`/api/goals/${body.data.id}/contributions/${depositId}`).set(bearer(u.token));
    expect(blocked.status).toBe(400);
  });

  it("yozuvni o'chiradi va maqsadni tahrirlaydi/o'chiradi", async () => {
    const { body } = await create();
    const c = await contribute(body.data.id, { amount: 100_000 });
    const cid = c.body.data.contributions[0].id;

    const del = await api().delete(`/api/goals/${body.data.id}/contributions/${cid}`).set(bearer(u.token));
    expect(del.body.data.saved).toBe(0);

    const upd = await api().put(`/api/goals/${body.data.id}`).set(bearer(u.token)).send({ name: 'Yangi', targetAmount: 5_000_000 });
    expect(upd.body.data).toMatchObject({ name: 'Yangi', targetAmount: 5_000_000, deadline: null });

    expect((await api().delete(`/api/goals/${body.data.id}`).set(bearer(u.token))).status).toBe(204);
    expect((await api().delete(`/api/goals/${body.data.id}`).set(bearer(u.token))).status).toBe(404);
  });

  it("boshqa foydalanuvchining maqsadiga tegib bo'lmaydi", async () => {
    const other = await registerUser();
    const { body } = await create({}, other.token);
    expect((await contribute(body.data.id, { amount: 1000 })).status).toBe(404);
    expect((await api().get('/api/goals').set(bearer(u.token))).body.data).toHaveLength(0);
  });
});
