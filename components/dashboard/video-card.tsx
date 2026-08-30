"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useOptimistic, useTransition } from "react";
import { toggleWatched } from "@/app/actions/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { formatDuration, extractClassNumber } from "@/lib/utils/format";
import { Check, Clock, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export type VideoTheme = "teal" | "amber" | "blue";

export interface Video {
  id: string;
  youtube_video_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  position: number;
  duration: number;
  published_at: string | null;
  playlist_id: string | null;
}

interface VideoCardProps {
  video: Video;
  initialWatched: boolean;
  index: number;
  theme?: VideoTheme;
}

// All Tailwind classes must be static strings so they survive purging
const themeStyles = {
  teal: {
    watchedCard:
      "border-[#25A8A2]/30 bg-[#25A8A2]/5 dark:border-[#25A8A2]/40 dark:bg-[#25A8A2]/10 shadow-[0_0_15px_rgba(37,168,162,0.08)]",
    defaultCard:
      "border-border/60 bg-card/90 backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820] dark:hover:border-[#25A8A2]/50 hover:border-primary/40",
    overlayRing: "bg-[#25A8A2] shadow-[0_0_12px_rgba(37,168,162,0.6)]",
    titleHover: "dark:group-hover:text-[#25A8A2]",
    checkboxChecked:
      "data-[state=checked]:bg-[#25A8A2] data-[state=checked]:border-[#25A8A2]",
    watchedLabel: "text-[#25A8A2]",
    watchButton:
      "bg-primary text-primary-foreground hover:opacity-90 dark:bg-[#25A8A2] dark:text-white dark:hover:bg-[#20928D] dark:shadow-[0_0_10px_rgba(37,168,162,0.3)]",
  },
  amber: {
    watchedCard:
      "border-amber-500/30 bg-amber-500/5 dark:border-amber-500/40 dark:bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.08)]",
    defaultCard:
      "border-border/60 bg-card/90 backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820] dark:hover:border-amber-500/50 hover:border-amber-500/40",
    overlayRing: "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]",
    titleHover: "dark:group-hover:text-amber-400",
    checkboxChecked:
      "data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500",
    watchedLabel: "text-amber-600 dark:text-amber-400",
    watchButton:
      "bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-600 dark:text-white dark:hover:bg-amber-700 dark:shadow-[0_0_10px_rgba(245,158,11,0.3)]",
  },
  blue: {
    watchedCard:
      "border-blue-500/30 bg-blue-500/5 dark:border-blue-500/40 dark:bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.08)]",
    defaultCard:
      "border-border/60 bg-card/90 backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820] dark:hover:border-blue-500/50 hover:border-blue-500/40",
    overlayRing: "bg-blue-600 shadow-[0_0_12px_rgba(59,130,246,0.6)]",
    titleHover: "dark:group-hover:text-blue-400",
    checkboxChecked:
      "data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600",
    watchedLabel: "text-blue-600 dark:text-blue-400",
    watchButton:
      "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700 dark:shadow-[0_0_10px_rgba(59,130,246,0.3)]",
  },
} as const;

export function VideoCard({
  video,
  initialWatched,
  index,
  theme = "teal",
}: VideoCardProps) {
  const [optimisticWatched, setOptimisticWatched] =
    useOptimistic(initialWatched);
  const [, startTransition] = useTransition();
  const classNumber = extractClassNumber(video.title) ?? (index + 1);
  const t = themeStyles[theme];

  const handleToggle = (checked: boolean | "indeterminate") => {
    const nextWatched = checked === true;
    startTransition(async () => {
      setOptimisticWatched(nextWatched);
      if (nextWatched) {
        toast.success("Marked as watched", { description: video.title });
      } else {
        toast.info("Marked as unwatched", { description: video.title });
      }
      await toggleWatched(video.id, nextWatched);
    });
  };

  return (
    <Card
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-200 ease-out hover:scale-[1.015] hover:shadow-md transform-gpu will-change-transform",
        optimisticWatched ? t.watchedCard : t.defaultCard
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted/40 shrink-0 dark:bg-[#0A0F12]">
        {video.thumbnail_url ? (
          <Image
            src={video.thumbnail_url}
            alt={video.title}
            fill
            sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
            loading={index < 3 ? "eager" : "lazy"}
            decoding="async"
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Play className="h-8 w-8 text-muted-foreground/40 dark:text-[#5C6A72]" />
          </div>
        )}

        {/* Duration badge */}
        {video.duration > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/85 px-1.5 py-0.5 text-[11px] font-mono font-medium text-white shadow-sm backdrop-blur-md">
            <Clock className="h-2.5 w-2.5 text-zinc-300" />
            <span>{formatDuration(video.duration)}</span>
          </div>
        )}

        {/* Index tag */}
        <div className="absolute left-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-md bg-black/80 px-1.5 text-[11px] font-bold text-white shadow-sm backdrop-blur-md font-mono">
          {classNumber}
        </div>

        {/* Watched overlay */}
        {optimisticWatched && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0A0F12]/40 backdrop-blur-[1px] transition-all">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-white",
                t.overlayRing
              )}
            >
              <Check className="h-5 w-5 stroke-[3]" />
            </div>
          </div>
        )}
      </div>

      {/* Card Content */}
      <CardContent className="flex flex-1 flex-col gap-2.5 p-4.5">
        <h3
          className={cn(
            "font-heading text-sm font-bold leading-snug tracking-tight transition-colors",
            optimisticWatched
              ? "text-muted-foreground dark:text-[#9AA7AE]"
              : cn("text-foreground dark:text-[#E8EDF0]", t.titleHover)
          )}
        >
          {video.title}
        </h3>

        {video.description && (
          <p className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground dark:text-[#9AA7AE]">
            {video.description}
          </p>
        )}

        {/* Footer: Checkbox + Watch button */}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/40 dark:border-[#1F2C34] pt-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground select-none transition-colors hover:text-foreground dark:text-[#9AA7AE] dark:hover:text-[#E8EDF0] min-h-[44px] py-1 -my-1 px-0.5">
            <Checkbox
              checked={optimisticWatched}
              onCheckedChange={handleToggle}
              id={`watched-${video.id}`}
              className={cn("rounded-md border-border dark:border-[#1F2C34] h-4 w-4", t.checkboxChecked)}
              aria-label={`Mark "${video.title}" as ${optimisticWatched ? "unwatched" : "watched"}`}
            />
            <span className="text-xs">
              {optimisticWatched ? (
                <span className={cn("font-semibold", t.watchedLabel)}>
                  Watched
                </span>
              ) : (
                <span>Mark watched</span>
              )}
            </span>
          </label>

          <Button
            asChild
            size="sm"
            className={cn(
              "min-h-[44px] rounded-xl px-3.5 text-xs font-semibold shadow-sm transition-all duration-150 active:scale-95",
              t.watchButton
            )}
          >
            <Link href={`/watch/${video.youtube_video_id}`}>
              <Play className="h-3 w-3 fill-current" />
              <span>Watch</span>
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
