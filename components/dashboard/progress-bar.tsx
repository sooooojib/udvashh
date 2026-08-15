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
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/90 p-5 shadow-sm backdrop-blur-md transition-all dark:border-[#1F2C34] dark:bg-[#111820]/90">
      {/* SevenGrid Subtle Radial Glow in Dark Mode */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,168,162,0.08),transparent_65%)] dark:opacity-100 opacity-30" />

      <div className="relative mb-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {watched === total && total > 0 ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#25A8A2]/15 text-[#25A8A2]">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground dark:bg-[#141E28] dark:text-[#9AA7AE]">
              <PlayCircle className="h-4.5 w-4.5" />
            </div>
          )}
          <div>
            <p className="font-heading text-sm font-bold tracking-tight text-foreground dark:text-[#E8EDF0]">
              {watched === total && total > 0
                ? "All videos watched! 🎉"
                : "Your Progress"}
            </p>
            <p className="text-xs text-muted-foreground font-mono dark:text-[#9AA7AE]">
              {watched} of {total} videos watched
            </p>
          </div>
        </div>

        <span
          className={`font-mono text-2xl font-extrabold tabular-nums tracking-tight ${
            percent === 100
              ? "text-[#25A8A2] drop-shadow-[0_0_8px_rgba(37,168,162,0.4)]"
              : "text-foreground dark:text-[#E8EDF0]"
          }`}
        >
          {percent}%
        </span>
      </div>

      <div className="relative">
        <Progress
          value={percent}
          className="h-2 rounded-full bg-muted/60 dark:bg-[#141E28] [&>div]:bg-[#25A8A2] [&>div]:transition-all [&>div]:duration-500 [&>div]:shadow-[0_0_10px_rgba(37,168,162,0.4)]"
          aria-label={`${watched} of ${total} videos watched`}
        />
      </div>
    </div>
  );
}
