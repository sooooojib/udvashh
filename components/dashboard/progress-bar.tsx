"use client";

import { Progress } from "@/components/ui/progress";
import { CheckCircle2, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProgressTheme = "teal" | "emerald" | "amber" | "blue";

interface WatchProgressBarProps {
  total: number;
  watched: number;
  theme?: ProgressTheme;
}

const themeStyles = {
  teal: {
    glow: "bg-[radial-gradient(circle_at_top_right,rgba(37,168,162,0.12),transparent_65%)]",
    progressIcon: "bg-teal-500/15 text-teal-600 ring-1 ring-teal-500/30 dark:bg-[#25A8A2]/15 dark:text-[#25A8A2] dark:ring-[#25A8A2]/30",
    completedIcon: "bg-teal-500/15 text-teal-600 ring-1 ring-teal-500/30 dark:bg-[#25A8A2]/15 dark:text-[#25A8A2] dark:ring-[#25A8A2]/30",
    percentDone: "text-teal-600 dark:text-[#25A8A2] dark:drop-shadow-[0_0_8px_rgba(37,168,162,0.4)]",
    progressFill: "bg-teal-600 dark:bg-[#25A8A2] dark:shadow-[0_0_10px_rgba(37,168,162,0.4)]",
  },
  emerald: {
    glow: "bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_65%)]",
    progressIcon: "bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/30",
    completedIcon: "bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/30",
    percentDone: "text-emerald-600 dark:text-emerald-400 dark:drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]",
    progressFill: "bg-emerald-600 dark:bg-emerald-500 dark:shadow-[0_0_10px_rgba(16,185,129,0.4)]",
  },
  amber: {
    glow: "bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_65%)]",
    progressIcon: "bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400 dark:ring-amber-500/30",
    completedIcon: "bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400 dark:ring-amber-500/30",
    percentDone: "text-amber-600 dark:text-amber-400 dark:drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]",
    progressFill: "bg-amber-500 dark:bg-amber-500 dark:shadow-[0_0_10px_rgba(245,158,11,0.4)]",
  },
  blue: {
    glow: "bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_65%)]",
    progressIcon: "bg-blue-500/15 text-blue-600 ring-1 ring-blue-500/30 dark:bg-blue-500/15 dark:text-blue-400 dark:ring-blue-500/30",
    completedIcon: "bg-blue-500/15 text-blue-600 ring-1 ring-blue-500/30 dark:bg-blue-500/15 dark:text-blue-400 dark:ring-blue-500/30",
    percentDone: "text-blue-600 dark:text-blue-400 dark:drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]",
    progressFill: "bg-blue-600 dark:bg-blue-600 dark:shadow-[0_0_10px_rgba(59,130,246,0.4)]",
  },
} as const;

export function WatchProgressBar({
  total,
  watched,
  theme = "teal",
}: WatchProgressBarProps) {
  const percent = total > 0 ? Math.round((watched / total) * 100) : 0;
  const t = themeStyles[theme];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/90 p-5 shadow-sm backdrop-blur-md transition-all dark:border-[#1F2C34] dark:bg-[#111820]/90">
      {/* Radial glow */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-60 dark:opacity-100 transition-opacity",
          t.glow
        )}
      />

      <div className="relative mb-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {watched === total && total > 0 ? (
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg shadow-2xs",
                t.completedIcon
              )}
            >
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
          ) : (
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg shadow-2xs",
                t.progressIcon
              )}
            >
              <PlayCircle className="h-4.5 w-4.5" />
            </div>
          )}
          <div>
            <p className="font-heading text-sm font-bold tracking-tight text-foreground dark:text-[#E8EDF0]">
              {watched === total && total > 0
                ? "All videos completed"
                : "Your Progress"}
            </p>
            <p className="text-xs text-muted-foreground font-mono dark:text-[#9AA7AE]">
              {watched} of {total} videos watched
            </p>
          </div>
        </div>

        <span
          className={cn(
            "font-mono text-2xl font-extrabold tabular-nums tracking-tight transition-colors",
            percent > 0
              ? t.percentDone
              : "text-muted-foreground dark:text-[#9AA7AE]"
          )}
        >
          {percent}%
        </span>
      </div>

      <div className="relative">
        <Progress
          value={percent}
          className="h-2 rounded-full bg-muted/60 dark:bg-[#141E28]"
          indicatorClassName={cn("transition-all duration-500", t.progressFill)}
          aria-label={`${watched} of ${total} videos watched`}
        />
      </div>
    </div>
  );
}
