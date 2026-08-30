export default function SubjectHacksLoading() {
  return (
    <main className="flex-1 p-3.5 sm:p-5 md:py-6 md:px-6 lg:px-8 max-w-[1680px] mx-auto w-full space-y-8 min-h-[calc(100dvh-4rem)] animate-page-enter">
      {/* Page Header Skeleton */}
      <div className="flex items-center gap-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 ring-1 ring-violet-500/30 animate-pulse" />
        <div className="h-7 w-48 sm:w-56 rounded-lg bg-muted/70 dark:bg-[#141E28] animate-pulse" />
      </div>

      {/* Owner Sync Panel Skeleton */}
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-sm backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820]">
        <div className="h-1 w-full bg-gradient-to-r from-violet-600 via-violet-500 to-purple-500" />
        <div className="p-6 pb-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 shrink-0 rounded-xl bg-violet-500/20 animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-4 w-40 rounded-md bg-muted/70 dark:bg-[#141E28] animate-pulse" />
              <div className="h-3 w-64 rounded-md bg-muted/40 dark:bg-[#141E28]/60 animate-pulse" />
            </div>
          </div>
        </div>
        <div className="px-6 pb-6 pt-0">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="h-10 flex-1 rounded-xl bg-muted/50 dark:bg-[#141E28]/70 animate-pulse" />
            <div className="h-10 w-full sm:w-28 rounded-xl bg-muted/70 dark:bg-[#141E28] animate-pulse" />
          </div>
        </div>
      </div>

      {/* Progress Bar Skeleton */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/90 p-5 shadow-sm backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820]">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-muted/60 dark:bg-[#141E28] animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-4 w-28 rounded-md bg-muted/70 dark:bg-[#141E28] animate-pulse" />
              <div className="h-3 w-36 rounded-md bg-muted/40 dark:bg-[#141E28]/60 animate-pulse" />
            </div>
          </div>
          <div className="h-7 w-14 rounded-md bg-muted/70 dark:bg-[#141E28] animate-pulse" />
        </div>
        <div className="h-2 w-full rounded-full bg-muted/50 dark:bg-[#141E28] animate-pulse" />
      </div>

      {/* Video Grid Skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-sm dark:border-[#1F2C34] dark:bg-[#111820]"
          >
            {/* Thumbnail skeleton */}
            <div className="aspect-video w-full bg-muted/60 dark:bg-[#141E28] animate-pulse" />
            {/* Content skeleton */}
            <div className="p-3 space-y-2">
              <div className="h-4 w-full rounded bg-muted/70 dark:bg-[#141E28] animate-pulse" />
              <div className="h-3 w-3/4 rounded bg-muted/40 dark:bg-[#141E28]/60 animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-muted/30 dark:bg-[#141E28]/40 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
