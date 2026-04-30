import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import Loading from '../../components/ui/Loading.tsx';

export default function ProtectedRoute() {
  const { user, loading } = useAuthStore();

  if (loading) return <Loading fullScreen />;
  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}