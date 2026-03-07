import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';

export function ProtectedApp() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-foreground">Loading…</p>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/app/sign-in" state={{ from: location }} replace />;
  }
  return <Outlet />;
}
