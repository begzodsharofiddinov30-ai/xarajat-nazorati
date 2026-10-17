import { generateKeyPairSync } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetGoogleCertsCache } from '../src/utils/googleToken.js';
import { api, bearer, createTx, expense, registerUser } from './helpers.js';

// Google'ning ochiq kalitlari o'rniga test kaliti: tokenlar haqiqiy RS256 imzo bilan yaratiladi.
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const KID = 'test-kid';
const PEM = publicKey.export({ type: 'spki', format: 'pem' });
const AUD = 'test-client.apps.googleusercontent.com';

function googleToken(claims = {}, { kid = KID, ...opts } = {}) {
  return jwt.sign(
    { email_verified: true, name: 'Ali Valiyev', sub: 'g-123', email: 'ali@gmail.com', ...claims },
    privateKey,
    { algorithm: 'RS256', keyid: kid, audience: AUD, issuer: 'https://accounts.google.com', expiresIn: '1h', ...opts },
  );
}

const google = (credential) => api().post('/api/auth/google').send({ credential });

describe('Google orqali kirish', () => {
  beforeAll(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ [KID]: PEM }), { headers: { 'cache-control': 'max-age=600' } })),
    );
  });
  afterAll(() => vi.unstubAllGlobals());
  beforeEach(() => resetGoogleCertsCache());

  it('config Client ID ni qaytaradi', async () => {
    const res = await api().get('/api/auth/config');
    expect(res.body.data.googleClientId).toBe(AUD);
  });

  it("yangi foydalanuvchi yaratadi, qayta kirganda o'sha hisob; parol bilan kirib bo'lmaydi", async () => {
    const first = await google(googleToken());
    expect(first.status).toBe(200);
    expect(first.body.data.user).toMatchObject({ email: 'ali@gmail.com', name: 'Ali Valiyev', google: true, hasPassword: false });

    const me = await api().get('/api/auth/me').set(bearer(first.body.data.token));
    expect(me.body.data.user).toMatchObject({ google: true, hasPassword: false });

    const again = await google(googleToken());
    expect(again.body.data.user.id).toBe(first.body.data.user.id);

    const pw = await api().post('/api/auth/login').send({ email: 'ali@gmail.com', password: 'nimadir' });
    expect(pw.status).toBe(401);
    expect(pw.body.error.code).toBe('USE_GOOGLE_LOGIN');
  });

  it("shu emaildagi mavjud hisobga bog'lanadi: ma'lumotlar saqlanadi, eski parol va sessiyalar bekor", async () => {
    const u = await registerUser({ email: 'ali@gmail.com' });
    await createTx(u.token, expense());

    const res = await google(googleToken());
    expect(res.body.data.user.id).toBe(u.user.id);
    expect(res.body.data.user.hasPassword).toBe(false);

    expect((await api().get('/api/auth/me').set(bearer(u.token))).status).toBe(401);
    const list = await api().get('/api/transactions').set(bearer(res.body.data.token));
    expect(list.body.data).toHaveLength(1);
  });

  it("yaroqsiz tokenlarni rad etadi", async () => {
    const cases = [
      googleToken({}, { audience: 'boshqa-ilova' }),
      googleToken({ email_verified: false }),
      googleToken({}, { expiresIn: '-1m' }),
      googleToken({}, { kid: 'nomalum-kid' }),
      googleToken({}, { issuer: 'https://evil.example' }),
      jwt.sign({ sub: 'x', email: 'a@b.uz', email_verified: true }, 'hs256-secret', { keyid: KID, audience: AUD }),
    ];
    for (const credential of cases) {
      const res = await google(credential);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('GOOGLE_INVALID');
    }
  });

  it("paroli yo'q hisob: parolni joriy parolsiz o'rnatadi, keyin joriy parol so'raladi", async () => {
    const { token } = (await google(googleToken())).body.data;

    const set = await api().post('/api/auth/password').set(bearer(token)).send({ newPassword: 'yangi-parol-1' });
    expect(set.status).toBe(200);
    expect(set.body.data.user.hasPassword).toBe(true);
    expect((await api().post('/api/auth/login').send({ email: 'ali@gmail.com', password: 'yangi-parol-1' })).status).toBe(200);

    const noCurrent = await api().post('/api/auth/password').set(bearer(set.body.data.token)).send({ newPassword: 'boshqa-parol' });
    expect(noCurrent.status).toBe(400);
    expect(noCurrent.body.error.details[0].path).toBe('currentPassword');
  });

  it("paroli yo'q hisobni o'chirish emailni yozib tasdiqlanadi", async () => {
    const { token } = (await google(googleToken())).body.data;
    const wrong = await api().delete('/api/auth/account').set(bearer(token)).send({ confirmEmail: 'boshqa@gmail.com' });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.details[0].path).toBe('confirmEmail');

    const ok = await api().delete('/api/auth/account').set(bearer(token)).send({ confirmEmail: 'ALI@gmail.com' });
    expect(ok.status).toBe(204);
  });

  it('redirect usuli: CSRF tekshiriladi, muvaffaqiyatda token URL fragmentida qaytadi', async () => {
    const bad = await api()
      .post('/api/auth/google/redirect')
      .set('Cookie', 'g_csrf_token=abc')
      .type('form')
      .send({ credential: googleToken(), g_csrf_token: 'boshqa' });
    expect(bad.status).toBe(303);
    expect(bad.headers.location).toBe('/login#google_error=csrf');

    const ok = await api()
      .post('/api/auth/google/redirect')
      .set('Cookie', 'other=1; g_csrf_token=abc')
      .type('form')
      .send({ credential: googleToken(), g_csrf_token: 'abc' });
    expect(ok.status).toBe(303);
    const token = decodeURIComponent(ok.headers.location.match(/^\/#token=(.+)$/)[1]);
    expect((await api().get('/api/auth/me').set(bearer(token))).body.data.user.email).toBe('ali@gmail.com');
  });

  it('oddiy hisobda hasPassword true', async () => {
    const u = await registerUser();
    const me = await api().get('/api/auth/me').set(bearer(u.token));
    expect(me.body.data.user).toMatchObject({ hasPassword: true, google: false });
  });
});
