"use client";

import { Progress } from "@/components/ui/progress";
import { CheckCircle2, PlayCircle } from "lucide-react";

interface WatchProgressBarProps {
  total: number;
  watched: number;
}

export function WatchProgressBar({ total, watched }: WatchProgressBarProps) {
  const percent = total > 0 ? Math.round((watched / total) * 100) : 0;

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          {watched === total && total > 0 ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : (
            <PlayCircle className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
          )}
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {watched === total && total > 0
                ? "All videos watched! 🎉"
                : "Your Progress"}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {watched} of {total} videos watched
            </p>
          </div>
        </div>

        <span
          className={`text-2xl font-bold tabular-nums tracking-tight ${
            percent === 100
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-zinc-900 dark:text-zinc-100"
          }`}
        >
          {percent}%
        </span>
      </div>

      <Progress
        value={percent}
        className={`h-2.5 ${
          percent === 100
            ? "[&>div]:bg-emerald-500 dark:[&>div]:bg-emerald-400"
            : ""
        }`}
        aria-label={`${watched} of ${total} videos watched`}
      />
    </div>
  );
}
