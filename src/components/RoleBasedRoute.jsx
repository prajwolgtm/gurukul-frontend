import { Navigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { ROLES } from '../utils/roles';

const RoleBasedRoute = ({ children, allowedRoles, redirectTo = '/parent-dashboard' }) => {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user role is not in allowed roles, redirect immediately
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If parent tries to access admin routes, redirect to parent dashboard
    if (user.role === ROLES.PARENT) {
      return <Navigate to="/parent-dashboard" replace />;
    }
    // For other roles without permission, redirect to home (which will be protected by their role)
    return <Navigate to="/" replace />;
  }

  return children;
};

export default RoleBasedRoute;


