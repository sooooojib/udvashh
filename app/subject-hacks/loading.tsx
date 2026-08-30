export default function SubjectHacksLoading() {
  return (
    <main className="flex-1 p-3.5 sm:p-5 md:py-6 md:px-6 lg:px-8 max-w-[1680px] mx-auto w-full space-y-5 sm:space-y-8 min-h-[calc(100dvh-4rem)] animate-page-enter">

      {/* Page Header Skeleton */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-xl bg-fuchsia-500/15 ring-1 ring-fuchsia-500/30 animate-pulse" />
        <div className="h-7 w-40 sm:w-52 rounded-lg bg-muted/70 dark:bg-[#141E28] animate-pulse" />
      </div>

      {/* Sync Panel Skeleton — compact inline row */}
      <div className="overflow-hidden rounded-2xl border border-fuchsia-500/20 bg-card/90 dark:border-fuchsia-500/15 dark:bg-[#111820]">
        <div className="h-[3px] w-full bg-gradient-to-r from-fuchsia-600 via-pink-500 to-rose-500" />
        <div className="flex items-center justify-between gap-3 p-4 sm:p-5">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 rounded-xl bg-fuchsia-500/20 animate-pulse" />
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="h-4 w-36 rounded-md bg-muted/70 dark:bg-[#141E28] animate-pulse" />
              <div className="h-3 w-52 max-w-full rounded-md bg-muted/40 dark:bg-[#141E28]/60 animate-pulse" />
            </div>
          </div>
          <div className="h-8 w-24 shrink-0 rounded-lg bg-fuchsia-500/20 dark:bg-fuchsia-500/15 animate-pulse" />
        </div>
      </div>

      {/* Progress Bar Skeleton */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/90 p-5 shadow-sm backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820]">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-muted/60 dark:bg-[#141E28] animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-4 w-24 rounded-md bg-muted/70 dark:bg-[#141E28] animate-pulse" />
              <div className="h-3 w-32 rounded-md bg-muted/40 dark:bg-[#141E28]/60 animate-pulse" />
            </div>
          </div>
          <div className="h-8 w-12 rounded-md bg-muted/70 dark:bg-[#141E28] animate-pulse" />
        </div>
        <div className="h-2 w-full rounded-full bg-muted/50 dark:bg-[#141E28] animate-pulse" />
      </div>

      {/* Video Grid Skeleton */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-sm dark:border-[#1F2C34] dark:bg-[#111820]"
          >
            <div className="aspect-video w-full bg-muted/60 dark:bg-[#141E28] animate-pulse" />
            <div className="p-3.5 space-y-2.5">
              <div className="h-4 w-full rounded bg-muted/70 dark:bg-[#141E28] animate-pulse" />
              <div className="h-3 w-4/5 rounded bg-muted/40 dark:bg-[#141E28]/60 animate-pulse" />
              <div className="mt-3 flex items-center justify-between">
                <div className="h-3 w-20 rounded bg-muted/40 dark:bg-[#141E28]/60 animate-pulse" />
                <div className="h-7 w-16 rounded-lg bg-muted/50 dark:bg-[#141E28] animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
