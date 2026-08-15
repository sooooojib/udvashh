"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useOptimistic, useTransition } from "react";
import { toggleWatched } from "@/app/actions/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDuration } from "@/lib/utils/format";
import { Check, CheckCircle2, Clock, Play } from "lucide-react";
import { cn } from "@/lib/utils";

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
}

export function VideoCard({ video, initialWatched, index }: VideoCardProps) {
  const [optimisticWatched, setOptimisticWatched] =
    useOptimistic(initialWatched);
  const [, startTransition] = useTransition();

  const handleToggle = (checked: boolean | "indeterminate") => {
    const nextWatched = checked === true;
    startTransition(async () => {
      setOptimisticWatched(nextWatched);
      await toggleWatched(video.id, nextWatched);
    });
  };

  return (
    <Card
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-200 ease-in-out hover:scale-[1.01] hover:shadow-md",
        optimisticWatched
          ? "border-[#25A8A2]/30 bg-[#25A8A2]/5 dark:border-[#25A8A2]/40 dark:bg-[#25A8A2]/10 shadow-[0_0_15px_rgba(37,168,162,0.08)]"
          : "border-border/60 bg-card/90 backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820] dark:hover:border-[#25A8A2]/50 hover:border-primary/40"
      )}
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted/40 shrink-0 dark:bg-[#0A0F12]">
        {video.thumbnail_url ? (
          <Image
            src={video.thumbnail_url}
            alt={video.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
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

        {/* Index/Position tag */}
        <div className="absolute left-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-md bg-black/80 px-1.5 text-[11px] font-bold text-white shadow-sm backdrop-blur-md font-mono">
          {index + 1}
        </div>

        {/* Watched visual overlay with glowing SevenGrid cyan/teal */}
        {optimisticWatched && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0A0F12]/40 backdrop-blur-[1px] transition-all">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25A8A2] text-white shadow-[0_0_12px_rgba(37,168,162,0.6)]">
              <Check className="h-5 w-5 stroke-[3]" />
            </div>
          </div>
        )}
      </div>

      {/* Card Content */}
      <CardContent className="flex flex-1 flex-col gap-2.5 p-4.5">
        {/* Title */}
        <h3
          className={cn(
            "font-heading text-sm font-bold leading-snug tracking-tight transition-colors",
            optimisticWatched
              ? "text-muted-foreground dark:text-[#9AA7AE]"
              : "text-foreground group-hover:text-primary dark:text-[#E8EDF0] dark:group-hover:text-[#25A8A2]"
          )}
        >
          {video.title}
        </h3>

        {/* Full description without cut-off */}
        {video.description && (
          <p className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground dark:text-[#9AA7AE]">
            {video.description}
          </p>
        )}

        {/* Card Footer: Checkbox + Action Button */}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/40 dark:border-[#1F2C34] pt-3.5">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground select-none transition-colors hover:text-foreground dark:text-[#9AA7AE] dark:hover:text-[#E8EDF0]">
            <Checkbox
              checked={optimisticWatched}
              onCheckedChange={handleToggle}
              id={`watched-${video.id}`}
              className="rounded-md border-border dark:border-[#1F2C34] data-[state=checked]:bg-[#25A8A2] data-[state=checked]:border-[#25A8A2]"
              aria-label={`Mark "${video.title}" as ${optimisticWatched ? "unwatched" : "watched"}`}
            />
            <span className="flex items-center gap-1 text-xs">
              {optimisticWatched ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#25A8A2]" />
                  <span className="font-semibold text-[#25A8A2]">
                    Watched
                  </span>
                </>
              ) : (
                <span>Mark watched</span>
              )}
            </span>
          </label>

          <Button
            asChild
            size="sm"
            className="h-8 rounded-xl px-3.5 text-xs font-semibold shadow-sm transition-all duration-150 active:scale-95 bg-primary text-primary-foreground hover:opacity-90 dark:bg-[#25A8A2] dark:text-white dark:hover:bg-[#20928D] dark:shadow-[0_0_10px_rgba(37,168,162,0.3)]"
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
