import { ReactNode } from "react";

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-ink/60 mt-1 max-w-2xl">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wide text-ink/50 font-medium">{label}</p>
      <p className="font-display text-3xl mt-2">{value}</p>
      {sub && <p className="text-xs text-ink/50 mt-1">{sub}</p>}
    </div>
  );
}

export function RiskBadge({ level }: { level: string }) {
  const cls =
    { low: "badge-low", moderate: "badge-moderate", high: "badge-high", critical: "badge-critical" }[level] ||
    "badge-low";
  return <span className={`badge ${cls} capitalize`}>{level}</span>;
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-ink/50 text-sm py-10 justify-center">
      <span className="w-4 h-4 border-2 border-teal border-t-transparent rounded-full animate-spin" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card border-coral/30 bg-coral/5 text-center py-8">
      <p className="text-coral text-sm font-medium">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary mt-3">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="card text-center py-12">
      <p className="font-display text-lg">{title}</p>
      {description && <p className="text-sm text-ink/50 mt-1">{description}</p>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`shimmer rounded ${className}`} />;
}

export function StatCardSkeleton() {
  return (
    <div className="card flex flex-col justify-between h-[104px]">
      <Skeleton className="h-3 w-2/3 bg-slate-800" />
      <Skeleton className="h-8 w-1/2 bg-slate-700 mt-2" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="card space-y-4">
      <Skeleton className="h-5 w-1/4 bg-slate-800" />
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 border-b border-line pb-3 last:border-0 last:pb-0">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-4 flex-1 bg-slate-800" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
