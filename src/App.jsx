import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import AppShell from './components/layout/AppShell';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { Spinner } from './components/ui/Feedback';

import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import AuthActionPage from './pages/AuthActionPage';
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
import HelpPage from './pages/HelpPage';
import DocumentPage from './pages/DocumentPage';
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
    // Rebuild the whole deep link, not just the path — a query string or hash
    // on the route they were sent away from is part of where they were going.
    const from = location.state?.from;
    const target = from?.pathname
      ? `${from.pathname}${from.search || ''}${from.hash || ''}`
      : '/';
    return <Navigate to={target} replace />;
  }

  return children;
};

/*
 * Catch-all for everything outside AppShell — /login, /forgot-password and
 * /auth/action. Those have no sidebar to escape with, so this one is not keyed
 * on the path: reloading is the only useful move there anyway, and the fallback
 * offers it. Pages inside the shell get their own keyed boundary, which lets
 * the user simply navigate away.
 */
export const App = () => (
  <ErrorBoundary>
    <Routes>
      <Route
        path="/login"
        element={
          <AuthGate requireAuth={false}>
            <LoginPage />
          </AuthGate>
        }
      />
      {/* No /register route by design. An account has to be created on the phone
          app first: that is where the ESP32 is paired to the account, and a
          web-only account would have no hardware to talk to. Anyone landing on
          the old path gets sent to sign-in rather than a 404. */}
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route
        path="/forgot-password"
        element={
          <AuthGate requireAuth={false}>
            <ForgotPasswordPage />
          </AuthGate>
        }
      />

      {/* Firebase's email links land here once "Customise action URL" points at
          this domain. Deliberately outside AuthGate in both directions: a signed
          -out user resetting a password has no session, and a signed-in user
          confirming their address would otherwise be bounced to the dashboard by
          the !requireAuth branch before the code was ever spent. */}
      <Route path="/auth/action" element={<AuthActionPage />} />

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
        <Route path="help" element={<HelpPage />} />
        {/* Three documents, one component - they differ only in content. */}
        <Route path="about" element={<DocumentPage document="about" />} />
        <Route path="privacy" element={<DocumentPage document="privacy" />} />
        <Route path="terms" element={<DocumentPage document="terms" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  </ErrorBoundary>
);

export default App;
