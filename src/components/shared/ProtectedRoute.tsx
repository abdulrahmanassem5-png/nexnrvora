import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function ProtectedRoute({ allowedRole }: { allowedRole?: 'freelancer' | 'client' }) {
  const { currentUser, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="text-xl">جاري التحميل...</div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && role && role !== allowedRole) {
    // If user is logged in but doesn't have the right role, redirect them to their respective home
    return <Navigate to={role === 'freelancer' ? '/app' : '/portal'} replace />;
  }

  return <Outlet />;
}
