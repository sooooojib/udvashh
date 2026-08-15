"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { toggleWatched } from "@/app/actions/progress";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils/format";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  SkipForward,
} from "lucide-react";

// Dynamically import react-youtube to avoid SSR issues
const YouTube = dynamic(() => import("react-youtube").then((mod) => mod.default), {
  ssr: false,
  loading: () => (
    <div className="aspect-video w-full animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
  ),
});

interface VideoPlayerProps {
  videoId: string;         // Supabase video UUID
  youtubeVideoId: string;  // YouTube video ID for embedding
  title: string;
  description: string | null;
  duration: number;
  position: number;
  initialWatched: boolean;
  nextVideoId: string | null;
}

export function VideoPlayer({
  videoId,
  youtubeVideoId,
  title,
  description,
  duration,
  position,
  initialWatched,
  nextVideoId,
}: VideoPlayerProps) {
  const [optimisticWatched, setOptimisticWatched] = useOptimistic(initialWatched);
  const [isPending, startTransition] = useTransition();
  const [hasAutoMarked, setHasAutoMarked] = React.useState(false);

  const handleToggle = () => {
    const nextWatched = !optimisticWatched;
    startTransition(async () => {
      setOptimisticWatched(nextWatched);
      await toggleWatched(videoId, nextWatched);
    });
  };

  const handleVideoEnd = () => {
    if (!optimisticWatched && !hasAutoMarked) {
      setHasAutoMarked(true);
      startTransition(async () => {
        setOptimisticWatched(true);
        await toggleWatched(videoId, true);
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to playlist</span>
        </Link>
        <span className="text-zinc-300 dark:text-zinc-700">/</span>
        <span className="text-zinc-700 dark:text-zinc-300 font-medium truncate">
          Video {position + 1}
        </span>
      </div>

      {/* Title + metadata */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
          {title}
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
          {duration > 0 && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {formatDuration(duration)}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            {optimisticWatched ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  Watched
                </span>
              </>
            ) : (
              <>
                <Circle className="h-3.5 w-3.5" />
                <span>Not watched</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* YouTube Player */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-black shadow-lg dark:border-zinc-800">
        <div className="aspect-video w-full">
          <YouTube
            videoId={youtubeVideoId}
            opts={{
              width: "100%",
              height: "100%",
              playerVars: {
                autoplay: 0,
                modestbranding: 1,
                rel: 0,
              },
            }}
            className="aspect-video w-full [&>div]:!h-full [&>div]:!w-full [&_iframe]:!h-full [&_iframe]:!w-full"
            onEnd={handleVideoEnd}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* Toggle watched */}
          <Button
            variant={optimisticWatched ? "outline" : "default"}
            onClick={handleToggle}
            disabled={isPending}
            className="gap-2 font-semibold"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : optimisticWatched ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <Circle className="h-4 w-4" />
            )}
            {optimisticWatched ? "Unwatch" : "Mark as watched"}
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {/* Back to playlist */}
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Playlist</span>
            </Link>
          </Button>

          {/* Next video */}
          {nextVideoId && (
            <Button asChild className="gap-2 font-semibold">
              <Link href={`/watch/${nextVideoId}`}>
                Next video
                <SkipForward className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Description */}
      {description && (
        <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-5 dark:border-zinc-800 dark:bg-zinc-900/30">
          <h2 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Description
          </h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {description}
          </p>
        </div>
      )}
    </div>
  );
}
