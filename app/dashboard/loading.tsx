export default function DashboardLoading() {
  return (
    <main className="flex-1 p-4 sm:p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8 animate-fade-in-up">
      {/* Overall Progress Bar Skeleton */}
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

      {/* Course Sections Skeleton */}
      <div className="space-y-3.5">
        <div className="h-5 w-36 rounded-md bg-muted/70 dark:bg-[#141E28] animate-pulse" />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-5.5 shadow-sm backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820]/60"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="h-11 w-11 rounded-xl bg-muted/60 dark:bg-[#141E28] animate-pulse" />
                <div className="h-5 w-16 rounded-full bg-muted/40 dark:bg-[#141E28] animate-pulse" />
              </div>

              <div className="mt-4">
                <div className="h-6 w-32 rounded-md bg-muted/70 dark:bg-[#141E28] animate-pulse" />
              </div>

              <div className="my-4 grid grid-cols-3 gap-2 rounded-xl border border-border/40 bg-muted/15 p-2.5 dark:border-[#1F2C34]/60 dark:bg-[#0A0F12]/30">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="space-y-1">
                    <div className="h-2.5 w-10 rounded bg-muted/50 dark:bg-[#141E28]/80 animate-pulse" />
                    <div className="h-4 w-12 rounded bg-muted/70 dark:bg-[#141E28] animate-pulse" />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-border/40 dark:border-[#1F2C34] pt-3">
                <div className="h-3.5 w-20 rounded bg-muted/40 dark:bg-[#141E28] animate-pulse" />
                <div className="h-3.5 w-24 rounded bg-muted/50 dark:bg-[#141E28] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
