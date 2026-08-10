import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import AppShell from './components/layout/AppShell';
import { Spinner } from './components/ui/Feedback';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import HistoryPage from './pages/HistoryPage';

// Recharts is ~115 kB gzipped and only Analytics needs it. Split out so the
// dashboard — the page people actually land on — does not pay for it.
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
import SchedulePage from './pages/SchedulePage';
import SafetyPage from './pages/SafetyPage';
import BudgetPage from './pages/BudgetPage';
import ComparisonPage from './pages/ComparisonPage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';

/**
 * Nothing renders until Firebase has restored the session.
 *
 * Without this gate a deep-linked route would bounce to /login for the moment
 * before onAuthStateChanged fires, then bounce back — which is exactly the
 * "login does not survive F5" symptom, just caused by routing instead of
 * persistence.
 */
const AuthGate = ({ children, requireAuth }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <Spinner label="Restoring your session" />
      </div>
    );
  }

  if (requireAuth && !user) {
    // Remember where they were headed so sign-in lands there, not on /.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!requireAuth && user) {
    return <Navigate to={location.state?.from?.pathname || '/'} replace />;
  }

  return children;
};

export const App = () => (
  <Routes>
    <Route
      path="/login"
      element={
        <AuthGate requireAuth={false}>
          <LoginPage />
        </AuthGate>
      }
    />
    <Route
      path="/register"
      element={
        <AuthGate requireAuth={false}>
          <RegisterPage />
        </AuthGate>
      }
    />
    <Route
      path="/forgot-password"
      element={
        <AuthGate requireAuth={false}>
          <ForgotPasswordPage />
        </AuthGate>
      }
    />

    <Route
      element={
        <AuthGate requireAuth>
          <AppShell />
        </AuthGate>
      }
    >
      <Route index element={<DashboardPage />} />
      <Route
        path="analytics"
        element={
          <Suspense fallback={<Spinner label="Loading analytics" />}>
            <AnalyticsPage />
          </Suspense>
        }
      />
      <Route path="history" element={<HistoryPage />} />
      <Route path="schedule" element={<SchedulePage />} />
      <Route path="safety" element={<SafetyPage />} />
      <Route path="budget" element={<BudgetPage />} />
      <Route path="comparison" element={<ComparisonPage />} />
      <Route path="notifications" element={<NotificationsPage />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);

export default App;
