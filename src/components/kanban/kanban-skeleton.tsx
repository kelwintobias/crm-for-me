import { Skeleton } from "@/components/ui/skeleton";

export function KanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 px-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex flex-col bg-brand-card rounded-xl min-w-[300px] w-[300px]"
        >
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-6 w-8 rounded-full" />
            </div>
          </div>

          {/* Cards */}
          <div className="p-3 space-y-3">
            {[1, 2, 3].map((j) => (
              <div
                key={j}
                className="bg-brand-bg rounded-lg p-4 border border-border"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded-md" />
                </div>
                <Skeleton className="h-5 w-20 mt-3 rounded-full" />
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-brand-card rounded-xl p-6 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="h-12 w-12 rounded-lg" />
          </div>
          <Skeleton className="h-3 w-20 mt-3" />
        </div>
      ))}
    </div>
  );
}
