import { Link, NavLink, Outlet } from 'react-router';
import { BankIcon, FlagIcon, HomeIcon, ListIcon, RepeatIcon, TargetIcon } from './icons.jsx';
import { UserMenu } from './UserMenu.jsx';

// label — kompyuterdagi yuqori menyu; short — telefon/planshetdagi pastki menyu (5 ta tugma sig'ishi uchun).
// bottom: false — pastki menyuga sig'maydi; telefonda profil menyusi va Bosh sahifadan ochiladi.
const NAV = [
  { to: '/', label: 'Bosh sahifa', short: 'Asosiy', Icon: HomeIcon, end: true },
  { to: '/transactions', label: 'Tranzaksiyalar', short: 'Yozuvlar', Icon: ListIcon },
  { to: '/recurring', label: 'Takroriy', short: 'Takroriy', Icon: RepeatIcon },
  { to: '/budgets', label: 'Budjetlar', short: 'Budjet', Icon: TargetIcon },
  { to: '/goals', label: 'Maqsadlar', short: 'Maqsad', Icon: FlagIcon },
  { to: '/loans', label: 'Kreditlar', short: 'Kredit', Icon: BankIcon, bottom: false },
];

export function Layout() {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/80">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4">
          <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="Xarajat Nazorati: bosh sahifa">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-brand-500 to-brand-700 text-base font-black text-white shadow-md shadow-brand-900/30">
              X
            </span>
            <span className="leading-none">
              <span className="block text-[15px] font-bold tracking-tight">Xarajat</span>
              <span className="mt-0.5 block text-[11px] font-medium text-slate-500 dark:text-slate-400">Nazorati</span>
            </span>
          </Link>

          {/* Yuqori menyu faqat keng ekranda: planshet va telefonda pastki menyu ishlatiladi. */}
          <nav className="mx-auto hidden items-center gap-0.5 rounded-2xl border border-slate-200/70 bg-slate-100/70 p-1 lg:flex dark:border-slate-800 dark:bg-slate-900/70">
            {NAV.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `rounded-xl px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto lg:ml-0">
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-5 pb-44 md:pb-28 lg:pb-10">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/70 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden dark:border-slate-800/70 dark:bg-slate-950/90">
        <div className="mx-auto grid max-w-xl grid-cols-5">
          {NAV.filter((n) => n.bottom !== false).map(({ to, short, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 pt-2 pb-1.5 text-[11px] font-medium transition ${
                  isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`flex h-7 w-12 items-center justify-center rounded-full transition ${isActive ? 'bg-brand-500/15' : ''}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="max-w-full truncate px-0.5">{short}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
