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
    <div className="rounded-xl border border-border/60 bg-card/90 p-4.5 shadow-sm backdrop-blur-sm">
      <div className="mb-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          {watched === total && total > 0 ? (
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <PlayCircle className="h-4.5 w-4.5 text-muted-foreground" />
          )}
          <div>
            <p className="font-heading text-sm font-bold tracking-tight text-foreground">
              {watched === total && total > 0
                ? "All videos watched! 🎉"
                : "Your Progress"}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {watched} of {total} videos watched
            </p>
          </div>
        </div>

        <span
          className={`font-mono text-xl font-extrabold tabular-nums tracking-tight ${
            percent === 100
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-foreground"
          }`}
        >
          {percent}%
        </span>
      </div>

      <Progress
        value={percent}
        className={`h-2 ${
          percent === 100
            ? "[&>div]:bg-emerald-600 dark:[&>div]:bg-emerald-400"
            : ""
        }`}
        aria-label={`${watched} of ${total} videos watched`}
      />
    </div>
  );
}
