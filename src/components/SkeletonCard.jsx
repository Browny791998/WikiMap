function Bar({ className = "" }) {
  return <div className={`animate-pulse rounded bg-slate-700 ${className}`} />;
}

export default function SkeletonCard() {
  return (
    <div className="p-5 space-y-5" aria-busy="true" aria-label="Loading content">
      {/* Flag + title row */}
      <div className="flex items-center gap-3">
        <Bar className="w-12 h-8 rounded shrink-0" />
        <Bar className="h-5 w-44" />
      </div>

      {/* Info grid — 3 rows × 2 cols */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Bar className="h-3 w-16" />
            <Bar className="h-4 w-28" />
          </div>
        ))}
      </div>

      {/* Paragraph lines */}
      <div className="space-y-2 pt-1">
        <Bar className="h-3 w-full" />
        <Bar className="h-3 w-full" />
        <Bar className="h-3 w-5/6" />
        <Bar className="h-3 w-4/6" />
      </div>
    </div>
  );
}
