import { useEffect, useSyncExternalStore } from 'react';
import { useToast } from '../context/ToastContext.jsx';
import { applyUpdate, usePwa } from '../pwa.js';

const subscribeOnline = (cb) => {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
};

export const useOnline = () => useSyncExternalStore(subscribeOnline, () => navigator.onLine);

// Yangi versiya haqida bildirishnoma va internet yo'qligi haqida doimiy belgi.
export function PwaPrompts() {
  const { updateReady } = usePwa();
  const online = useOnline();
  const toast = useToast();

  useEffect(() => {
    if (!updateReady) return;
    toast('Ilovaning yangi versiyasi chiqdi', 'success', {
      action: { label: 'Yangilash', onClick: applyUpdate },
      duration: 60_000,
    });
  }, [updateReady, toast]);

  if (online) return null;
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 top-[calc(3.75rem+env(safe-area-inset-top))] z-40 flex justify-center px-4"
    >
      <span className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-slate-100 dark:text-slate-900">
        Internet yo'q: yangi ma'lumotlar yuklanmaydi va saqlanmaydi
      </span>
    </div>
  );
}
