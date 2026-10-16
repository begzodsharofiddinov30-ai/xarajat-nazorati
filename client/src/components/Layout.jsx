import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { HomeIcon, ListIcon, LogoutIcon, MonitorIcon, MoonIcon, SunIcon, TargetIcon } from './icons.jsx';

const NAV = [
  { to: '/', label: 'Bosh sahifa', Icon: HomeIcon, end: true },
  { to: '/transactions', label: 'Tranzaksiyalar', Icon: ListIcon },
  { to: '/budgets', label: 'Budjetlar', Icon: TargetIcon },
];

const THEMES = {
  system: { Icon: MonitorIcon, label: 'Mavzu: tizim' },
  light: { Icon: SunIcon, label: "Mavzu: yorug'" },
  dark: { Icon: MoonIcon, label: "Mavzu: qorong'i" },
};

export function Layout() {
  const { user, logout } = useAuth();
  const { theme, cycle } = useTheme();
  const T = THEMES[theme];

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
          <NavLink to="/" className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">X</span>
            <span className="hidden sm:inline">Xarajat Nazorati</span>
          </NavLink>

          <nav className="ml-4 hidden gap-1 md:flex">
            {NAV.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <span className="mr-2 hidden max-w-40 truncate text-sm text-slate-500 sm:inline dark:text-slate-400">
              {user?.name}
            </span>
            <button className="btn-icon" onClick={cycle} aria-label={T.label} title={T.label}>
              <T.Icon />
            </button>
            <button className="btn-icon" onClick={logout} aria-label="Chiqish" title="Chiqish">
              <LogoutIcon />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-5 pb-28 md:pb-10">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-950/95">
        <div className="grid grid-cols-3">
          {NAV.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                  isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
