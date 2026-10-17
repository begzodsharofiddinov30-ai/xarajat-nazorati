import { beforeEach, describe, expect, it } from 'vitest';
import { detectOperator, normalizePhone } from '../src/utils/phone.js';
import { api, bearer, createTx, expense, registerUser } from './helpers.js';

describe("Telefon raqami (sof funksiyalar)", () => {
  it('raqamni turli yozuvlardan bir xil formatga keltiradi', () => {
    expect(normalizePhone('+998 90 123-45-67')).toBe('998901234567');
    expect(normalizePhone('90 123 45 67')).toBe('998901234567');
    expect(normalizePhone('998901234567')).toBe('998901234567');
    expect(normalizePhone('12345')).toBeNull();
    expect(normalizePhone('+7 901 234 56 78')).toBeNull();
  });

  it('operatorni kod bo\'yicha aniqlaydi', () => {
    const op = (code) => detectOperator(`998${code}1234567`);
    expect([op('90'), op('91')]).toEqual(['beeline', 'beeline']);
    expect([op('93'), op('94'), op('50')]).toEqual(['ucell', 'ucell', 'ucell']);
    expect([op('97'), op('88')]).toEqual(['mobiuz', 'mobiuz']);
    expect([op('95'), op('99'), op('77')]).toEqual(['uzmobile', 'uzmobile', 'uzmobile']);
    expect([op('33'), op('98'), op('71')]).toEqual(['humans', 'perfectum', 'other']);
  });
});

describe('Mobil aloqa API', () => {
  let u;
  const addPhone = (body, token = u.token) => api().post('/api/phones').set(bearer(token)).send(body);
  const mobile = (overrides) => expense({ category: 'mobile', amount: 20_000, ...overrides });

  beforeEach(async () => {
    u = await registerUser();
  });

  it("raqam qo'shadi: format, operator, takror va noto'g'ri raqam", async () => {
    const res = await addPhone({ label: 'Mening raqamim', number: '+998 93 111 22 33' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ label: 'Mening raqamim', number: '998931112233', operator: 'ucell' });

    const manual = await addPhone({ label: 'Onam', number: '901112233', operator: 'uzmobile' });
    expect(manual.body.data.operator).toBe('uzmobile');

    const dup = await addPhone({ label: 'Yana', number: '93 111 22 33' });
    expect(dup.status).toBe(400);
    expect(dup.body.error.details[0].path).toBe('number');

    const bad = await addPhone({ label: 'Xato', number: '12345' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.details[0].path).toBe('number');
  });

  it("to'lovni raqamga bog'laydi; boshqa kategoriya va begona raqam rad etiladi", async () => {
    const phone = (await addPhone({ label: 'Men', number: '901234567' })).body.data;
    const ok = await createTx(u.token, mobile({ phone: phone.id }));
    expect(ok.status).toBe(201);
    expect(ok.body.data.phone).toBe(phone.id);

    const wrongCat = await createTx(u.token, expense({ category: 'food', phone: phone.id }));
    expect(wrongCat.status).toBe(400);
    expect(wrongCat.body.error.details[0].path).toBe('phone');

    const other = await registerUser();
    const foreign = await createTx(other.token, mobile({ phone: phone.id }));
    expect(foreign.status).toBe(400);

    // PUT da raqam yuborilmasa bog'lanish olib tashlanadi.
    const put = await api().put(`/api/transactions/${ok.body.data.id}`).set(bearer(u.token)).send(mobile());
    expect(put.body.data.phone).toBeUndefined();
  });

  it("oy bo'yicha statistika: raqamlar, bog'lanmagan, trend, oxirgi to'lov, avtomatik to'lov", async () => {
    const a = (await addPhone({ label: 'Men', number: '901234567' })).body.data;
    const b = (await addPhone({ label: 'Onam', number: '931234567' })).body.data;
    await createTx(u.token, mobile({ phone: a.id, amount: 30_000, date: '2026-10-03' }));
    await createTx(u.token, mobile({ phone: a.id, amount: 20_000, date: '2026-10-10' }));
    await createTx(u.token, mobile({ phone: b.id, amount: 15_000, date: '2026-09-05' }));
    await createTx(u.token, mobile({ amount: 5_000, date: '2026-10-12' }));
    await createTx(u.token, expense({ amount: 99_000, date: '2026-10-12' }));
    await api().post('/api/recurring').set(bearer(u.token)).send({
      type: 'expense', amount: 25_000, category: 'mobile', phone: b.id, frequency: 'monthly', startDate: '2027-01-01',
    });

    const res = await api().get('/api/phones?month=2026-10').set(bearer(u.token));
    expect(res.status).toBe(200);
    const [pa, pb] = res.body.data;
    expect(pa).toMatchObject({ id: a.id, paid: 50_000, count: 2, lastPayment: { date: '2026-10-10', amount: 20_000 }, autoPay: null });
    expect(pb).toMatchObject({ paid: 0, lastPayment: { date: '2026-09-05', amount: 15_000 } });
    expect(pb.autoPay).toMatchObject({ amount: 25_000, frequency: 'monthly', active: true, nextDate: '2027-01-01' });
    expect(res.body.meta).toMatchObject({ month: '2026-10', total: 55_000, unassigned: 5_000 });
    expect(res.body.meta.trend).toHaveLength(6);
    expect(res.body.meta.trend.slice(-2)).toEqual([
      { month: '2026-09', total: 15_000 },
      { month: '2026-10', total: 55_000 },
    ]);

    const filtered = await api().get(`/api/transactions?phone=${a.id}`).set(bearer(u.token));
    expect(filtered.body.meta.total).toBe(2);
  });

  it("takroriy qoida yaratgan to'lovlar ham raqamga bog'lanadi", async () => {
    const p = (await addPhone({ label: 'Men', number: '991234567' })).body.data;
    await api().post('/api/recurring').set(bearer(u.token)).send({
      type: 'expense', amount: 40_000, category: 'mobile', phone: p.id, frequency: 'monthly', startDate: '2026-01-15', endDate: '2026-03-15',
    });
    const list = await api().get(`/api/transactions?phone=${p.id}`).set(bearer(u.token));
    expect(list.body.data).toHaveLength(3);
    expect(list.body.data.every((t) => t.phone === p.id && t.recurring)).toBe(true);

    const bad = await api().post('/api/recurring').set(bearer(u.token)).send({
      type: 'expense', amount: 1000, category: 'food', phone: p.id, frequency: 'monthly', startDate: '2026-01-15',
    });
    expect(bad.status).toBe(400);
  });

  it("raqam o'chirilsa to'lovlar qoladi, bog'lanish olib tashlanadi; begona raqamga tegib bo'lmaydi", async () => {
    const p = (await addPhone({ label: 'Men', number: '901234567' })).body.data;
    const tx = (await createTx(u.token, mobile({ phone: p.id }))).body.data;

    const other = await registerUser();
    expect((await api().put(`/api/phones/${p.id}`).set(bearer(other.token)).send({ label: 'X', number: '901234567' })).status).toBe(404);
    expect((await api().delete(`/api/phones/${p.id}`).set(bearer(other.token))).status).toBe(404);
    expect((await api().get('/api/phones').set(bearer(other.token))).body.data).toEqual([]);

    expect((await api().delete(`/api/phones/${p.id}`).set(bearer(u.token))).status).toBe(204);
    const list = await api().get('/api/transactions').set(bearer(u.token));
    expect(list.body.data.map((t) => t.id)).toEqual([tx.id]);
    expect(list.body.data[0].phone).toBeUndefined();
  });

  it("hisob o'chirilganda raqamlar ham o'chadi", async () => {
    await addPhone({ label: 'Men', number: '901234567' });
    await api().delete('/api/auth/account').set(bearer(u.token)).send({ password: u.password });
    const again = await registerUser({ email: u.email });
    expect((await api().get('/api/phones').set(bearer(again.token))).body.data).toEqual([]);
  });
});
