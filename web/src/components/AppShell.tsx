import { Link, Outlet } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/** Wraps all /app routes with "Back to site" and outlet. */
export function AppShell() {
  return (
    <div className="h-screen w-screen min-h-0 min-w-0 flex flex-col bg-background overflow-hidden">
      <div className="flex-1 min-h-0 min-w-0 flex flex-col bg-card overflow-hidden relative">
        <Link
          to="/"
          className="absolute top-4 left-4 z-10 flex items-center gap-1.5 text-sm text-foreground-muted hover:text-primary font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden />
          Back to site
        </Link>
        <Outlet />
      </div>
    </div>
  );
}
