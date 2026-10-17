// Mobil operatorlar (server/src/utils/phone.js bilan bir xil kodlar). Ranglar operator brendiga yaqin.
export const OPERATORS = {
  beeline: { label: 'Beeline', bg: '#facc15', fg: '#111827', codes: ['90', '91'] },
  ucell: { label: 'Ucell', bg: '#7c3aed', fg: '#ffffff', codes: ['93', '94', '50'] },
  mobiuz: { label: 'Mobiuz', bg: '#e11d48', fg: '#ffffff', codes: ['97', '88'] },
  uzmobile: { label: 'Uzmobile', bg: '#2563eb', fg: '#ffffff', codes: ['95', '99', '77'] },
  humans: { label: 'Humans', bg: '#16a34a', fg: '#ffffff', codes: ['33'] },
  perfectum: { label: 'Perfectum', bg: '#ea580c', fg: '#ffffff', codes: ['98'] },
  other: { label: 'Boshqa', bg: '#64748b', fg: '#ffffff', codes: [] },
};

export function normalizePhone(input) {
  const digits = String(input ?? '').replace(/\D/g, '');
  if (digits.length === 9) return `998${digits}`;
  if (digits.length === 12 && digits.startsWith('998')) return digits;
  return null;
}

export function detectOperator(number) {
  const code = number?.slice(3, 5);
  return Object.keys(OPERATORS).find((k) => OPERATORS[k].codes.includes(code)) ?? 'other';
}

// "998901234567" -> "+998 90 123 45 67"
export function formatPhone(number) {
  const m = /^998(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(number ?? '');
  return m ? `+998 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : number;
}
