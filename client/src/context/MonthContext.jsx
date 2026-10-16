import { createContext, useContext, useState } from 'react';
import { currentMonth } from '../utils/month.js';

// Tanlangan oy sahifalar o'rtasida saqlanadi: Bosh sahifadan Tranzaksiyalarga o'tganda oy o'zgarmaydi.
const MonthContext = createContext(null);

export function MonthProvider({ children }) {
  const [month, setMonth] = useState(currentMonth);
  return <MonthContext.Provider value={{ month, setMonth }}>{children}</MonthContext.Provider>;
}

export const useMonth = () => useContext(MonthContext);
