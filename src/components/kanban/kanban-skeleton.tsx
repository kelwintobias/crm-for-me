import { Skeleton } from "@/components/ui/skeleton";

export function KanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 px-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex flex-col rounded-2xl min-w-[320px] w-[320px] bg-brand-card/50 border border-white/[0.04]"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          {/* Header */}
          <div className="p-4 border-b border-white/[0.04]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <div>
                  <Skeleton className="h-4 w-20 mb-1.5" />
                  <Skeleton className="h-3 w-14" />
                </div>
              </div>
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>

          {/* Cards */}
          <div className="p-3 space-y-3">
            {[1, 2, 3].map((j) => (
              <div
                key={j}
                className="glass-card rounded-xl p-4"
                style={{ animationDelay: `${(i * 3 + j) * 50}ms` }}
              >
                <div className="flex items-start gap-3">
                  <Skeleton className="w-4 h-4 mt-1" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-28 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="w-10 h-10 rounded-lg" />
                </div>
                <div className="flex gap-2 mt-3">
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.04]">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="metric-card p-6"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="flex items-start justify-between">
            <div>
              <Skeleton className="h-4 w-28 mb-2" />
              <Skeleton className="h-10 w-16" />
            </div>
            <Skeleton className="w-14 h-14 rounded-xl" />
          </div>
          <div className="mt-4 pt-4 border-t border-white/[0.04]">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-1 w-full rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
