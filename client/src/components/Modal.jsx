import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { XIcon } from './icons.jsx';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Mobil qurilmada pastdan chiquvchi panel, kattaroq ekranda markazdagi oyna.
// Fokus oyna ichida aylanadi va yopilganda oldingi elementga qaytadi.
export function Modal({ title, onClose, children }) {
  const ref = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = ref.current;
    const previouslyFocused = document.activeElement;
    if (!dialog.contains(document.activeElement)) dialog.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') return onCloseRef.current();
      if (e.key !== 'Tab') return;
      const items = [...dialog.querySelectorAll(FOCUSABLE)].filter((el) => !el.disabled);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl outline-none dark:bg-slate-900 sm:max-w-md sm:rounded-2xl sm:pb-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Yopish">
            <XIcon />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({ title, message, confirmText = "O'chirish", onConfirm, onClose, busy }) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="mb-5 text-sm text-slate-600 dark:text-slate-300">{message}</p>
      <div className="flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose}>
          Bekor qilish
        </button>
        <button className="btn-danger" onClick={onConfirm} disabled={busy}>
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
