// Kredit to'lov jadvali va holati (sof funksiyalar). Summalar butun so'mda, sanalar YYYY-MM-DD.
// Oylik sana birinchi to'lov sanasidan hisoblanadi (31-kun -> fevralda 28/29, keyin yana 31).
import { occurrenceDate } from './recurrence.js';

export const LOAN_KINDS = ['credit', 'installment'];
export const LOAN_METHODS = ['annuity', 'differentiated'];

const iso = (d) => d.toISOString().slice(0, 10);

// annuity — har oy bir xil to'lov; differentiated — asosiy qarz teng bo'linadi, foiz qoldiqdan (to'lov kamayib boradi).
// Foiz har oy qoldiq * (yillik foiz / 12) bo'yicha. Annuitet yuqoriga yaxlitlanadi, farq oxirgi (biroz kichik) to'lovda
// yopiladi: shunda har oy bir xil summa yozadigan avtomatik to'lov kreditni oxirida to'liq yopadi.
export function buildSchedule({ principal, annualRate, termMonths, firstPaymentDate, method = 'annuity' }) {
  const r = annualRate / 12 / 100;
  const start = new Date(`${firstPaymentDate}T00:00:00.000Z`);
  const annuity = r === 0 ? principal / termMonths : (principal * r) / (1 - (1 + r) ** -termMonths);

  const rows = [];
  let balance = principal;
  for (let i = 0; i < termMonths; i++) {
    const interest = Math.round(balance * r);
    let principalPart = method === 'annuity' ? Math.ceil(annuity) - interest : Math.round(principal / termMonths);
    if (i === termMonths - 1 || principalPart > balance) principalPart = balance;
    balance -= principalPart;
    rows.push({
      n: i + 1,
      date: iso(occurrenceDate(start, 'monthly', i)),
      payment: principalPart + interest,
      principal: principalPart,
      interest,
      balance,
    });
  }
  return rows;
}

// To'langan summa jadval bo'yicha ketma-ket "yopiladi": to'liq yopilgan oylar soni, keyingi to'lov
// (qisman to'langan bo'lsa qolgani), kechikkan oylar va qolgan qarz.
export function summarizeLoan(schedule, paid, today) {
  const totalToPay = schedule.reduce((s, r) => s + r.payment, 0);
  const principal = schedule.reduce((s, r) => s + r.principal, 0);

  let left = paid;
  let paidCount = 0;
  for (const row of schedule) {
    if (left < row.payment) break;
    left -= row.payment;
    paidCount += 1;
  }

  const nextRow = schedule[paidCount] ?? null;
  const overdueCount = schedule.slice(paidCount).filter((r) => r.date < today).length;
  const remaining = Math.max(totalToPay - paid, 0);

  return {
    totalToPay,
    totalInterest: totalToPay - principal,
    paid,
    remaining,
    remainingPrincipal: paidCount ? schedule[paidCount - 1].balance : principal,
    percent: totalToPay ? Math.min(100, Math.round((paid / totalToPay) * 100)) : 100,
    paidCount,
    next: nextRow ? { n: nextRow.n, date: nextRow.date, amount: nextRow.payment - left } : null,
    overdueCount,
    overdueAmount: overdueCount
      ? schedule.slice(paidCount, paidCount + overdueCount).reduce((s, r) => s + r.payment, 0) - left
      : 0,
  };
}
