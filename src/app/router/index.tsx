import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import MainLayout from '../../components/layouts/MainLayout.tsx';
import AuthLayout from '../../components/layouts/AuthLayout.tsx';
import ProtectedRoute from './ProtectedRoute';
import AuthRoute from './AuthRoute';
import Loading from '../../components/ui/Loading.tsx';

// Auth pages
const LoginPage = lazy(() => import('../../features/auth/pages/LoginPage.tsx'));
const RegisterPage = lazy(() => import('../../features/auth/pages/RegisterPage.tsx'));
const ForgotPasswordPage = lazy(() => import('../../features/auth/pages/ForgotPasswordPage.tsx'));

// Protected pages
const DashboardPage = lazy(() => import('../../features/dashboard/pages/DashboardPage.tsx'));
const AnalyticsPage = lazy(() => import('../../features/analytics/pages/AnalyticsPage.tsx'));
const HistoryPage = lazy(() => import('../../features/history/pages/HistoryPage.tsx'));
const ExportsPage = lazy(() => import('../../features/exports/pages/ExportsPage.tsx'));
const SchedulePage = lazy(() => import('../../features/schedule/pages/SchedulePage.tsx'));
const BudgetPage = lazy(() => import('../../features/budget/pages/BudgetPage.tsx'));
const SettingsPage = lazy(() => import('../../features/settings/pages/SettingsPage.tsx'));
const NotificationsPage = lazy(() => import('../../features/notifications/pages/NotificationsPage.tsx'));
const PowerSafetyPage = lazy(() => import('../../features/power-safety/pages/PowerSafetyPage.tsx'));
const ReferenceComparisonPage = lazy(() => import('../../features/reference-comparison/pages/ReferenceComparisonPage.tsx'));

const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<Loading fullScreen />}>
    {children}
  </Suspense>
);

export const router = createBrowserRouter([
  // Root redirect
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },

  // Auth routes (redirect to dashboard if logged in)
  {
    element: <AuthRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          {
            path: '/login',
            element: <SuspenseWrapper><LoginPage /></SuspenseWrapper>,
          },
          {
            path: '/register',
            element: <SuspenseWrapper><RegisterPage /></SuspenseWrapper>,
          },
          {
            path: '/forgot-password',
            element: <SuspenseWrapper><ForgotPasswordPage /></SuspenseWrapper>,
          },
        ],
      },
    ],
  },

  // Protected routes
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          {
            path: '/dashboard',
            element: <SuspenseWrapper><DashboardPage /></SuspenseWrapper>,
          },
          {
            path: '/analytics',
            element: <SuspenseWrapper><AnalyticsPage /></SuspenseWrapper>,
          },
          {
            path: '/history',
            element: <SuspenseWrapper><HistoryPage /></SuspenseWrapper>,
          },
          {
            path: '/exports',
            element: <SuspenseWrapper><ExportsPage /></SuspenseWrapper>,
          },
          {
            path: '/schedule',
            element: <SuspenseWrapper><SchedulePage /></SuspenseWrapper>,
          },
          {
            path: '/budget',
            element: <SuspenseWrapper><BudgetPage /></SuspenseWrapper>,
          },
          {
            path: '/settings',
            element: <SuspenseWrapper><SettingsPage /></SuspenseWrapper>,
          },
          {
            path: '/notifications',
            element: <SuspenseWrapper><NotificationsPage /></SuspenseWrapper>,
          },
          {
            path: '/power-safety',
            element: <SuspenseWrapper><PowerSafetyPage /></SuspenseWrapper>,
          },
          {
            path: '/reference-comparison',
            element: <SuspenseWrapper><ReferenceComparisonPage /></SuspenseWrapper>,
          },
        ],
      },
    ],
  },

  // Catch all
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);