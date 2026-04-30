import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import Loading from '../../components/ui/Loading.tsx';

export default function AuthRoute() {
  const { user, loading } = useAuthStore();

  if (loading) return <Loading fullScreen />;
  if (user) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}