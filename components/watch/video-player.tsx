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
      <div className="flex aspect-video w-full items-center justify-center bg-muted/20 dark:bg-[#0A0F12] animate-pulse">
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
    <div className="space-y-4 sm:space-y-6">
      {/* Navigation Breadcrumb — horizontal scroll on small screens, has own px */}
      <div className="pills-row gap-1.5 text-xs text-muted-foreground px-4 sm:px-0">
        <Link
          href="/dashboard"
          className="shrink-0 transition-colors hover:text-foreground min-h-[44px] inline-flex items-center"
        >
          Dashboard
        </Link>
        <span className="shrink-0">/</span>
        <Link
          href="/live-classes"
          className="shrink-0 flex items-center gap-1 font-medium text-foreground/80 transition-colors hover:text-foreground min-h-[44px]"
        >
          <Tv className="h-3 w-3 text-red-500" />
          <span>Live Classes</span>
        </Link>
        {playlistName && (
          <>
            <span className="shrink-0">/</span>
            <span className="font-medium truncate max-w-[140px] text-foreground/80 shrink-0">
              {playlistName}
            </span>
          </>
        )}
        <span className="shrink-0">/</span>
        <span className="font-semibold text-foreground font-mono shrink-0">
          Video {position + 1}
        </span>
      </div>

      {/* Video Title & Meta Bar */}
      <div className="space-y-2 px-4 sm:px-0">
        <h1 className="font-heading text-xl font-extrabold tracking-tight text-foreground sm:text-2xl md:text-3xl leading-tight">
          {title}
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {duration > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-card/80 px-2 py-1 font-mono">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span>{formatDuration(duration)}</span>
            </span>
          )}

          <span
            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-medium transition-colors ${
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

      {/* YouTube Player Container — edge-to-edge on mobile, no horizontal overflow */}
      <div className="overflow-hidden rounded-none sm:rounded-2xl border-y sm:border border-border/60 bg-black shadow-xl dark:border-[#1F2C34] -mx-4 sm:mx-0">
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

      {/* Controls Bar — stacked on mobile, row on sm+, with px on mobile */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/90 p-4 shadow-sm backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820] mx-4 sm:mx-0">
        {/* Row 1: Watched Toggle — full width on mobile */}
        <Button
          variant={optimisticWatched ? "outline" : "default"}
          onClick={handleToggle}
          disabled={isPending}
          className={`w-full sm:w-auto min-h-[48px] rounded-xl gap-2 font-semibold shadow-sm transition-all active:scale-[0.97] text-sm ${
            optimisticWatched
              ? "border-[#25A8A2]/40 text-[#25A8A2] bg-[#25A8A2]/10 hover:bg-[#25A8A2]/20 dark:border-[#25A8A2]/40 dark:bg-[#25A8A2]/15 dark:text-[#25A8A2]"
              : "bg-primary text-primary-foreground dark:bg-[#25A8A2] dark:text-white dark:hover:bg-[#20928D] dark:shadow-[0_0_10px_rgba(37,168,162,0.3)]"
          }`}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : optimisticWatched ? (
            <Check className="h-4 w-4 stroke-[3]" />
          ) : (
            <Circle className="h-4 w-4" />
          )}
          <span>{optimisticWatched ? "Marked as Watched" : "Mark as Watched"}</span>
        </Button>

        {/* Row 2: Navigation buttons — side by side, full width on mobile */}
        <div className="flex items-center gap-2.5 sm:justify-end">
          {/* Back button */}
          <Button
            asChild
            variant="outline"
            className="flex-1 sm:flex-none min-h-[48px] rounded-xl gap-1.5 text-sm dark:border-[#1F2C34] dark:bg-[#141E28] dark:text-[#E8EDF0] dark:hover:bg-[#1F2C34] active:scale-[0.97] transition-transform"
          >
            <Link href="/live-classes">
              <ArrowLeft className="h-4 w-4" />
              <span>Live Classes</span>
            </Link>
          </Button>

          {/* Next Video button */}
          {nextVideoId && (
            <Button
              asChild
              className="flex-1 sm:flex-none min-h-[48px] rounded-xl gap-1.5 font-semibold shadow-sm text-sm bg-primary text-primary-foreground dark:bg-[#25A8A2] dark:text-white dark:hover:bg-[#20928D] active:scale-[0.97] transition-transform"
            >
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
        <div className="rounded-2xl border border-border/60 bg-card/90 p-4 sm:p-5 shadow-sm backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820] mx-4 sm:mx-0">
          <div className="mb-2.5 flex items-center gap-2 font-heading font-bold text-sm tracking-tight text-foreground dark:text-[#E8EDF0]">
            <FileText className="h-4 w-4 text-muted-foreground dark:text-[#25A8A2]" />
            <span>Description</span>
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground dark:text-[#9AA7AE]">
            {description}
          </p>
        </div>
      )}
    </div>
  );
}
