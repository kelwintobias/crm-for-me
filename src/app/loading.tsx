import { KanbanSkeleton, MetricsSkeleton } from "@/components/kanban/kanban-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Header Skeleton */}
      <header className="bg-brand-card border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div>
                <Skeleton className="h-5 w-20 mb-1" />
                <Skeleton className="h-3 w-10" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-28 rounded-md hidden sm:block" />
              <Skeleton className="h-9 w-9 rounded-full" />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <MetricsSkeleton />
        <KanbanSkeleton />
      </main>
    </div>
  );
}
