import { Card, CardContent } from "@/components/ui/card";

function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800 ${className ?? ""}`}
    />
  );
}

export default function LiveClassesLoading() {
  return (
    <main className="flex-1 p-4 sm:p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8">
      {/* Header skeleton */}
      <div className="space-y-2">
        <SkeletonPulse className="h-9 w-52" />
        <SkeletonPulse className="h-4 w-64" />
      </div>

      {/* Progress bar skeleton */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mb-3 flex items-center justify-between">
          <SkeletonPulse className="h-5 w-32" />
          <SkeletonPulse className="h-7 w-12" />
        </div>
        <SkeletonPulse className="h-2.5 w-full rounded-full" />
      </div>

      {/* Playlists skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-5 border-zinc-200/80 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SkeletonPulse className="h-11 w-11 rounded-2xl" />
                <div className="space-y-1.5">
                  <SkeletonPulse className="h-5 w-48" />
                  <SkeletonPulse className="h-3 w-32" />
                </div>
              </div>
              <SkeletonPulse className="h-8 w-24 rounded-xl" />
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}
