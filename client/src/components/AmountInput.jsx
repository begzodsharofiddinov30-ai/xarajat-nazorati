import { groupDigits, parseAmount } from '../utils/format.js';

// Summa raqamlar guruhlangan holda ko'rsatiladi ("1 250 000"), lekin qiymat butun son bo'lib qoladi.
export function AmountInput({ value, onChange, id, autoFocus, invalid }) {
  return (
    <div className="relative">
      <input
        id={id}
        className="input pr-14 text-lg font-semibold tabular-nums sm:text-base"
        inputMode="numeric"
        autoComplete="off"
        placeholder="0"
        autoFocus={autoFocus}
        aria-invalid={invalid || undefined}
        value={value ? groupDigits(value) : ''}
        onChange={(e) => onChange(Math.min(parseAmount(e.target.value), 999_999_999_999))}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">
        so'm
      </span>
    </div>
  );
}
