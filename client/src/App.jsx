import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { AnimatedBackground } from './components/AnimatedBackground.jsx';
import { Layout } from './components/Layout.jsx';
import { FullScreenSpinner, GuestRoute, ProtectedRoute } from './components/RouteGuards.jsx';

// Sahifalar alohida yuklanadi: login sahifasi og'ir grafik kutubxonasini (Recharts) kutmaydi.
const Budgets = lazy(() => import('./pages/Budgets.jsx'));
const Categories = lazy(() => import('./pages/Categories.jsx'));
const Goals = lazy(() => import('./pages/Goals.jsx'));
const Recurring = lazy(() => import('./pages/Recurring.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const Transactions = lazy(() => import('./pages/Transactions.jsx'));

export default function App() {
  return (
    <>
      <AnimatedBackground />
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
              <Route path="recurring" element={<Recurring />} />
              <Route path="goals" element={<Goals />} />
              <Route path="categories" element={<Categories />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}
