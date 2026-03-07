import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';

/** Redirects /app to /app/live when authenticated, else to /app/sign-in. */
export function AppGate() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-foreground">Loading…</p>
      </div>
    );
  }
  return user ? <Navigate to="/app/live" replace /> : <Navigate to="/app/sign-in" replace />;
}
