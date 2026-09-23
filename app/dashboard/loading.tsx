import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowRight,
  Flame,
  GraduationCap,
  Lightbulb,
  PlayCircle,
  PlaySquare,
  Tv,
} from "lucide-react";

export default function DashboardLoading() {
  return (
    <main className="flex-1 p-3.5 sm:p-5 md:py-6 md:px-6 lg:px-8 max-w-[1680px] mx-auto w-full space-y-8 min-h-[calc(100dvh-4rem)] animate-page-enter overflow-x-hidden">
      {/* ── Owner Quick Sync Skeleton ── */}
      <Card className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-sm backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820]">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#25A8A2] text-white shadow-[0_0_10px_rgba(37,168,162,0.4)]">
              <PlaySquare className="h-4.5 w-4.5" />
            </div>
            <div>
              <CardTitle className="font-heading text-sm font-bold tracking-tight text-foreground dark:text-[#E8EDF0]">
                YouTube Quick Sync
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground dark:text-[#9AA7AE]">
                Owner only — pull latest videos from YouTube
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Select playlist placeholder */}
              <div className="flex-1">
                <div className="h-11 w-full rounded-xl border border-border/80 bg-muted/30 dark:border-[#1F2C34] dark:bg-[#0A0F12]/60 animate-pulse" />
              </div>
              {/* Action buttons placeholders */}
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                <div className="h-10 w-full sm:w-32 rounded-xl border border-border/80 bg-muted/40 dark:border-[#1F2C34] dark:bg-[#141E28] animate-pulse" />
                <div className="h-10 w-full sm:w-28 rounded-xl bg-[#25A8A2]/30 dark:bg-[#25A8A2]/20 animate-pulse" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Overall Progress Bar Skeleton ── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/90 p-5 shadow-sm backdrop-blur-md transition-all dark:border-[#1F2C34] dark:bg-[#111820]/90">
        <div className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-100 bg-[radial-gradient(circle_at_top_right,rgba(37,168,162,0.12),transparent_65%)]" />

        <div className="relative mb-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg shadow-2xs bg-teal-500/15 text-teal-600 ring-1 ring-teal-500/30 dark:bg-[#25A8A2]/15 dark:text-[#25A8A2] dark:ring-[#25A8A2]/30">
              <PlayCircle className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="font-heading text-sm font-bold tracking-tight text-foreground dark:text-[#E8EDF0]">
                Your Progress
              </p>
              <div className="mt-1 h-3.5 w-32 rounded bg-muted/50 dark:bg-[#141E28] animate-pulse" />
            </div>
          </div>

          <div className="h-8 w-14 rounded-lg bg-muted/50 dark:bg-[#141E28] animate-pulse" />
        </div>

        <div className="relative">
          <div className="h-2 w-full rounded-full bg-muted/60 dark:bg-[#141E28] overflow-hidden">
            <div className="h-full w-1/3 rounded-full bg-teal-600/30 dark:bg-[#25A8A2]/30 animate-pulse" />
          </div>
        </div>
      </div>

      {/* ── Hub Modules Grid Skeleton (2x2 Grid with all 4 Active Modules) ── */}
      <div className="space-y-3.5">
        <h2 className="font-heading text-base font-bold tracking-tight text-foreground dark:text-[#E8EDF0]">
          Course Sections
        </h2>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Card 1: Live Classes (Emerald Accent) */}
          <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card/90 p-5 shadow-sm backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820] min-h-[180px]">
            {/* Top Badge */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30 shadow-sm">
                <Tv className="h-5.5 w-5.5" />
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            </div>

            {/* Title */}
            <div className="mt-4">
              <h3 className="font-heading text-lg font-bold tracking-tight text-foreground dark:text-[#E8EDF0]">
                Live Classes
              </h3>
            </div>

            {/* Module Stats Grid */}
            <div className="my-4 grid grid-cols-3 gap-2 rounded-xl border border-border/40 bg-muted/20 p-2.5 dark:border-[#1F2C34] dark:bg-[#0A0F12]/60">
              <div>
                <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider dark:text-[#5C6A72]">
                  Total
                </span>
                <div className="mt-1 h-5 w-16 rounded bg-muted/60 dark:bg-[#141E28] animate-pulse" />
              </div>
              <div className="border-l border-border/40 pl-2.5 dark:border-[#1F2C34]">
                <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider dark:text-[#5C6A72]">
                  Completed
                </span>
                <div className="mt-1 h-5 w-14 rounded bg-emerald-500/25 animate-pulse" />
              </div>
              <div className="border-l border-border/40 pl-2.5 dark:border-[#1F2C34]">
                <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider dark:text-[#5C6A72]">
                  Progress
                </span>
                <div className="mt-1 h-5 w-12 rounded bg-muted/60 dark:bg-[#141E28] animate-pulse" />
              </div>
            </div>

            {/* Meta & Button */}
            <div className="flex items-center justify-between border-t border-border/40 dark:border-[#1F2C34] pt-3 text-xs">
              <span className="font-medium text-muted-foreground font-mono text-[11px] dark:text-[#9AA7AE]">
                12 subjects
              </span>
              <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                <span>View Classes</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>

          {/* Card 2: Intensive Classes (Amber Accent) */}
          <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card/90 p-5 shadow-sm backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820] min-h-[180px]">
            {/* Top Badge */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/30 shadow-sm dark:text-amber-400">
                <Flame className="h-5.5 w-5.5" />
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-600 border border-amber-500/30 dark:text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                Active
              </span>
            </div>

            {/* Title */}
            <div className="mt-4">
              <h3 className="font-heading text-lg font-bold tracking-tight text-foreground dark:text-[#E8EDF0]">
                Intensive Classes
              </h3>
            </div>

            {/* Module Stats Grid */}
            <div className="my-4 grid grid-cols-3 gap-2 rounded-xl border border-border/40 bg-muted/20 p-2.5 dark:border-[#1F2C34] dark:bg-[#0A0F12]/60">
              <div>
                <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider dark:text-[#5C6A72]">
                  Total
                </span>
                <div className="mt-1 h-5 w-16 rounded bg-muted/60 dark:bg-[#141E28] animate-pulse" />
              </div>
              <div className="border-l border-border/40 pl-2.5 dark:border-[#1F2C34]">
                <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider dark:text-[#5C6A72]">
                  Completed
                </span>
                <div className="mt-1 h-5 w-14 rounded bg-amber-500/25 animate-pulse" />
              </div>
              <div className="border-l border-border/40 pl-2.5 dark:border-[#1F2C34]">
                <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider dark:text-[#5C6A72]">
                  Progress
                </span>
                <div className="mt-1 h-5 w-12 rounded bg-muted/60 dark:bg-[#141E28] animate-pulse" />
              </div>
            </div>

            {/* Meta & Button */}
            <div className="flex items-center justify-between border-t border-border/40 dark:border-[#1F2C34] pt-3 text-xs">
              <span className="font-medium text-muted-foreground font-mono text-[11px] dark:text-[#9AA7AE]">
                6 subjects
              </span>
              <span className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                <span>View Classes</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>

          {/* Card 3: Subject Hacks (Blue Accent) */}
          <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card/90 p-5 shadow-sm backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820] min-h-[180px]">
            {/* Top Badge */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 ring-1 ring-blue-500/30 shadow-sm dark:text-blue-400">
                <Lightbulb className="h-5.5 w-5.5" />
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs font-bold text-blue-600 border border-blue-500/30 dark:text-blue-400">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                Active
              </span>
            </div>

            {/* Title */}
            <div className="mt-4">
              <h3 className="font-heading text-lg font-bold tracking-tight text-foreground dark:text-[#E8EDF0]">
                Subject Hacks
              </h3>
            </div>

            {/* Module Stats Grid */}
            <div className="my-4 grid grid-cols-3 gap-2 rounded-xl border border-border/40 bg-muted/20 p-2.5 dark:border-[#1F2C34] dark:bg-[#0A0F12]/60">
              <div>
                <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider dark:text-[#5C6A72]">
                  Total
                </span>
                <div className="mt-1 h-5 w-16 rounded bg-muted/60 dark:bg-[#141E28] animate-pulse" />
              </div>
              <div className="border-l border-border/40 pl-2.5 dark:border-[#1F2C34]">
                <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider dark:text-[#5C6A72]">
                  Completed
                </span>
                <div className="mt-1 h-5 w-14 rounded bg-blue-500/25 animate-pulse" />
              </div>
              <div className="border-l border-border/40 pl-2.5 dark:border-[#1F2C34]">
                <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider dark:text-[#5C6A72]">
                  Progress
                </span>
                <div className="mt-1 h-5 w-12 rounded bg-muted/60 dark:bg-[#141E28] animate-pulse" />
              </div>
            </div>

            {/* Meta & Button */}
            <div className="flex items-center justify-between border-t border-border/40 dark:border-[#1F2C34] pt-3 text-xs">
              <span className="font-medium text-muted-foreground font-mono text-[11px] dark:text-[#9AA7AE]">
                1 playlist
              </span>
              <span className="flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400">
                <span>View Hacks</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>

          {/* Card 4: Live Exams (Burgundy + Cream Academic Accent) */}
          <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card/90 p-5 shadow-sm backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820] min-h-[180px]">
            {/* Top Badge */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#881337] text-white shadow-xs">
                <GraduationCap className="h-5.5 w-5.5" />
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-[#FFF1F2] px-2.5 py-0.5 text-xs font-bold text-[#881337] border border-[#881337]/20 dark:bg-[#881337]/25 dark:text-[#FDA4AF] dark:border-[#881337]/35">
                <span className="h-1.5 w-1.5 rounded-full bg-[#881337] dark:bg-[#FDA4AF] animate-pulse" />
                Active
              </span>
            </div>

            {/* Title */}
            <div className="mt-4">
              <h3 className="font-heading text-lg font-bold tracking-tight text-foreground dark:text-[#E8EDF0]">
                Live Exams
              </h3>
            </div>

            {/* Module Stats Grid */}
            <div className="my-4 grid grid-cols-3 gap-2 rounded-xl border border-border/40 bg-muted/20 p-2.5 dark:border-[#1F2C34] dark:bg-[#0A0F12]/60">
              <div>
                <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider dark:text-[#5C6A72]">
                  Total
                </span>
                <div className="mt-1 h-5 w-16 rounded bg-muted/60 dark:bg-[#141E28] animate-pulse" />
              </div>
              <div className="border-l border-border/40 pl-2.5 dark:border-[#1F2C34]">
                <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider dark:text-[#5C6A72]">
                  Completed
                </span>
                <div className="mt-1 h-5 w-14 rounded bg-[#881337]/20 dark:bg-[#881337]/30 animate-pulse" />
              </div>
              <div className="border-l border-border/40 pl-2.5 dark:border-[#1F2C34]">
                <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider dark:text-[#5C6A72]">
                  Progress
                </span>
                <div className="mt-1 h-5 w-12 rounded bg-muted/60 dark:bg-[#141E28] animate-pulse" />
              </div>
            </div>

            {/* Meta & Button */}
            <div className="flex items-center justify-between border-t border-border/40 dark:border-[#1F2C34] pt-3 text-xs">
              <span className="font-medium text-muted-foreground font-mono text-[11px] dark:text-[#9AA7AE]">
                Daily • Weekly • Written
              </span>
              <span className="flex items-center gap-1 font-bold text-[#881337] dark:text-[#FDA4AF]">
                <span>Explore Exams</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
