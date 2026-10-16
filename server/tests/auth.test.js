import { describe, expect, it } from 'vitest';
import { api, bearer, registerUser } from './helpers.js';

describe('Auth', () => {
  it("ro'yxatdan o'tadi va parol hashini qaytarmaydi", async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ name: 'Ali', email: 'Ali@Test.uz', password: 'secret123' });

    expect(res.status).toBe(201);
    expect(res.body.data.token).toBeTypeOf('string');
    expect(res.body.data.user).toMatchObject({ name: 'Ali', email: 'ali@test.uz' });
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('band emailni rad etadi', async () => {
    await registerUser({ email: 'dup@test.uz' });
    const res = await api()
      .post('/api/auth/register')
      .send({ name: 'Vali', email: 'dup@test.uz', password: 'secret123' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it("noto'g'ri ma'lumotlar uchun VALIDATION_ERROR qaytaradi", async () => {
    const res = await api().post('/api/auth/register').send({ name: 'A', email: 'yaroqsiz', password: '1' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d) => d.path)).toEqual(
      expect.arrayContaining(['name', 'email', 'password']),
    );
  });

  it("to'g'ri parol bilan kiradi, noto'g'risi bilan kira olmaydi", async () => {
    const u = await registerUser();

    const ok = await api().post('/api/auth/login').send({ email: u.email, password: u.password });
    expect(ok.status).toBe(200);
    expect(ok.body.data.token).toBeTypeOf('string');

    const bad = await api().post('/api/auth/login').send({ email: u.email, password: 'wrong-pass' });
    expect(bad.status).toBe(401);
    expect(bad.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('/me token bilan foydalanuvchini qaytaradi, tokensiz 401', async () => {
    const u = await registerUser();

    const me = await api().get('/api/auth/me').set(bearer(u.token));
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(u.email);

    expect((await api().get('/api/auth/me')).status).toBe(401);

    const invalid = await api().get('/api/auth/me').set(bearer('not-a-jwt'));
    expect(invalid.status).toBe(401);
    expect(invalid.body.error.code).toBe('INVALID_TOKEN');
  });

  it('himoyalangan yo\'nalishlar tokensiz ishlamaydi', async () => {
    for (const path of ['/api/transactions', '/api/summary', '/api/budgets']) {
      expect((await api().get(path)).status).toBe(401);
    }
  });
});
