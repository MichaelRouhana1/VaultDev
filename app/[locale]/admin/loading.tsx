export default function AdminLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-24 animate-pulse rounded-md border border-border bg-muted/40" />
      <div className="h-64 animate-pulse rounded-md border border-border bg-muted/40" />
    </div>
  );
}
