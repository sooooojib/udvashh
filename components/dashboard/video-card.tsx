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
        "group relative flex flex-col overflow-hidden rounded-xl border transition-all duration-200 ease-in-out hover:scale-[1.01] hover:shadow-md",
        optimisticWatched
          ? "border-emerald-500/30 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20"
          : "border-border/60 bg-card/90 backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-950/80"
      )}
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted/40 shrink-0">
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
            <Play className="h-8 w-8 text-muted-foreground/40" />
          </div>
        )}

        {/* Duration badge */}
        {video.duration > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/80 px-1.5 py-0.5 text-[11px] font-mono font-medium text-white shadow-sm backdrop-blur-md">
            <Clock className="h-2.5 w-2.5 text-zinc-300" />
            <span>{formatDuration(video.duration)}</span>
          </div>
        )}

        {/* Index/Position tag */}
        <div className="absolute left-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-md bg-black/75 px-1.5 text-[11px] font-bold text-white shadow-sm backdrop-blur-md font-mono">
          {index + 1}
        </div>

        {/* Watched visual overlay */}
        {optimisticWatched && (
          <div className="absolute inset-0 flex items-center justify-center bg-emerald-950/25 backdrop-blur-[1px] transition-all">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500/20">
              <Check className="h-5 w-5 stroke-[3]" />
            </div>
          </div>
        )}
      </div>

      {/* Card Content */}
      <CardContent className="flex flex-1 flex-col gap-2.5 p-4">
        {/* Title */}
        <h3
          className={cn(
            "font-heading line-clamp-2 text-sm font-bold leading-snug tracking-tight transition-colors",
            optimisticWatched
              ? "text-muted-foreground"
              : "text-foreground group-hover:text-primary transition-colors"
          )}
        >
          {video.title}
        </h3>

        {/* Description with graceful line-breaks & relaxed leading */}
        {video.description && (
          <p className="line-clamp-3 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
            {video.description}
          </p>
        )}

        {/* Card Footer: Checkbox + Action Button */}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/40 pt-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground select-none transition-colors hover:text-foreground">
            <Checkbox
              checked={optimisticWatched}
              onCheckedChange={handleToggle}
              id={`watched-${video.id}`}
              className="rounded-md"
              aria-label={`Mark "${video.title}" as ${optimisticWatched ? "unwatched" : "watched"}`}
            />
            <span className="flex items-center gap-1 text-xs">
              {optimisticWatched ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">
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
            className="h-8 rounded-lg px-3 text-xs font-semibold shadow-sm transition-all duration-150 active:scale-95"
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
