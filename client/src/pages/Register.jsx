import { useState } from 'react';
import { Link } from 'react-router';
import { AuthShell, FormField } from '../components/AuthShell.jsx';
import { GoogleSignIn } from '../components/GoogleSignIn.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await register(form);
    } catch (err) {
      setErrors(
        err.code === 'VALIDATION_ERROR'
          ? err.fieldErrors
          : err.code === 'EMAIL_TAKEN'
            ? { email: err.message }
            : { form: err.message },
      );
      setBusy(false);
    }
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <AuthShell
      title="Ro'yxatdan o'tish"
      subtitle="Bir daqiqada hisob yarating"
      footer={
        <>
          Hisobingiz bormi?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
            Kirish
          </Link>
        </>
      }
    >
      <GoogleSignIn dividerText="yoki email bilan ro'yxatdan o'ting" />
      <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
        <FormField id="name" label="Ism" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} required />
        <FormField id="email" label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} required />
        <FormField
          id="password"
          label="Parol (kamida 6 belgi)"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={set('password')}
          error={errors.password}
          required
        />
        {errors.form && <p className="text-sm text-red-600 dark:text-red-400">{errors.form}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Yaratilmoqda…' : 'Hisob yaratish'}
        </button>
      </form>
    </AuthShell>
  );
}
