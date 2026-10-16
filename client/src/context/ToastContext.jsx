import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertIcon, CheckIcon, XIcon } from '../components/icons.jsx';

const ToastContext = createContext(null);

const STYLES = {
  success: { icon: CheckIcon, color: 'var(--status-good)', title: 'Tayyor' },
  warning: { icon: AlertIcon, color: 'var(--status-warning)', title: 'Budjet oshdi' },
  error: { icon: AlertIcon, color: 'var(--status-critical)', title: 'Xatolik' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback(
    (message, type = 'success') => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-2), { id, message, type }]);
      setTimeout(() => dismiss(id), type === 'warning' ? 8000 : 4000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const s = STYLES[t.type];
          const Icon = s.icon;
          return (
            <div
              key={t.id}
              role={t.type === 'success' ? 'status' : 'alert'}
              className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border border-slate-200 border-l-4 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-800"
              style={{ borderLeftColor: s.color }}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" style={{ color: s.color }} />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold">{s.title}</p>
                <p className="text-slate-600 dark:text-slate-300">{t.message}</p>
              </div>
              <button className="btn-icon -m-1 h-7 w-7" onClick={() => dismiss(t.id)} aria-label="Yopish">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
