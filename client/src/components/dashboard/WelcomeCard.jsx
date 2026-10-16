import { Link } from 'react-router';

const STEPS = [
  { icon: '💼', title: 'Daromadni kiriting', text: "Maosh yoki boshqa tushumni qo'shing" },
  { icon: '🛒', title: 'Xarajatlarni yozib boring', text: 'Har bir xarid 10 soniya oladi' },
  { icon: '🎯', title: "Limit qo'ying", text: "Oshib ketsa, darhol ogohlantiramiz" },
];

export function WelcomeCard({ onAddIncome, onAddExpense }) {
  return (
    <section className="card p-6">
      <h2 className="text-lg font-semibold">Xush kelibsiz! Boshlash uchun 3 qadam</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Bu oyda hali tranzaksiya yo'q. Birinchisini qo'shing, hisobot va grafiklar shu yerda paydo bo'ladi.
      </p>
      <ol className="mt-5 grid gap-3 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm dark:bg-slate-900">
              {s.icon}
            </span>
            <div>
              <p className="text-sm font-semibold">
                {i + 1}. {s.title}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className="btn-primary" onClick={onAddIncome}>
          Daromad qo'shish
        </button>
        <button className="btn-secondary" onClick={onAddExpense}>
          Xarajat qo'shish
        </button>
        <Link to="/budgets" className="btn-secondary">
          Limit qo'yish
        </Link>
      </div>
    </section>
  );
}
