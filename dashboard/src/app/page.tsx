import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold text-foreground">AnimalDot</h1>
      <p className="mt-2 text-foreground/80">Smart animal bed monitoring</p>
      <nav className="mt-6 flex gap-4">
        <Link
          href="/dashboard"
          className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-dark"
        >
          Dashboard
        </Link>
        <Link
          href="/dashboard/trends"
          className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-card"
        >
          Trends
        </Link>
        <Link
          href="/dashboard/devices"
          className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-card"
        >
          Devices
        </Link>
      </nav>
    </main>
  );
}
