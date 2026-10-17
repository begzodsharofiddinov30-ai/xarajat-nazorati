import { beforeEach, describe, expect, it } from 'vitest';
import { buildSchedule, summarizeLoan } from '../src/utils/loan.js';
import { api, bearer, createTx, expense, registerUser } from './helpers.js';

const sum = (rows, key) => rows.reduce((s, r) => s + r[key], 0);

describe("Kredit jadvali (sof funksiyalar)", () => {
  it('annuitet: teng to\'lov, asosiy qarz to\'liq yopiladi, oy oxiri to\'g\'rilanadi', () => {
    const s = buildSchedule({ principal: 12_000_000, annualRate: 24, termMonths: 12, firstPaymentDate: '2026-01-31' });
    expect(s).toHaveLength(12);
    expect(s[0]).toMatchObject({ payment: 1_134_716, interest: 240_000, principal: 894_716 });
    expect(s[1].date).toBe('2026-02-28');
    expect(s[2].date).toBe('2026-03-31');
    expect(sum(s, 'principal')).toBe(12_000_000);
    expect(s.at(-1).balance).toBe(0);
    expect(new Set(s.slice(0, -1).map((r) => r.payment)).size).toBe(1);
  });

  it("differensial: asosiy qarz teng, to'lov kamayib boradi", () => {
    const s = buildSchedule({ principal: 12_000_000, annualRate: 24, termMonths: 12, firstPaymentDate: '2026-01-10', method: 'differentiated' });
    expect(s[0].payment).toBe(1_240_000);
    expect(s.at(-1).payment).toBe(1_020_000);
    expect(sum(s, 'principal')).toBe(12_000_000);
  });

  it("0% (muddatli to'lov): faqat asosiy qarz, qoldiq oxirgi oyda", () => {
    const s = buildSchedule({ principal: 1_000_000, annualRate: 0, termMonths: 3, firstPaymentDate: '2026-10-05' });
    expect(s.map((r) => r.payment)).toEqual([333_334, 333_334, 333_332]);
    expect(sum(s, 'interest')).toBe(0);
  });

  it("holat: qisman to'lov, kechikish va qolgan qarz", () => {
    const s = buildSchedule({ principal: 3_000_000, annualRate: 0, termMonths: 3, firstPaymentDate: '2026-01-15' });
    const r = summarizeLoan(s, 1_500_000, '2026-03-01');
    expect(r).toMatchObject({ paidCount: 1, remaining: 1_500_000, remainingPrincipal: 2_000_000, percent: 50 });
    expect(r.next).toEqual({ n: 2, date: '2026-02-15', amount: 500_000 });
    expect(r).toMatchObject({ overdueCount: 1, overdueAmount: 500_000 });

    const done = summarizeLoan(s, 3_000_000, '2026-03-01');
    expect(done).toMatchObject({ remaining: 0, next: null, overdueCount: 0, percent: 100 });
  });
});

describe('Kreditlar API', () => {
  let u;
  const base = { name: 'Avtokredit', lender: 'Kapitalbank', principal: 12_000_000, annualRate: 24, termMonths: 12, firstPaymentDate: '2026-08-10' };
  const create = (body = base, token = u.token) => api().post('/api/loans').set(bearer(token)).send(body);
  const pay = (id, body = {}, token = u.token) => api().post(`/api/loans/${id}/payments`).set(bearer(token)).send(body);

  beforeEach(async () => {
    u = await registerUser();
  });

  it("yaratadi va hisoblaydi; noto'g'ri qiymatlar rad etiladi", async () => {
    const res = await create();
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ name: 'Avtokredit', method: 'annuity', kind: 'credit', monthlyPayment: 1_134_716, totalInterest: 1_616_581, lastPaymentDate: '2027-07-10' });
    expect(res.body.data.schedule).toBeUndefined();

    for (const [field, value] of [['annualRate', 12.345], ['termMonths', 0], ['principal', -5], ['firstPaymentDate', '2026-02-30']]) {
      const bad = await create({ ...base, [field]: value });
      expect(bad.status).toBe(400);
      expect(bad.body.error.details[0].path).toBe(field);
    }
  });

  it("to'lov: standart summa keyingi to'lov, qisman to'lov, ortiqcha to'lov rad etiladi", async () => {
    const loan = (await create({ ...base, annualRate: 0, principal: 3_000_000, termMonths: 3, firstPaymentDate: '2026-10-01' })).body.data;

    const first = await pay(loan.id, { date: '2026-10-01' });
    expect(first.status).toBe(201);
    expect(first.body.data).toMatchObject({ amount: 1_000_000, category: 'loan', loan: loan.id, note: "Avtokredit: 1-to'lov" });

    await pay(loan.id, { amount: 400_000, date: '2026-10-20' });
    const detail = (await api().get(`/api/loans/${loan.id}?today=2026-11-05`).set(bearer(u.token))).body.data;
    expect(detail).toMatchObject({ paid: 1_400_000, remaining: 1_600_000, paidCount: 1, status: 'overdue', overdueCount: 1 });
    expect(detail.next).toEqual({ n: 2, date: '2026-11-01', amount: 600_000 });
    expect(detail.schedule.map((r) => r.status)).toEqual(['paid', 'overdue', 'upcoming']);
    expect(detail.payments).toHaveLength(2);

    const over = await pay(loan.id, { amount: 2_000_000 });
    expect(over.status).toBe(400);
    expect(over.body.error.details[0].path).toBe('amount');

    await pay(loan.id, { amount: 1_600_000, date: '2026-11-06' });
    const list = (await api().get('/api/loans?today=2026-11-06').set(bearer(u.token))).body;
    expect(list.data[0]).toMatchObject({ status: 'closed', remaining: 0, next: null });
    expect(list.meta).toMatchObject({ activeCount: 0, remaining: 0, nextPayment: null });
    expect((await pay(loan.id, { amount: 1000 })).status).toBe(400);
  });

  it("umumiy holat: qolgan qarz va eng yaqin to'lov", async () => {
    await create({ ...base, name: 'A', firstPaymentDate: '2026-11-20' });
    await create({ ...base, name: 'B', principal: 600_000, annualRate: 0, termMonths: 6, kind: 'installment', firstPaymentDate: '2026-11-05' });
    const { meta } = (await api().get('/api/loans?today=2026-10-17').set(bearer(u.token))).body;
    expect(meta).toMatchObject({ activeCount: 2, remaining: 13_616_581 + 600_000, monthlyPayment: 1_134_716 + 100_000, overdueCount: 0 });
    expect(meta.nextPayment).toMatchObject({ name: 'B', date: '2026-11-05', amount: 100_000 });
  });

  it("xarajat formasidan bog'lash, avtomatik to'lov va o'chirish", async () => {
    const loan = (await create()).body.data;
    const ok = await createTx(u.token, expense({ category: 'loan', loan: loan.id, amount: 100_000 }));
    expect(ok.body.data.loan).toBe(loan.id);
    const wrong = await createTx(u.token, expense({ category: 'food', loan: loan.id }));
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.details[0].path).toBe('loan');

    await api().post('/api/recurring').set(bearer(u.token)).send({
      type: 'expense', amount: 1_134_715, category: 'loan', loan: loan.id, frequency: 'monthly', startDate: '2027-01-10',
    });
    const listed = (await api().get('/api/loans').set(bearer(u.token))).body.data[0];
    expect(listed.autoPay).toMatchObject({ amount: 1_134_715, active: true, nextDate: '2027-01-10' });

    expect((await api().delete(`/api/loans/${loan.id}`).set(bearer(u.token))).status).toBe(204);
    const txs = (await api().get('/api/transactions').set(bearer(u.token))).body.data;
    expect(txs).toHaveLength(1);
    expect(txs[0].loan).toBeUndefined();
    expect((await api().get('/api/recurring').set(bearer(u.token))).body.data).toEqual([]);
  });

  it("teng summali avtomatik to'lov kreditni oxirida to'liq yopadi", async () => {
    const loan = (await create({ ...base, firstPaymentDate: '2025-01-10' })).body.data;
    await api().post('/api/recurring').set(bearer(u.token)).send({
      type: 'expense', amount: loan.monthlyPayment, category: 'loan', loan: loan.id,
      frequency: 'monthly', startDate: loan.firstPaymentDate, endDate: loan.lastPaymentDate,
    });
    const listed = (await api().get('/api/loans?today=2026-10-17').set(bearer(u.token))).body.data[0];
    expect(listed).toMatchObject({ status: 'closed', remaining: 0, paidCount: 12 });
  });

  it("begona kreditga tegib bo'lmaydi", async () => {
    const loan = (await create()).body.data;
    const other = await registerUser();
    expect((await api().get(`/api/loans/${loan.id}`).set(bearer(other.token))).status).toBe(404);
    expect((await api().put(`/api/loans/${loan.id}`).set(bearer(other.token)).send(base)).status).toBe(404);
    expect((await pay(loan.id, {}, other.token)).status).toBe(404);
    expect((await api().delete(`/api/loans/${loan.id}`).set(bearer(other.token))).status).toBe(404);
    expect((await createTx(other.token, expense({ category: 'loan', loan: loan.id }))).status).toBe(400);
  });

  it("qo'lda yopish va hisob o'chirilganda kreditlar ham o'chadi", async () => {
    const loan = (await create()).body.data;
    const closed = await api().put(`/api/loans/${loan.id}`).set(bearer(u.token)).send({ ...base, closed: true });
    expect(closed.body.data).toMatchObject({ status: 'closed', next: null });

    await api().delete('/api/auth/account').set(bearer(u.token)).send({ password: u.password });
    const again = await registerUser({ email: u.email });
    expect((await api().get('/api/loans').set(bearer(again.token))).body.data).toEqual([]);
  });
});
