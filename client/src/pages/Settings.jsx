import { useState } from 'react';
import { Link } from 'react-router';
import { authApi } from '../api/auth.js';
import { ChevronRightIcon, DownloadIcon, TagIcon } from '../components/icons.jsx';
import { InstallButton } from '../components/InstallButton.jsx';
import { Modal } from '../components/Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { usePwa } from '../pwa.js';

function FieldError({ children }) {
  return children ? <p className="mt-1 text-sm text-red-600 dark:text-red-400">{children}</p> : null;
}

function ProfileCard() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      updateUser(await authApi.updateProfile({ name }));
      toast('Ism yangilandi');
    } catch (err) {
      setError(err.fieldErrors?.name ?? err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2 className="mb-3 font-semibold">Profil</h2>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <div>
          <label className="label" htmlFor="s-name">
            Ism
          </label>
          <input id="s-name" className="input" maxLength={50} value={name} onChange={(e) => setName(e.target.value)} />
          <FieldError>{error}</FieldError>
        </div>
        <div>
          <label className="label" htmlFor="s-email">
            Email
          </label>
          <input id="s-email" className="input" value={user?.email ?? ''} disabled readOnly />
        </div>
        <button className="btn-primary" disabled={busy || name.trim() === user?.name}>
          {busy ? 'Saqlanmoqda…' : 'Saqlash'}
        </button>
      </form>
    </section>
  );
}

function PasswordCard() {
  const { user, replaceSession, updateUser } = useAuth();
  // Faqat Google orqali ochilgan hisobda hali parol yo'q: birinchi parol joriy parolsiz o'rnatiladi.
  const hasPassword = user?.hasPassword !== false;
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (form.newPassword !== form.confirm) return setErrors({ confirm: 'Parollar mos kelmadi' });
    setBusy(true);
    setErrors({});
    try {
      const session = await authApi.changePassword({
        ...(hasPassword && { currentPassword: form.currentPassword }),
        newPassword: form.newPassword,
      });
      replaceSession(session);
      updateUser(session.user);
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      toast(
        hasPassword
          ? "Parol o'zgartirildi. Boshqa qurilmalardagi sessiyalar tugatildi"
          : "Parol o'rnatildi. Endi email va parol bilan ham kirishingiz mumkin",
      );
    } catch (err) {
      setErrors(err.code === 'VALIDATION_ERROR' ? err.fieldErrors : { form: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2 className="mb-3 font-semibold">{hasPassword ? 'Parolni almashtirish' : "Parol o'rnatish"}</h2>
      {!hasPassword && (
        <p className="-mt-1 mb-3 text-sm text-slate-500 dark:text-slate-400">
          Hisobingiz Google orqali ochilgan. Parol o'rnatsangiz, email va parol bilan ham kira olasiz.
        </p>
      )}
      <form onSubmit={submit} className="space-y-3" noValidate>
        {hasPassword && (
          <div>
            <label className="label" htmlFor="p-current">
              Joriy parol
            </label>
            <input id="p-current" type="password" autoComplete="current-password" className="input" value={form.currentPassword} onChange={set('currentPassword')} />
            <FieldError>{errors.currentPassword}</FieldError>
          </div>
        )}
        <div>
          <label className="label" htmlFor="p-new">
            Yangi parol
          </label>
          <input id="p-new" type="password" autoComplete="new-password" className="input" value={form.newPassword} onChange={set('newPassword')} />
          <FieldError>{errors.newPassword}</FieldError>
        </div>
        <div>
          <label className="label" htmlFor="p-confirm">
            Yangi parolni takrorlang
          </label>
          <input id="p-confirm" type="password" autoComplete="new-password" className="input" value={form.confirm} onChange={set('confirm')} />
          <FieldError>{errors.confirm}</FieldError>
        </div>
        <FieldError>{errors.form}</FieldError>
        <button className="btn-primary" disabled={busy || (hasPassword && !form.currentPassword) || !form.newPassword}>
          {busy ? 'Saqlanmoqda…' : hasPassword ? "Parolni o'zgartirish" : "Parol o'rnatish"}
        </button>
      </form>
    </section>
  );
}

function SessionsCard() {
  const { replaceSession } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function logoutAll() {
    setBusy(true);
    try {
      replaceSession(await authApi.logoutAll());
      toast('Boshqa barcha qurilmalardan chiqarildi');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2 className="font-semibold">Sessiyalar</h2>
      <p className="mt-1 mb-3 text-sm text-slate-500 dark:text-slate-400">
        Telefon yoki boshqa kompyuterda hisobingiz ochiq qolgan bo'lsa, ularning hammasidan chiqarib yuboring. Joriy qurilmada kirgan holda qolasiz.
      </p>
      <button className="btn-secondary" onClick={logoutAll} disabled={busy}>
        Boshqa qurilmalardan chiqish
      </button>
    </section>
  );
}

// Ilovani telefon yoki kompyuterga o'rnatish.
function InstallCard() {
  const { installed } = usePwa();
  return (
    <section className="card">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white">
          <DownloadIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Ilova</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {installed
              ? "Ilova o'rnatilgan. Yangi versiyalar avtomatik keladi."
              : "Telefoningizga o'rnating: bosh ekranda o'z ikonkasi bilan to'liq ekranda ochiladi, internet sekin bo'lsa ham tez yuklanadi."}
          </p>
        </div>
      </div>
      <InstallButton className="mt-4 w-full sm:w-auto" />
    </section>
  );
}

function DeleteAccount() {
  const { user, logout } = useAuth();
  const hasPassword = user?.hasPassword !== false;
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await authApi.deleteAccount(hasPassword ? { password } : { confirmEmail: password });
      toast("Hisob o'chirildi");
      logout();
    } catch (err) {
      setError(err.fieldErrors?.password ?? err.fieldErrors?.confirmEmail ?? err.message);
      setBusy(false);
    }
  }

  return (
    <section className="card border-red-200 dark:border-red-900/60">
      <h2 className="font-semibold text-red-700 dark:text-red-400">Hisobni o'chirish</h2>
      <p className="mt-1 mb-3 text-sm text-slate-500 dark:text-slate-400">
        Barcha tranzaksiyalar, budjetlar, kategoriyalar, takroriy qoidalar va maqsadlar butunlay o'chiriladi. Buni qaytarib bo'lmaydi.
      </p>
      <button className="btn-danger" onClick={() => setOpen(true)}>
        Hisobni o'chirish
      </button>

      {open && (
        <Modal title="Hisobni o'chirish" onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {hasPassword ? 'Tasdiqlash uchun parolingizni kiriting.' : `Tasdiqlash uchun emailingizni yozing: ${user?.email}`}
            </p>
            <div>
              <label className="label" htmlFor="d-password">
                {hasPassword ? 'Parol' : 'Email'}
              </label>
              {hasPassword ? (
                <input id="d-password" type="password" autoComplete="current-password" className="input" value={password} autoFocus onChange={(e) => setPassword(e.target.value)} />
              ) : (
                <input id="d-password" type="email" autoComplete="off" className="input" value={password} autoFocus onChange={(e) => setPassword(e.target.value)} />
              )}
              <FieldError>{error}</FieldError>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setOpen(false)}>
                Bekor qilish
              </button>
              <button className="btn-danger flex-1" disabled={busy || !password}>
                {busy ? "O'chirilmoqda…" : "Butunlay o'chirish"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

export default function Settings() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-lg font-semibold">Sozlamalar</h1>

      <InstallCard />

      <Link to="/categories" className="card flex items-center gap-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
          <TagIcon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Kategoriyalar</span>
          <span className="block text-sm text-slate-500 dark:text-slate-400">O'z kategoriya va ikonkalaringizni qo'shing</span>
        </span>
        <ChevronRightIcon className="h-5 w-5 text-slate-400" />
      </Link>

      <Link to="/loans" className="card flex items-center gap-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-xl dark:bg-slate-800" aria-hidden="true">
          🏦
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Kreditlar</span>
          <span className="block text-sm text-slate-500 dark:text-slate-400">Kreditlar, muddatli to'lovlar va to'lov jadvali</span>
        </span>
        <ChevronRightIcon className="h-5 w-5 text-slate-400" />
      </Link>

      <ProfileCard />
      <PasswordCard />
      <SessionsCard />
      <DeleteAccount />
    </div>
  );
}
