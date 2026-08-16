export default function IntensiveClassesLoading() {
  return (
    <main className="flex-1 p-4 sm:p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8 animate-fade-in-up">
      {/* Header Skeleton */}
      <div className="flex items-center gap-3.5">
        <div className="h-11 w-11 rounded-xl bg-muted/60 dark:bg-[#141E28] animate-pulse" />
        <div className="h-8 w-52 rounded-md bg-muted/70 dark:bg-[#141E28] animate-pulse" />
      </div>

      {/* Progress Bar Skeleton */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-5 shadow-sm backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820]/60">
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

      {/* Filter Pills Skeleton */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/40 pb-4 dark:border-[#1F2C34]/80">
        <div className="h-8 w-16 rounded-xl bg-muted/70 dark:bg-[#141E28] animate-pulse" />
        <div className="h-8 w-28 rounded-xl bg-muted/50 dark:bg-[#141E28]/70 animate-pulse" />
        <div className="h-8 w-32 rounded-xl bg-muted/50 dark:bg-[#141E28]/70 animate-pulse" />
        <div className="h-8 w-24 rounded-xl bg-muted/50 dark:bg-[#141E28]/70 animate-pulse" />
      </div>

      {/* Collapsible Playlist Cards Skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-border/60 bg-card/60 shadow-sm backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820]/60"
          >
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 shrink-0 rounded-xl bg-muted/60 dark:bg-[#141E28] animate-pulse" />
                <div className="space-y-2">
                  <div className="h-5 w-40 rounded bg-muted/70 dark:bg-[#141E28] animate-pulse" />
                  <div className="h-3 w-56 rounded bg-muted/40 dark:bg-[#141E28]/60 animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-2 w-36 rounded-full bg-muted/50 dark:bg-[#141E28] animate-pulse" />
                <div className="h-8 w-8 rounded-xl bg-muted/40 dark:bg-[#141E28] animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
