import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { categoriesApi } from '../api/categories.js';
import { setCustomCategories } from '../utils/categories.js';
import { useAuth } from './AuthContext.jsx';

const CategoriesContext = createContext(null);

// Foydalanuvchining o'z kategoriyalarini yuklab, utils/categories.js ro'yxatlariga joylaydi.
// Ro'yxat o'zgarganda butun daraxt qayta chiziladi (key), shunda nomlar va ikonkalar hamma joyda yangilanadi.
export function CategoriesProvider({ children }) {
  const { status } = useAuth();
  const [custom, setCustom] = useState([]);
  const [version, setVersion] = useState(0);

  const apply = useCallback((list) => {
    setCustom(list);
    if (setCustomCategories(list)) setVersion((v) => v + 1);
  }, []);

  const refresh = useCallback(() => categoriesApi.list().then(apply), [apply]);

  useEffect(() => {
    if (status === 'authed') {
      refresh().catch(() => {
        /* Tarmoq xatosida tayyor kategoriyalar bilan ishlaydi */
      });
    } else if (status === 'guest') {
      apply([]);
    }
  }, [status, refresh, apply]);

  const value = useMemo(() => ({ custom, refresh }), [custom, refresh]);

  return (
    <CategoriesContext.Provider value={value}>
      <Fragment key={version}>{children}</Fragment>
    </CategoriesContext.Provider>
  );
}

export const useCategories = () => useContext(CategoriesContext);
