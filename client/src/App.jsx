import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { Layout } from './components/Layout.jsx';
import { FullScreenSpinner, GuestRoute, ProtectedRoute } from './components/RouteGuards.jsx';

// Sahifalar alohida yuklanadi: login sahifasi og'ir grafik kutubxonasini (Recharts) kutmaydi.
const Budgets = lazy(() => import('./pages/Budgets.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const Transactions = lazy(() => import('./pages/Transactions.jsx'));

export default function App() {
  return (
    <Suspense fallback={<FullScreenSpinner />}>
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="budgets" element={<Budgets />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
