"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { toggleWatched } from "@/app/actions/progress";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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
  Tv,
} from "lucide-react";

// Dynamically import react-youtube to avoid SSR issues
const YouTube = dynamic(
  () => import("react-youtube").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-muted/20 dark:bg-[#0A0F12] animate-pulse">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/40 text-muted-foreground dark:bg-[#141E28] dark:text-[#5C6A72]">
          <Play className="h-6 w-6 ml-0.5" />
        </div>
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
  playlistName?: string;
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
  playlistName,
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
      if (nextWatched) {
        toast.success("Marked as watched", {
          description: title,
        });
      } else {
        toast.info("Marked as unwatched", {
          description: title,
        });
      }
      await toggleWatched(videoId, nextWatched);
    });
  };

  const handleVideoEnd = () => {
    if (!optimisticWatched && !hasAutoMarked) {
      setHasAutoMarked(true);
      startTransition(async () => {
        setOptimisticWatched(true);
        toast.success("Video completed", {
          description: "Progress saved automatically.",
        });
        await toggleWatched(videoId, true);
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
        <Link
          href="/dashboard"
          className="transition-colors hover:text-foreground"
        >
          Dashboard
        </Link>
        <span>/</span>
        <Link
          href="/live-classes"
          className="flex items-center gap-1 font-medium text-foreground/80 transition-colors hover:text-foreground"
        >
          <Tv className="h-3 w-3 text-red-500" />
          <span>Live Classes</span>
        </Link>
        {playlistName && (
          <>
            <span>/</span>
            <span className="font-medium truncate max-w-[200px] sm:max-w-none text-foreground/80">
              {playlistName}
            </span>
          </>
        )}
        <span>/</span>
        <span className="font-semibold text-foreground font-mono">
          Video {position + 1}
        </span>
      </div>

      {/* Video Title & Meta Bar */}
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl leading-tight">
          {title}
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {duration > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-card/80 px-2 py-0.5 font-mono">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span>{formatDuration(duration)}</span>
            </span>
          )}

          <span
            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-medium transition-colors ${
              optimisticWatched
                ? "border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-border/60 bg-card/80 text-muted-foreground"
            }`}
          >
            {optimisticWatched ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="font-semibold">Watched</span>
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
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-black shadow-xl dark:border-[#1F2C34]">
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border/60 bg-card/90 p-3.5 shadow-sm backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820]">
        <div className="flex items-center gap-3">
          {/* Watched Toggle Button */}
          <Button
            variant={optimisticWatched ? "outline" : "default"}
            onClick={handleToggle}
            disabled={isPending}
            className={`h-9 rounded-xl gap-2 font-semibold shadow-sm transition-all active:scale-95 text-xs ${
              optimisticWatched
                ? "border-[#25A8A2]/40 text-[#25A8A2] bg-[#25A8A2]/10 hover:bg-[#25A8A2]/20 dark:border-[#25A8A2]/40 dark:bg-[#25A8A2]/15 dark:text-[#25A8A2]"
                : "bg-primary text-primary-foreground dark:bg-[#25A8A2] dark:text-white dark:hover:bg-[#20928D] dark:shadow-[0_0_10px_rgba(37,168,162,0.3)]"
            }`}
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : optimisticWatched ? (
              <Check className="h-3.5 w-3.5 stroke-[3]" />
            ) : (
              <Circle className="h-3.5 w-3.5" />
            )}
            <span>{optimisticWatched ? "Marked as Watched" : "Mark as Watched"}</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Back to Live Classes button */}
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 rounded-xl gap-1.5 text-xs dark:border-[#1F2C34] dark:bg-[#141E28] dark:text-[#E8EDF0] dark:hover:bg-[#1F2C34]"
          >
            <Link href="/live-classes">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Live Classes</span>
            </Link>
          </Button>

          {/* Next Video button */}
          {nextVideoId && (
            <Button
              asChild
              size="sm"
              className="h-9 rounded-xl gap-1.5 font-semibold shadow-sm text-xs bg-primary text-primary-foreground dark:bg-[#25A8A2] dark:text-white dark:hover:bg-[#20928D]"
            >
              <Link href={`/watch/${nextVideoId}`}>
                <span>Next video</span>
                <SkipForward className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Description Box */}
      {description && (
        <div className="rounded-2xl border border-border/60 bg-card/90 p-5 shadow-sm backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820]">
          <div className="mb-2.5 flex items-center gap-2 font-heading font-bold text-sm tracking-tight text-foreground dark:text-[#E8EDF0]">
            <FileText className="h-4 w-4 text-muted-foreground dark:text-[#25A8A2]" />
            <span>Description</span>
          </div>
          <p className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground dark:text-[#9AA7AE]">
            {description}
          </p>
        </div>
      )}
    </div>
  );
}
