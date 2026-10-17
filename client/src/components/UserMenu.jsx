import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { InstallButton } from './InstallButton.jsx';
import { BankIcon, LogoutIcon, MonitorIcon, MoonIcon, SettingsIcon, SunIcon, TagIcon } from './icons.jsx';

const THEMES = [
  ['system', 'Tizim', MonitorIcon],
  ['light', "Yorug'", SunIcon],
  ['dark', "Qorong'i", MoonIcon],
];

const LINKS = [
  ['/settings', 'Sozlamalar', SettingsIcon],
  ['/categories', 'Kategoriyalar', TagIcon],
  ['/loans', 'Kreditlar', BankIcon],
];

const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';

function Avatar({ name, className = '' }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-linear-to-br from-brand-500 to-brand-700 font-semibold text-white ${className}`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

// Sarlavhadagi profil tugmasi: mavzu, sozlamalar, ilovani o'rnatish va chiqish bitta menyuda.
// Menyu yopilganda ham DOM'da qoladi (faqat yashiriladi): ichidagi "Ilovani o'rnatish" oynasi yopilib ketmasligi uchun.
export function UserMenu() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      // Menyudan tashqarida bosilsa yopiladi (menyudan ochilgan oyna ichidagi bosishlar bundan mustasno).
      if (!ref.current?.contains(e.target) && !e.target.closest?.('[role="dialog"]')) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const base = 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition';
  const item = `${base} text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800`;

  return (
    <div ref={ref} className="relative">
      <button
        className="flex items-center gap-2 rounded-full p-1 transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:outline-none dark:hover:bg-slate-800"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Profil menyusi"
      >
        <Avatar name={user?.name} className="h-9 w-9 text-sm" />
      </button>

      <div
        role="menu"
        className={`absolute top-full right-0 z-40 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/40 ${
          open ? '' : 'hidden'
        }`}
      >
        <div className="flex items-center gap-3 px-3 pt-2 pb-3">
          <Avatar name={user?.name} className="h-10 w-10" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user?.name}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
          </div>
        </div>

        <div className="mx-1 mb-2 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="radiogroup" aria-label="Mavzu">
          {THEMES.map(([key, label, Icon]) => (
            <button
              key={key}
              role="radio"
              aria-checked={theme === key}
              onClick={() => setTheme(key)}
              className={`flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] font-medium transition ${
                theme === key
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {LINKS.map(([to, label, Icon]) => (
          <Link key={to} to={to} role="menuitem" className={item}>
            <Icon className="h-4.5 w-4.5 text-slate-400" />
            {label}
          </Link>
        ))}
        {/* Bosilganda menyu yashiriladi, o'rnatish oynasi esa ochiq qoladi. */}
        <div onClick={() => setOpen(false)}>
          <InstallButton variant="menu" className={item} />
        </div>

        <div className="my-2 h-px bg-slate-100 dark:bg-slate-800" />
        <button role="menuitem" className={`${base} text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40`} onClick={logout}>
          <LogoutIcon className="h-4.5 w-4.5" />
          Chiqish
        </button>
      </div>
    </div>
  );
}
