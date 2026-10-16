import { useState } from 'react';
import { Link } from 'react-router';
import { AuthShell, FormField } from '../components/AuthShell.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      // Muvaffaqiyatli kirgandan keyin GuestRoute foydalanuvchini kerakli sahifaga yo'naltiradi.
      await login(form);
    } catch (err) {
      setErrors(err.code === 'VALIDATION_ERROR' ? err.fieldErrors : { form: err.message });
      setBusy(false);
    }
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <AuthShell
      title="Xush kelibsiz"
      subtitle="Xarajatlaringizni nazorat qilish uchun tizimga kiring"
      footer={
        <>
          Hisobingiz yo'qmi?{' '}
          <Link to="/register" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
            Ro'yxatdan o'ting
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormField id="email" label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} required />
        <FormField id="password" label="Parol" type="password" autoComplete="current-password" value={form.password} onChange={set('password')} error={errors.password} required />
        {errors.form && <p className="text-sm text-red-600 dark:text-red-400">{errors.form}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Kirilmoqda…' : 'Kirish'}
        </button>
        {import.meta.env.DEV && (
          <p className="text-center text-xs text-slate-400">Demo: demo@xarajat.uz / demo1234</p>
        )}
      </form>
    </AuthShell>
  );
}
