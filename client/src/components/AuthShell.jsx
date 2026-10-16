import { useTheme } from '../context/ThemeContext.jsx';
import { MonitorIcon, MoonIcon, SunIcon } from './icons.jsx';

const ICONS = { system: MonitorIcon, light: SunIcon, dark: MoonIcon };

export function AuthShell({ title, subtitle, children, footer }) {
  const { theme, cycle } = useTheme();
  const Icon = ICONS[theme];
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <button className="btn-icon fixed top-3 right-3" onClick={cycle} aria-label="Mavzuni almashtirish">
        <Icon />
      </button>
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-xl font-bold text-white">
            X
          </span>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        <div className="card p-6">{children}</div>
        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">{footer}</p>
      </div>
    </div>
  );
}

export function FormField({ id, label, error, ...inputProps }) {
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input id={id} className="input" aria-invalid={Boolean(error) || undefined} {...inputProps} />
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
