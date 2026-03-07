import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <nav className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold text-foreground">
            AnimalDot
          </Link>
          <Link
            href="/dashboard"
            className="text-foreground/80 hover:text-foreground"
          >
            Overview
          </Link>
          <Link
            href="/dashboard/trends"
            className="text-foreground/80 hover:text-foreground"
          >
            Trends
          </Link>
          <Link
            href="/dashboard/devices"
            className="text-foreground/80 hover:text-foreground"
          >
            Devices
          </Link>
        </nav>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
