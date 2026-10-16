import { describe, expect, it } from 'vitest';
import { api, bearer, registerUser } from './helpers.js';

describe('Umumiy ilova xatti-harakati', () => {
  it("health DB holatini ko'rsatadi", async () => {
    const res = await api().get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ status: 'ok', db: true });
  });

  it('xavfsizlik sarlavhalari bor, x-powered-by yo\'q', async () => {
    const res = await api().get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeDefined();
  });

  it("noma'lum API yo'li yagona xato formatida 404 qaytaradi", async () => {
    const res = await api().get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({ code: 'ROUTE_NOT_FOUND' });
  });

  it("buzilgan JSON uchun 400 INVALID_JSON", async () => {
    const u = await registerUser();
    const res = await api()
      .post('/api/transactions')
      .set(bearer(u.token))
      .set('Content-Type', 'application/json')
      .send('{"amount": ');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  it('72 baytdan uzun parolni rad etadi', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ name: 'Ali', email: 'long@test.uz', password: 'a'.repeat(73) });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe('password');
  });

  it("mavjud bo'lmagan email bilan kirish ham bir xil xato beradi", async () => {
    const res = await api().post('/api/auth/login').send({ email: 'yoq@test.uz', password: 'secret123' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});
