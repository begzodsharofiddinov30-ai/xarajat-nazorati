import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';

export function FullScreenSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Yuklanmoqda">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600 dark:border-slate-800" />
    </div>
  );
}

function OfflineScreen({ onRetry, onLogout }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="card max-w-sm text-center">
        <p className="text-lg font-semibold">Server bilan aloqa yo'q</p>
        <p className="mt-1 mb-4 text-sm text-slate-500 dark:text-slate-400">
          Internet aloqasini tekshirib, qayta urinib ko'ring.
        </p>
        <div className="flex justify-center gap-2">
          <button className="btn-secondary" onClick={onLogout}>
            Chiqish
          </button>
          <button className="btn-primary" onClick={onRetry}>
            Qayta urinish
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProtectedRoute() {
  const { status, retry, logout } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullScreenSpinner />;
  if (status === 'offline') return <OfflineScreen onRetry={retry} onLogout={logout} />;
  if (status === 'guest') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export function GuestRoute() {
  const { status, retry, logout } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullScreenSpinner />;
  if (status === 'offline') return <OfflineScreen onRetry={retry} onLogout={logout} />;
  if (status === 'authed') return <Navigate to={location.state?.from ?? '/'} replace />;
  return <Outlet />;
}
