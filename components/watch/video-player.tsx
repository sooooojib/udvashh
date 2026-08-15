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
  Check,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Loader2,
  Play,
  SkipForward,
} from "lucide-react";

// Dynamically import react-youtube to avoid SSR issues
const YouTube = dynamic(
  () => import("react-youtube").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-video w-full items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-900 animate-pulse">
        <Play className="h-12 w-12 text-zinc-300 dark:text-zinc-700" />
      </div>
    ),
  }
);

interface VideoPlayerProps {
  videoId: string; // Supabase video UUID
  youtubeVideoId: string; // YouTube video ID for embedding
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
  const [optimisticWatched, setOptimisticWatched] =
    useOptimistic(initialWatched);
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
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to playlist</span>
        </Link>
        <span className="text-zinc-300 dark:text-zinc-700">/</span>
        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
          Video {position + 1}
        </span>
      </div>

      {/* Video Title & Meta Bar */}
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
          {title}
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
          {duration > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200/80 bg-zinc-50/80 px-2.5 py-1 dark:border-zinc-800 dark:bg-zinc-900/60">
              <Clock className="h-3.5 w-3.5 text-zinc-400" />
              <span>{formatDuration(duration)}</span>
            </span>
          )}

          <span
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-medium transition-colors ${
              optimisticWatched
                ? "border-emerald-300/60 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-zinc-200/80 bg-zinc-50/80 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400"
            }`}
          >
            {optimisticWatched ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Watched</span>
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

      {/* YouTube Player Container */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-black shadow-2xl shadow-zinc-950/10 dark:border-zinc-800 dark:shadow-none">
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

      {/* Controls Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-zinc-200/80 bg-white/60 p-3.5 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="flex items-center gap-3">
          {/* Watched Toggle Button */}
          <Button
            variant={optimisticWatched ? "outline" : "default"}
            onClick={handleToggle}
            disabled={isPending}
            className="gap-2 font-semibold shadow-sm"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : optimisticWatched ? (
              <Check className="h-4 w-4 text-emerald-500 stroke-[3]" />
            ) : (
              <Circle className="h-4 w-4" />
            )}
            <span>{optimisticWatched ? "Unwatch" : "Mark as watched"}</span>
          </Button>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Back to playlist button */}
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              <span>Playlist</span>
            </Link>
          </Button>

          {/* Next Video button */}
          {nextVideoId && (
            <Button asChild className="gap-2 font-semibold shadow-sm">
              <Link href={`/watch/${nextVideoId}`}>
                <span>Next video</span>
                <SkipForward className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Description Box */}
      {description && (
        <div className="rounded-2xl border border-zinc-200/80 bg-white/60 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/30">
          <div className="mb-3 flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
            <FileText className="h-4 w-4 text-zinc-500" />
            <span>Description</span>
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {description}
          </p>
        </div>
      )}
    </div>
  );
}
