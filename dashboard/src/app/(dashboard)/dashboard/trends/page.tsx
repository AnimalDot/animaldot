export default function TrendsPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground">Health Trends</h1>
      <p className="mt-2 text-foreground/80">
        Longitudinal vitals and sleep analysis. Time-series data from TSDB.
      </p>
      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <p className="text-sm text-foreground/70">
          Trend charts (line graphs, bezier curves) will consume WebSocket or
          REST from the time-series backend.
        </p>
      </div>
    </div>
  );
}
