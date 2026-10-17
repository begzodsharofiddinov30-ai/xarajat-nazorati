// O'zbekiston mobil raqamlari: 998 + 2 xonali operator kodi + 7 xona. Saqlash formati: "998901234567".

// Operator kodlari (998 dan keyingi 2 raqam). Raqam boshqa operatorga ko'chirilgan bo'lishi mumkin,
// shuning uchun bu faqat taxmin: foydalanuvchi operatorni qo'lda o'zgartira oladi.
const PREFIXES = {
  beeline: ['90', '91'],
  ucell: ['93', '94', '50'],
  mobiuz: ['97', '88'],
  uzmobile: ['95', '99', '77'],
  humans: ['33'],
  perfectum: ['98'],
};

export const OPERATORS = [...Object.keys(PREFIXES), 'other'];

// "+998 90 123-45-67", "90 123 45 67", "998901234567" -> "998901234567"; noto'g'ri bo'lsa null.
export function normalizePhone(input) {
  const digits = String(input ?? '').replace(/\D/g, '');
  if (digits.length === 9) return `998${digits}`;
  if (digits.length === 12 && digits.startsWith('998')) return digits;
  return null;
}

export function detectOperator(number) {
  const code = number.slice(3, 5);
  return Object.keys(PREFIXES).find((op) => PREFIXES[op].includes(code)) ?? 'other';
}
