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
import { Clock, Play } from "lucide-react";
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
        "group relative flex flex-col overflow-hidden border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
        optimisticWatched
          ? "border-emerald-200/80 bg-emerald-50/30 dark:border-emerald-900/40 dark:bg-emerald-950/10"
          : "border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950"
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900 shrink-0">
        {video.thumbnail_url ? (
          <Image
            src={video.thumbnail_url}
            alt={video.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Play className="h-10 w-10 text-zinc-300 dark:text-zinc-700" />
          </div>
        )}

        {/* Duration badge */}
        {video.duration > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/75 px-1.5 py-0.5 text-xs font-mono font-medium text-white backdrop-blur-sm">
            <Clock className="h-2.5 w-2.5" />
            {formatDuration(video.duration)}
          </div>
        )}

        {/* Position badge */}
        <div className="absolute left-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-md bg-black/70 px-1.5 text-xs font-semibold text-white backdrop-blur-sm">
          {index + 1}
        </div>

        {/* Watched overlay tick */}
        {optimisticWatched && (
          <div className="absolute inset-0 flex items-center justify-center bg-emerald-900/30">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/90 text-white shadow-lg">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Card body */}
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        {/* Title */}
        <h3
          className={cn(
            "line-clamp-2 text-sm font-semibold leading-snug transition-colors",
            optimisticWatched
              ? "text-zinc-500 dark:text-zinc-500"
              : "text-zinc-900 dark:text-zinc-100"
          )}
        >
          {video.title}
        </h3>

        {/* Description */}
        {video.description && (
          <p className="line-clamp-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {video.description}
          </p>
        )}

        {/* Footer: checkbox + watch button */}
        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-zinc-600 select-none dark:text-zinc-400">
            <Checkbox
              checked={optimisticWatched}
              onCheckedChange={handleToggle}
              id={`watched-${video.id}`}
              aria-label={`Mark "${video.title}" as ${optimisticWatched ? "unwatched" : "watched"}`}
            />
            <span>{optimisticWatched ? "Watched" : "Mark watched"}</span>
          </label>

          <Button asChild size="sm" className="gap-1.5 text-xs font-semibold">
            <Link href={`/watch/${video.youtube_video_id}`}>
              <Play className="h-3 w-3 fill-current" />
              Watch
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
