import { ChevronRight, Play } from "lucide-react";

export default function WatchVideoLoading() {
  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-10 animate-fade-in-up">
      <div className="space-y-5 sm:space-y-6">
        {/* Breadcrumb Skeleton */}
        <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-1.5 sm:gap-2 text-xs">
          <div className="h-6 w-24 rounded-lg bg-muted/60 dark:bg-[#141E28] animate-pulse" />
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
          <div className="h-6 w-28 rounded-lg bg-muted/60 dark:bg-[#141E28] animate-pulse" />
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
          <div className="h-6 w-36 rounded-lg bg-muted/50 dark:bg-[#141E28] animate-pulse" />
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
          <div className="h-5 w-16 rounded-md bg-muted/60 dark:bg-[#141E28] animate-pulse" />
        </nav>

        {/* Video Title & Meta Skeleton */}
        <div className="space-y-2.5">
          <div className="h-8 sm:h-9 w-3/4 max-w-lg rounded-xl bg-muted/70 dark:bg-[#141E28] animate-pulse" />
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="h-6 w-20 rounded-lg bg-muted/60 dark:bg-[#141E28] animate-pulse" />
            <div className="h-6 w-28 rounded-lg bg-muted/60 dark:bg-[#141E28] animate-pulse" />
          </div>
        </div>

        {/* Video Player Container Skeleton */}
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-black shadow-xl dark:border-[#1F2C34]">
          <div className="aspect-video w-full flex items-center justify-center bg-muted/20 dark:bg-[#0A0F12] animate-pulse">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/40 text-muted-foreground dark:bg-[#141E28] dark:text-[#5C6A72]">
              <Play className="h-6 w-6 ml-0.5 opacity-30" />
            </div>
          </div>
        </div>

        {/* Action Control Bar Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 rounded-2xl border border-border/60 bg-card/90 p-3.5 sm:p-4 shadow-sm backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820]">
          <div className="h-11 w-full sm:w-44 rounded-xl bg-muted/60 dark:bg-[#141E28] animate-pulse" />
          <div className="flex items-center gap-2.5 flex-1 sm:flex-initial sm:justify-end">
            <div className="h-11 w-full sm:w-40 rounded-xl bg-muted/70 dark:bg-[#141E28] animate-pulse" />
            <div className="h-11 w-full sm:w-32 rounded-xl bg-muted/50 dark:bg-[#141E28] animate-pulse" />
          </div>
        </div>

        {/* Description Box Skeleton */}
        <div className="rounded-2xl border border-border/60 bg-card/90 p-4 sm:p-5 shadow-sm backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820] space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-muted/60 dark:bg-[#141E28] animate-pulse" />
            <div className="h-4 w-24 rounded-md bg-muted/70 dark:bg-[#141E28] animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-3.5 w-full rounded bg-muted/40 dark:bg-[#141E28]/60 animate-pulse" />
            <div className="h-3.5 w-5/6 rounded bg-muted/40 dark:bg-[#141E28]/60 animate-pulse" />
            <div className="h-3.5 w-2/3 rounded bg-muted/40 dark:bg-[#141E28]/60 animate-pulse" />
          </div>
        </div>
      </div>
    </main>
  );
}
