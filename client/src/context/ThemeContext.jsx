import { createContext, useContext, useEffect, useState } from 'react';
import { getItem, setItem } from '../utils/storage.js';

const ThemeContext = createContext(null);
const ORDER = ['system', 'light', 'dark'];
const media = () => window.matchMedia('(prefers-color-scheme: dark)');

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => getItem('xn_theme') || 'dark');

  useEffect(() => {
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media().matches);
      document.documentElement.classList.toggle('dark', dark);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#09090b' : '#ffffff');
    };
    apply();
    setItem('xn_theme', theme);
    if (theme !== 'system') return;
    const mq = media();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  const cycle = () => setTheme((t) => ORDER[(ORDER.indexOf(t) + 1) % ORDER.length]);

  return <ThemeContext.Provider value={{ theme, setTheme, cycle }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
