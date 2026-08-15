import { Card, CardContent } from "@/components/ui/card";

function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800 ${className ?? ""}`}
    />
  );
}

function VideoCardSkeleton() {
  return (
    <Card className="overflow-hidden border-zinc-200/80 dark:border-zinc-800">
      {/* Thumbnail */}
      <SkeletonPulse className="aspect-video w-full rounded-none" />
      <CardContent className="flex flex-col gap-3 p-4">
        {/* Title */}
        <SkeletonPulse className="h-4 w-full" />
        <SkeletonPulse className="h-4 w-3/4" />
        {/* Description lines */}
        <div className="space-y-1.5 pt-1">
          <SkeletonPulse className="h-3 w-full" />
          <SkeletonPulse className="h-3 w-full" />
          <SkeletonPulse className="h-3 w-2/3" />
        </div>
        {/* Footer */}
        <div className="mt-auto flex items-center justify-between pt-2">
          <SkeletonPulse className="h-5 w-28" />
          <SkeletonPulse className="h-9 w-20 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardLoading() {
  return (
    <main className="flex-1 p-4 sm:p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8">
      {/* Header skeleton */}
      <div className="space-y-2">
        <SkeletonPulse className="h-9 w-48" />
        <SkeletonPulse className="h-4 w-64" />
      </div>

      {/* Progress bar skeleton */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SkeletonPulse className="h-5 w-5 rounded-full" />
            <div className="space-y-1.5">
              <SkeletonPulse className="h-4 w-28" />
              <SkeletonPulse className="h-3 w-40" />
            </div>
          </div>
          <SkeletonPulse className="h-8 w-14" />
        </div>
        <SkeletonPulse className="h-2.5 w-full rounded-full" />
      </div>

      {/* Video grid skeleton */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <VideoCardSkeleton key={i} />
        ))}
      </div>
    </main>
  );
}
