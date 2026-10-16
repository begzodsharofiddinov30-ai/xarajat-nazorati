import { useMonth } from '../context/MonthContext.jsx';
import { currentMonth, monthLabel, shiftMonth } from '../utils/month.js';
import { ChevronLeftIcon, ChevronRightIcon } from './icons.jsx';

export function MonthPicker() {
  const { month, setMonth } = useMonth();
  const isCurrent = month === currentMonth();

  return (
    <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <button className="btn-icon" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Oldingi oy">
        <ChevronLeftIcon />
      </button>
      <button
        className="min-w-32 px-2 text-center text-sm font-semibold"
        onClick={() => setMonth(currentMonth())}
        title={isCurrent ? undefined : 'Joriy oyga qaytish'}
      >
        {monthLabel(month)}
      </button>
      <button className="btn-icon" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Keyingi oy">
        <ChevronRightIcon />
      </button>
    </div>
  );
}
