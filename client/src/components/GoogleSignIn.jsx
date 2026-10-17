import { useEffect, useRef, useState } from 'react';
import { authApi } from '../api/auth.js';
import { useAuth } from '../context/AuthContext.jsx';
import { isStandalone } from '../pwa.js';

// Google Identity Services: telefon/noutbukdagi Google akkauntlar o'zi taklif qilinadi (One Tap),
// tugma esa akkaunt tanlash oynasini ochadi ("Boshqa akkaunt" orqali istalgan akkauntni yozib kirish mumkin).
const GSI_SRC = 'https://accounts.google.com/gsi/client';

let scriptPromise = null;
function loadGsi() {
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = GSI_SRC;
    s.async = true;
    s.onload = () => resolve(window.google);
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error('Google skripti yuklanmadi'));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

let configPromise = null;
const loadConfig = () =>
  (configPromise ??= authApi.config().catch((err) => {
    configPromise = null;
    throw err;
  }));

const REDIRECT_ERRORS = {
  csrf: "Google orqali kirish to'xtatildi. Qaytadan urinib ko'ring",
  invalid: "Google orqali kirib bo'lmadi. Qaytadan urinib ko'ring",
  config: 'Google orqali kirish hali sozlanmagan',
};

// Redirect usulida server xatoni #google_error=... bilan qaytaradi.
function takeRedirectError() {
  const m = /[#&]google_error=([a-z]+)/.exec(window.location.hash);
  if (!m) return '';
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  return REDIRECT_ERRORS[m[1]] ?? REDIRECT_ERRORS.invalid;
}

export function GoogleSignIn({ dividerText = 'yoki email bilan' }) {
  const { loginWithGoogle } = useAuth();
  const ref = useRef(null);
  // 'loading' | 'ready' | 'off' (sozlanmagan) | 'error' (skript yuklanmadi)
  const [state, setState] = useState('loading');
  const [error, setError] = useState(takeRedirectError);
  const [busy, setBusy] = useState(false);

  const onCredential = useRef(null);
  onCredential.current = async (credential) => {
    setBusy(true);
    setError('');
    try {
      await loginWithGoogle(credential);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let clientId;
      try {
        clientId = (await loadConfig()).googleClientId;
      } catch {
        return !cancelled && setState('error');
      }
      if (!clientId) return !cancelled && setState('off');

      let google;
      try {
        google = await loadGsi();
      } catch {
        return !cancelled && setState('error');
      }
      if (cancelled || !ref.current) return;

      // O'rnatilgan ilovada (iPhone bosh ekrani, Android ilova) popup oynalar ishonchsiz:
      // u yerda Google sahifasiga o'tib, server orqali qaytiladi.
      const redirect = isStandalone();
      google.accounts.id.initialize({
        client_id: clientId,
        callback: (r) => onCredential.current(r.credential),
        ux_mode: redirect ? 'redirect' : 'popup',
        login_uri: `${window.location.origin}/api/auth/google/redirect`,
        auto_select: false,
        cancel_on_tap_outside: false,
        context: 'signin',
        itp_support: true,
        use_fedcm_for_prompt: true,
        use_fedcm_for_button: true,
      });
      const dark = document.documentElement.classList.contains('dark');
      google.accounts.id.renderButton(ref.current, {
        type: 'standard',
        theme: dark ? 'filled_black' : 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        logo_alignment: 'center',
        width: Math.min(Math.max(ref.current.clientWidth, 200), 400),
        locale: 'uz',
      });
      // Qurilmadagi Google akkauntlarni o'zi taklif qiladi (foydalanuvchi yopsa, Google uni bir muddat ko'rsatmaydi).
      google.accounts.id.prompt();
      setState('ready');
    })();
    return () => {
      cancelled = true;
      window.google?.accounts?.id?.cancel();
    };
  }, []);

  if (state === 'off') return null;

  return (
    <div className="space-y-4">
      <div className="relative min-h-11">
        <div ref={ref} className={`flex justify-center ${busy ? 'pointer-events-none opacity-50' : ''}`} />
        {state === 'loading' && <div className="absolute inset-0 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />}
        {state === 'error' && (
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Google orqali kirish hozir mavjud emas. Internetni tekshiring yoki email bilan kiring.
          </p>
        )}
      </div>
      {busy && <p className="text-center text-sm text-slate-500 dark:text-slate-400">Kirilmoqda…</p>}
      {error && <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        {dividerText}
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  );
}
