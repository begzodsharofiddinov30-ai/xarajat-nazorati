import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/auth.js';
import { getToken, onUnauthorized, setToken } from '../api/client.js';

const AuthContext = createContext(null);

// Google redirect usulidan qaytganda server tokenni URL fragmentida beradi (#token=...).
// Token darhol saqlanib, manzildan o'chiriladi (tarixda va ulashilgan havolada qolmasligi uchun).
function consumeRedirectToken() {
  const m = /[#&]token=([^&]+)/.exec(window.location.hash);
  if (!m) return;
  setToken(decodeURIComponent(m[1]));
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // 'loading' — token tekshirilmoqda; 'authed'; 'guest'; 'offline' — server bilan aloqa yo'q
  const [status, setStatus] = useState(() => {
    consumeRedirectToken();
    return getToken() ? 'loading' : 'guest';
  });

  const logout = useCallback(() => {
    // Chiqqandan keyin Google akkaunt avtomatik qayta tanlanmasin.
    window.google?.accounts?.id?.disableAutoSelect();
    setToken(null);
    setUser(null);
    setStatus('guest');
  }, []);

  const checkSession = useCallback(() => {
    if (!getToken()) return setStatus('guest');
    setStatus('loading');
    authApi
      .me()
      .then((u) => {
        setUser(u);
        setStatus('authed');
      })
      // 401 bo'lsa onUnauthorized orqali chiqariladi; tarmoq yoki server xatosida token saqlanib qoladi.
      .catch((err) => (err.status === 401 ? logout() : setStatus('offline')));
  }, [logout]);

  useEffect(() => {
    onUnauthorized(logout);
    checkSession();
  }, [logout, checkSession]);

  // Ilova internetsiz ochilgan bo'lsa, internet qaytishi bilan sessiya qayta tekshiriladi.
  useEffect(() => {
    if (status !== 'offline') return;
    window.addEventListener('online', checkSession);
    return () => window.removeEventListener('online', checkSession);
  }, [status, checkSession]);

  const finish = useCallback(({ token, user: u }) => {
    setToken(token);
    setUser(u);
    setStatus('authed');
  }, []);

  // Profil yangilanganda (ism) yoki token almashganda (parol o'zgarishi) sessiyani shu yerda saqlaymiz.
  const updateUser = useCallback((u) => setUser(u), []);
  const replaceSession = useCallback(({ token, user: u }) => {
    setToken(token);
    setUser(u);
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      login: async (body) => finish(await authApi.login(body)),
      register: async (body) => finish(await authApi.register(body)),
      loginWithGoogle: async (credential) => finish(await authApi.google(credential)),
      logout,
      retry: checkSession,
      updateUser,
      replaceSession,
    }),
    [user, status, finish, logout, checkSession, updateUser, replaceSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
