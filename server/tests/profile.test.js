import { beforeEach, describe, expect, it } from 'vitest';
import { api, bearer, createTx, expense, registerUser } from './helpers.js';

describe('Profil sozlamalari', () => {
  let u;
  beforeEach(async () => {
    u = await registerUser();
  });

  it('ismni yangilaydi', async () => {
    const res = await api().patch('/api/auth/profile').set(bearer(u.token)).send({ name: 'Begzod' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('Begzod');
    expect((await api().patch('/api/auth/profile').set(bearer(u.token)).send({ name: 'B' })).status).toBe(400);
  });

  it("parolni almashtiradi: eski token o'chadi, yangisi ishlaydi, yangi parol bilan kiriladi", async () => {
    const res = await api()
      .post('/api/auth/password')
      .set(bearer(u.token))
      .send({ currentPassword: u.password, newPassword: 'yangi-parol-1' });
    expect(res.status).toBe(200);
    const newToken = res.body.data.token;

    expect((await api().get('/api/auth/me').set(bearer(u.token))).status).toBe(401);
    expect((await api().get('/api/auth/me').set(bearer(newToken))).status).toBe(200);
    expect((await api().post('/api/auth/login').send({ email: u.email, password: 'yangi-parol-1' })).status).toBe(200);
    expect((await api().post('/api/auth/login').send({ email: u.email, password: u.password })).status).toBe(401);
  });

  it("joriy parol noto'g'ri bo'lsa rad etadi", async () => {
    const res = await api()
      .post('/api/auth/password')
      .set(bearer(u.token))
      .send({ currentPassword: 'xato-parol', newPassword: 'yangi-parol-1' });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe('currentPassword');
    // Token hali ham ishlaydi.
    expect((await api().get('/api/auth/me').set(bearer(u.token))).status).toBe(200);
  });

  it('hamma qurilmadan chiqish eski tokenlarni bekor qiladi', async () => {
    const res = await api().post('/api/auth/logout-all').set(bearer(u.token));
    expect(res.status).toBe(200);
    expect((await api().get('/api/auth/me').set(bearer(u.token))).status).toBe(401);
    expect((await api().get('/api/auth/me').set(bearer(res.body.data.token))).status).toBe(200);
  });

  it("akkauntni o'chirish parol so'raydi va barcha ma'lumotni o'chiradi", async () => {
    await createTx(u.token, expense());
    await api().put('/api/budgets').set(bearer(u.token)).send({ category: 'food', limit: 100_000 });
    await api().post('/api/goals').set(bearer(u.token)).send({ name: 'Maqsad', targetAmount: 1_000_000 });

    const wrong = await api().delete('/api/auth/account').set(bearer(u.token)).send({ password: 'xato' });
    expect(wrong.status).toBe(400);

    const ok = await api().delete('/api/auth/account').set(bearer(u.token)).send({ password: u.password });
    expect(ok.status).toBe(204);

    expect((await api().get('/api/auth/me').set(bearer(u.token))).status).toBe(401);
    expect((await api().post('/api/auth/login').send({ email: u.email, password: u.password })).status).toBe(401);

    // Xuddi shu email bilan qayta ro'yxatdan o'tilsa, eski ma'lumot qaytmaydi.
    const again = await registerUser({ email: u.email });
    expect((await api().get('/api/transactions').set(bearer(again.token))).body.data).toHaveLength(0);
    expect((await api().get('/api/goals').set(bearer(again.token))).body.data).toHaveLength(0);
  });
});
