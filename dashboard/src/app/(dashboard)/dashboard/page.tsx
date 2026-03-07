export default function DashboardOverviewPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
      <p className="mt-2 text-foreground/80">
        Overview of your pet&apos;s vitals and device status.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BentoCard title="Sleep quality" value="—" subtitle="0–100" />
        <BentoCard title="Heart rate" value="—" subtitle="bpm" />
        <BentoCard title="Respiration" value="—" subtitle="rpm" />
        <BentoCard title="Status" value="Disconnected" subtitle="Device" />
      </div>
    </div>
  );
}

function BentoCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-sm text-foreground/70">{title}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-foreground/50">{subtitle}</p>
    </div>
  );
}
