import { PlusIcon } from './icons.jsx';

// Mobilda pastki menyu ustida suzuvchi "+" tugmasi; kattaroq ekranda sahifadagi oddiy tugma ishlatiladi.
export function Fab({ onClick, label = "Tranzaksiya qo'shish" }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-20 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-900/30 transition hover:bg-brand-700 active:scale-95 md:hidden"
    >
      <PlusIcon className="h-6 w-6" />
    </button>
  );
}
