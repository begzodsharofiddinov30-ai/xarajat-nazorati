// Kredit jadvali (server/src/utils/loan.js bilan bir xil hisob): formada oylik to'lovni darhol ko'rsatish uchun.

function monthlyDate(first, i) {
  const [y, m, d] = first.split('-').map(Number);
  const last = new Date(Date.UTC(y, m - 1 + i + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m - 1 + i, Math.min(d, last))).toISOString().slice(0, 10);
}

export function buildSchedule({ principal, annualRate, termMonths, firstPaymentDate, method = 'annuity' }) {
  if (!principal || !termMonths || !firstPaymentDate) return [];
  const r = annualRate / 12 / 100;
  const annuity = r === 0 ? principal / termMonths : (principal * r) / (1 - (1 + r) ** -termMonths);
  const rows = [];
  let balance = principal;
  for (let i = 0; i < termMonths; i++) {
    const interest = Math.round(balance * r);
    let principalPart = method === 'annuity' ? Math.ceil(annuity) - interest : Math.round(principal / termMonths);
    if (i === termMonths - 1 || principalPart > balance) principalPart = balance;
    balance -= principalPart;
    rows.push({ n: i + 1, date: monthlyDate(firstPaymentDate, i), payment: principalPart + interest, principal: principalPart, interest, balance });
  }
  return rows;
}

export const LOAN_KINDS = { credit: 'Kredit', installment: "Muddatli to'lov" };
export const LOAN_METHODS = { annuity: "Annuitet (teng to'lov)", differentiated: "Differensial (kamayib boradi)" };

export const LOAN_STATUS = {
  active: { label: 'Faol', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
  overdue: { label: 'Kechikkan', cls: 'bg-red-500/15 text-red-700 dark:text-red-400' },
  closed: { label: 'Yopilgan', cls: 'bg-slate-500/15 text-slate-600 dark:text-slate-400' },
};
