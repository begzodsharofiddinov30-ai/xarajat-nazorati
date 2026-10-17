import { useState } from 'react';
import { Link } from 'react-router';
import { authApi } from '../api/auth.js';
import { ChevronRightIcon, DownloadIcon, TagIcon } from '../components/icons.jsx';
import { Modal } from '../components/Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { isIos, promptInstall, usePwa } from '../pwa.js';

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
  const { replaceSession } = useAuth();
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
      replaceSession(await authApi.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword }));
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      toast("Parol o'zgartirildi. Boshqa qurilmalardagi sessiyalar tugatildi");
    } catch (err) {
      setErrors(err.code === 'VALIDATION_ERROR' ? err.fieldErrors : { form: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2 className="mb-3 font-semibold">Parolni almashtirish</h2>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <div>
          <label className="label" htmlFor="p-current">
            Joriy parol
          </label>
          <input id="p-current" type="password" autoComplete="current-password" className="input" value={form.currentPassword} onChange={set('currentPassword')} />
          <FieldError>{errors.currentPassword}</FieldError>
        </div>
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
        <button className="btn-primary" disabled={busy || !form.currentPassword || !form.newPassword}>
          {busy ? 'Saqlanmoqda…' : "Parolni o'zgartirish"}
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

// Ilovani telefon yoki kompyuterga o'rnatish: Android/Chrome'da bitta tugma, iPhone'da qo'lda bajariladigan qadamlar.
function InstallCard() {
  const { canInstall, installed } = usePwa();
  const toast = useToast();

  async function install() {
    if (await promptInstall()) toast("Ilova o'rnatildi. Uni bosh ekrandan ochishingiz mumkin");
  }

  return (
    <section className="card">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white">
          <DownloadIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Ilova</h2>
          {installed ? (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Ilova o'rnatilgan. Yangi versiyalar avtomatik keladi.
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Telefoningizga o'rnating: bosh ekranda o'z ikonkasi bilan to'liq ekranda ochiladi, internet sekin bo'lsa ham tez yuklanadi.
            </p>
          )}
        </div>
      </div>

      {!installed && canInstall && (
        <button className="btn-primary mt-4 w-full sm:w-auto" onClick={install}>
          Ilovani o'rnatish
        </button>
      )}

      {!installed && !canInstall && (
        <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-slate-600 dark:text-slate-300">
          {isIos() ? (
            <>
              <li>Saytni <b>Safari</b> brauzerida oching.</li>
              <li>Pastdagi <b>Ulashish</b> tugmasini bosing (kvadrat va yuqoriga strelka).</li>
              <li><b>Bosh ekranga qo'shish</b> (Add to Home Screen) ni tanlang.</li>
              <li>O'ng yuqoridagi <b>Qo'shish</b> ni bosing.</li>
            </>
          ) : (
            <>
              <li>Saytni <b>Chrome</b> (yoki Edge, Samsung Internet) brauzerida oching.</li>
              <li>Brauzer menyusini oching (<b>⋮</b>).</li>
              <li><b>Ilovani o'rnatish</b> yoki <b>Bosh ekranga qo'shish</b> ni tanlang.</li>
            </>
          )}
        </ol>
      )}
    </section>
  );
}

function DeleteAccount() {
  const { logout } = useAuth();
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
      await authApi.deleteAccount({ password });
      toast("Hisob o'chirildi");
      logout();
    } catch (err) {
      setError(err.fieldErrors?.password ?? err.message);
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
            <p className="text-sm text-slate-600 dark:text-slate-300">Tasdiqlash uchun parolingizni kiriting.</p>
            <div>
              <label className="label" htmlFor="d-password">
                Parol
              </label>
              <input id="d-password" type="password" autoComplete="current-password" className="input" value={password} autoFocus onChange={(e) => setPassword(e.target.value)} />
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

      <ProfileCard />
      <PasswordCard />
      <SessionsCard />
      <DeleteAccount />
    </div>
  );
}
