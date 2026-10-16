const NBSP = ' ';

export function groupDigits(n) {
  return String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

export function formatSom(n, { sign = false } = {}) {
  const prefix = n < 0 ? '−' : sign && n > 0 ? '+' : '';
  return `${prefix}${groupDigits(n)}${NBSP}so'm`;
}

// Grafik o'qlari uchun qisqa ko'rinish: 1 250 000 -> "1,3 mln"
export function formatCompact(n) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace('.', ',')}${NBSP}mlrd`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')}${NBSP}mln`;
  if (abs >= 1_000) return `${Math.round(n / 1_000)}${NBSP}ming`;
  return String(n);
}

// Foydalanuvchi kiritgan matndan faqat raqamlarni olib, butun songa aylantiradi.
export function parseAmount(str) {
  const digits = String(str).replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}
