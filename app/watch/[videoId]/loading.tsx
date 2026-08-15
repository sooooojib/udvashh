export default function WatchVideoLoading() {
  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6 sm:px-6 md:py-10 space-y-6 animate-fade-in-up">
      {/* Breadcrumb Skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-3.5 w-16 rounded bg-muted/60 dark:bg-[#141E28] animate-pulse" />
        <div className="h-3 w-3 rounded bg-muted/40 dark:bg-[#141E28]/60 animate-pulse" />
        <div className="h-3.5 w-20 rounded bg-muted/60 dark:bg-[#141E28] animate-pulse" />
        <div className="h-3 w-3 rounded bg-muted/40 dark:bg-[#141E28]/60 animate-pulse" />
        <div className="h-3.5 w-24 rounded bg-muted/60 dark:bg-[#141E28] animate-pulse" />
      </div>

      {/* Title & Badge Skeleton */}
      <div className="space-y-2.5">
        <div className="h-8 w-3/4 max-w-lg rounded-lg bg-muted/70 dark:bg-[#141E28] animate-pulse" />
        <div className="flex items-center gap-3">
          <div className="h-5 w-16 rounded-md bg-muted/50 dark:bg-[#141E28] animate-pulse" />
          <div className="h-5 w-24 rounded-md bg-muted/50 dark:bg-[#141E28] animate-pulse" />
        </div>
      </div>

      {/* Player Container Skeleton - exact aspect-video with zero layout shift */}
      <div className="overflow-hidden rounded-xl border border-border/60 bg-black shadow-lg">
        <div className="aspect-video w-full flex items-center justify-center bg-muted/20 dark:bg-[#0A0F12] animate-pulse">
          <div className="h-12 w-12 rounded-full bg-muted/40 dark:bg-[#141E28]" />
        </div>
      </div>

      {/* Controls Bar Skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border/60 bg-card/60 p-3 shadow-sm backdrop-blur-sm dark:border-[#1F2C34] dark:bg-[#111820]/60">
        <div className="h-9 w-36 rounded-lg bg-muted/70 dark:bg-[#141E28] animate-pulse" />
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 rounded-lg bg-muted/50 dark:bg-[#141E28] animate-pulse" />
          <div className="h-9 w-28 rounded-lg bg-muted/50 dark:bg-[#141E28] animate-pulse" />
        </div>
      </div>

      {/* Description Card Skeleton */}
      <div className="rounded-xl border border-border/60 bg-card/60 p-5 shadow-sm backdrop-blur-sm dark:border-[#1F2C34] dark:bg-[#111820]/60 space-y-2.5">
        <div className="h-4 w-28 rounded bg-muted/70 dark:bg-[#141E28] animate-pulse" />
        <div className="h-3 w-full rounded bg-muted/40 dark:bg-[#141E28]/60 animate-pulse" />
        <div className="h-3 w-5/6 rounded bg-muted/40 dark:bg-[#141E28]/60 animate-pulse" />
      </div>
    </main>
  );
}
