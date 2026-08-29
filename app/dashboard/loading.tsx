export default function DashboardLoading() {
  return (
    <main className="flex-1 p-3.5 sm:p-5 md:py-6 md:px-6 lg:px-8 max-w-[1680px] mx-auto w-full space-y-8 min-h-[calc(100dvh-4rem)] animate-page-enter overflow-x-hidden">
      {/* Owner Sync Panel Skeleton */}
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-sm backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820]">
        <div className="h-1 w-full bg-gradient-to-r from-[#25A8A2] via-teal-500 to-emerald-500" />
        <div className="p-6 pb-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 shrink-0 rounded-xl bg-muted/60 dark:bg-[#141E28] animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-4 w-36 rounded-md bg-muted/70 dark:bg-[#141E28] animate-pulse" />
              <div className="h-3 w-56 rounded-md bg-muted/40 dark:bg-[#141E28]/60 animate-pulse" />
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

      {/* Overall Progress Bar Skeleton */}
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

      {/* Hub Modules Grid Skeleton */}
      <div className="space-y-3.5">
        <div className="h-5 w-36 rounded-md bg-muted/70 dark:bg-[#141E28] animate-pulse" />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Card 1: Live Classes */}
          <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card/90 p-5 shadow-sm backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820] min-h-[180px]">
            <div className="flex items-center justify-between gap-2">
              <div className="h-11 w-11 rounded-xl bg-[#25A8A2]/15 animate-pulse" />
              <div className="h-5 w-16 rounded-full bg-[#25A8A2]/15 animate-pulse" />
            </div>

            <div className="mt-4">
              <div className="h-6 w-32 rounded-md bg-muted/70 dark:bg-[#141E28] animate-pulse" />
            </div>

            <div className="my-4 grid grid-cols-3 gap-2 rounded-xl border border-border/40 bg-muted/20 p-2.5 dark:border-[#1F2C34] dark:bg-[#0A0F12]/60">
              {[1, 2, 3].map((j) => (
                <div key={j} className={`space-y-1 ${j > 1 ? "border-l border-border/40 pl-2.5 dark:border-[#1F2C34]" : ""}`}>
                  <div className="h-2.5 w-10 rounded bg-muted/50 dark:bg-[#141E28]/80 animate-pulse" />
                  <div className="h-4 w-14 rounded bg-muted/70 dark:bg-[#141E28] animate-pulse" />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-border/40 dark:border-[#1F2C34] pt-3">
              <div className="h-3.5 w-20 rounded bg-muted/40 dark:bg-[#141E28] animate-pulse" />
              <div className="h-3.5 w-24 rounded bg-muted/50 dark:bg-[#141E28] animate-pulse" />
            </div>
          </div>

          {/* Card 2: Intensive Classes */}
          <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card/90 p-5 shadow-sm backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820] min-h-[180px]">
            <div className="flex items-center justify-between gap-2">
              <div className="h-11 w-11 rounded-xl bg-amber-500/15 animate-pulse" />
              <div className="h-5 w-16 rounded-full bg-amber-500/15 animate-pulse" />
            </div>

            <div className="mt-4">
              <div className="h-6 w-36 rounded-md bg-muted/70 dark:bg-[#141E28] animate-pulse" />
            </div>

            <div className="my-4 grid grid-cols-3 gap-2 rounded-xl border border-border/40 bg-muted/20 p-2.5 dark:border-[#1F2C34] dark:bg-[#0A0F12]/60">
              {[1, 2, 3].map((j) => (
                <div key={j} className={`space-y-1 ${j > 1 ? "border-l border-border/40 pl-2.5 dark:border-[#1F2C34]" : ""}`}>
                  <div className="h-2.5 w-10 rounded bg-muted/50 dark:bg-[#141E28]/80 animate-pulse" />
                  <div className="h-4 w-14 rounded bg-muted/70 dark:bg-[#141E28] animate-pulse" />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-border/40 dark:border-[#1F2C34] pt-3">
              <div className="h-3.5 w-20 rounded bg-muted/40 dark:bg-[#141E28] animate-pulse" />
              <div className="h-3.5 w-24 rounded bg-muted/50 dark:bg-[#141E28] animate-pulse" />
            </div>
          </div>

          {/* Card 3: Lecture Notes & PDFs (Coming Soon) */}
          <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border/40 bg-card/50 p-5.5 opacity-75 backdrop-blur-md dark:border-[#1F2C34]/60 dark:bg-[#111820]/40 min-h-[180px]">
            <div className="flex items-center justify-between gap-2">
              <div className="h-11 w-11 rounded-xl bg-muted dark:bg-[#141E28] animate-pulse" />
              <div className="h-5 w-24 rounded-full bg-muted dark:bg-[#141E28] animate-pulse" />
            </div>

            <div className="mt-4">
              <div className="h-6 w-44 rounded-md bg-muted/70 dark:bg-[#141E28] animate-pulse" />
            </div>

            <div className="my-4 grid grid-cols-3 gap-2 rounded-xl border border-border/40 bg-muted/15 p-2.5 dark:border-[#1F2C34]/60 dark:bg-[#0A0F12]/30">
              {[1, 2, 3].map((j) => (
                <div key={j} className={`space-y-1 ${j > 1 ? "border-l border-border/40 pl-2.5 dark:border-[#1F2C34]/60" : ""}`}>
                  <div className="h-2.5 w-10 rounded bg-muted/50 dark:bg-[#141E28]/80 animate-pulse" />
                  <div className="h-4 w-12 rounded bg-muted/70 dark:bg-[#141E28] animate-pulse" />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-border/30 dark:border-[#1F2C34]/40 pt-3">
              <div className="h-3.5 w-20 rounded bg-muted/40 dark:bg-[#141E28] animate-pulse" />
              <div className="h-3.5 w-24 rounded bg-muted/50 dark:bg-[#141E28] animate-pulse" />
            </div>
          </div>

          {/* Card 4: Model Tests & Exams (Coming Soon) */}
          <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border/40 bg-card/50 p-5.5 opacity-75 backdrop-blur-md dark:border-[#1F2C34]/60 dark:bg-[#111820]/40 min-h-[180px]">
            <div className="flex items-center justify-between gap-2">
              <div className="h-11 w-11 rounded-xl bg-muted dark:bg-[#141E28] animate-pulse" />
              <div className="h-5 w-24 rounded-full bg-muted dark:bg-[#141E28] animate-pulse" />
            </div>

            <div className="mt-4">
              <div className="h-6 w-44 rounded-md bg-muted/70 dark:bg-[#141E28] animate-pulse" />
            </div>

            <div className="my-4 grid grid-cols-3 gap-2 rounded-xl border border-border/40 bg-muted/15 p-2.5 dark:border-[#1F2C34]/60 dark:bg-[#0A0F12]/30">
              {[1, 2, 3].map((j) => (
                <div key={j} className={`space-y-1 ${j > 1 ? "border-l border-border/40 pl-2.5 dark:border-[#1F2C34]/60" : ""}`}>
                  <div className="h-2.5 w-10 rounded bg-muted/50 dark:bg-[#141E28]/80 animate-pulse" />
                  <div className="h-4 w-12 rounded bg-muted/70 dark:bg-[#141E28] animate-pulse" />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-border/30 dark:border-[#1F2C34]/40 pt-3">
              <div className="h-3.5 w-20 rounded bg-muted/40 dark:bg-[#141E28] animate-pulse" />
              <div className="h-3.5 w-24 rounded bg-muted/50 dark:bg-[#141E28] animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
