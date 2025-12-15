import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../store/auth';

const ProtectedRoute = () => {
  const { loading, user } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
};

export default ProtectedRoute;
