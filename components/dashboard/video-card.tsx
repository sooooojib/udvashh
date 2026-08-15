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
        "group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
        optimisticWatched
          ? "border-emerald-300/60 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20"
          : "border-zinc-200/80 bg-white dark:border-zinc-800/80 dark:bg-zinc-950"
      )}
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900 shrink-0">
        {video.thumbnail_url ? (
          <Image
            src={video.thumbnail_url}
            alt={video.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Play className="h-10 w-10 text-zinc-300 dark:text-zinc-700" />
          </div>
        )}

        {/* Duration badge */}
        {video.duration > 0 && (
          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-lg bg-black/80 px-2 py-0.5 text-xs font-mono font-medium text-white shadow-sm backdrop-blur-md">
            <Clock className="h-3 w-3 text-zinc-300" />
            <span>{formatDuration(video.duration)}</span>
          </div>
        )}

        {/* Index/Position tag */}
        <div className="absolute left-2.5 top-2.5 flex h-6 min-w-6 items-center justify-center rounded-lg bg-black/75 px-1.5 text-xs font-bold text-white shadow-sm backdrop-blur-md">
          {index + 1}
        </div>

        {/* Watched visual overlay */}
        {optimisticWatched && (
          <div className="absolute inset-0 flex items-center justify-center bg-emerald-950/30 backdrop-blur-[1px] transition-all">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg ring-4 ring-emerald-500/20">
              <Check className="h-6 w-6 stroke-[3]" />
            </div>
          </div>
        )}
      </div>

      {/* Card Content */}
      <CardContent className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        {/* Title */}
        <h3
          className={cn(
            "line-clamp-2 text-sm font-bold leading-snug tracking-tight transition-colors",
            optimisticWatched
              ? "text-zinc-500 dark:text-zinc-400"
              : "text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-700 dark:group-hover:text-zinc-200"
          )}
        >
          {video.title}
        </h3>

        {/* Description with graceful line-breaks & clamp */}
        {video.description && (
          <p className="line-clamp-3 whitespace-pre-line text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {video.description}
          </p>
        )}

        {/* Card Footer: Checkbox + Action Button */}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-900">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-zinc-600 select-none transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200">
            <Checkbox
              checked={optimisticWatched}
              onCheckedChange={handleToggle}
              id={`watched-${video.id}`}
              aria-label={`Mark "${video.title}" as ${optimisticWatched ? "unwatched" : "watched"}`}
            />
            <span className="flex items-center gap-1">
              {optimisticWatched ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Watched</span>
                </>
              ) : (
                <span>Mark watched</span>
              )}
            </span>
          </label>

          <Button asChild size="sm" className="gap-1.5 text-xs font-semibold shadow-sm">
            <Link href={`/watch/${video.youtube_video_id}`}>
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Watch</span>
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
