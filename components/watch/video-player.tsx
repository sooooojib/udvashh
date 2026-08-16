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
  ChevronRight,
  Circle,
  Clock,
  FileText,
  Flame,
  LayoutGrid,
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
  moduleName?: string;
  moduleHref?: string;
  moduleType?: "live" | "intensive";
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
  moduleName = "Live Classes",
  moduleHref = "/live-classes",
  moduleType = "live",
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

  const isIntensive = moduleType === "intensive";

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ── Location / Navigation Breadcrumb ── */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center flex-wrap gap-1.5 sm:gap-2 text-xs text-muted-foreground"
      >
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted/60 transition-colors text-foreground/80 hover:text-foreground font-medium"
        >
          <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Dashboard</span>
        </Link>

        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />

        <Link
          href={moduleHref}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted/60 transition-colors text-foreground/80 hover:text-foreground font-medium"
        >
          {isIntensive ? (
            <Flame className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          ) : (
            <Tv className="h-3.5 w-3.5 text-[#25A8A2] shrink-0" />
          )}
          <span>{moduleName}</span>
        </Link>

        {playlistName && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
            <span
              className="px-2 py-1 rounded-lg text-foreground/75 font-medium max-w-[180px] sm:max-w-[280px] truncate"
              title={playlistName}
            >
              {playlistName}
            </span>
          </>
        )}

        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />

        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-muted/60 text-foreground dark:bg-[#141E28] dark:text-[#E8EDF0]">
          Class {position + 1}
        </span>
      </nav>

      {/* ── Video Title & Meta Bar ── */}
      <div className="space-y-2.5">
        <h1 className="font-heading text-xl font-extrabold tracking-tight text-foreground sm:text-2xl md:text-3xl leading-tight">
          {title}
        </h1>
        <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
          {duration > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/80 px-2.5 py-1 font-mono font-medium shadow-2xs dark:border-[#1F2C34] dark:bg-[#111820]">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{formatDuration(duration)}</span>
            </span>
          )}

          <span
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-medium transition-colors shadow-2xs ${
              optimisticWatched
                ? isIntensive
                  ? "border-amber-500/30 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300"
                  : "border-emerald-500/30 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-border/60 bg-card/80 text-muted-foreground dark:border-[#1F2C34] dark:bg-[#111820]"
            }`}
          >
            {optimisticWatched ? (
              <>
                <CheckCircle2
                  className={`h-3.5 w-3.5 ${
                    isIntensive
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                />
                <span className="font-semibold">Watched</span>
              </>
            ) : (
              <>
                <Circle className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span>Not watched</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* ── YouTube Player Container ── */}
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

      {/* ── Action Control Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 rounded-2xl border border-border/60 bg-card/90 p-3.5 sm:p-4 shadow-sm backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820]">
        {/* Left: Back to Module Navigation */}
        <div className="flex items-center">
          <Button
            asChild
            variant="outline"
            className="w-full sm:w-auto h-11 rounded-xl gap-2 text-xs font-semibold dark:border-[#1F2C34] dark:bg-[#141E28] dark:text-[#E8EDF0] dark:hover:bg-[#1F2C34] active:scale-[0.98] transition-all"
          >
            <Link href={moduleHref}>
              <ArrowLeft className="h-4 w-4" />
              <span>Back to {moduleName}</span>
            </Link>
          </Button>
        </div>

        {/* Right: Watched Toggle & Next Video Controls */}
        <div className="flex items-center gap-2.5 flex-1 sm:flex-initial sm:justify-end">
          {/* Watched Toggle Button */}
          <Button
            variant={optimisticWatched ? "outline" : "default"}
            onClick={handleToggle}
            disabled={isPending}
            className={`flex-1 sm:flex-initial h-11 rounded-xl gap-2 font-semibold shadow-sm transition-all active:scale-[0.98] text-xs ${
              optimisticWatched
                ? isIntensive
                  ? "border-amber-500/40 text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-400"
                  : "border-[#25A8A2]/40 text-[#25A8A2] bg-[#25A8A2]/10 hover:bg-[#25A8A2]/20 dark:border-[#25A8A2]/40 dark:bg-[#25A8A2]/15 dark:text-[#25A8A2]"
                : isIntensive
                ? "bg-amber-500 text-white hover:bg-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
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
            <span>
              {optimisticWatched ? "Marked as Watched" : "Mark as Watched"}
            </span>
          </Button>

          {/* Next Video Button (if available) */}
          {nextVideoId && (
            <Button
              asChild
              className={`flex-1 sm:flex-initial h-11 rounded-xl gap-2 font-semibold shadow-sm text-xs active:scale-[0.98] transition-all ${
                isIntensive
                  ? "bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-600"
                  : "bg-primary text-primary-foreground dark:bg-[#25A8A2] dark:text-white dark:hover:bg-[#20928D]"
              }`}
            >
              <Link href={`/watch/${nextVideoId}`}>
                <span>Next video</span>
                <SkipForward className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* ── Description Box ── */}
      {description && (
        <div className="rounded-2xl border border-border/60 bg-card/90 p-4 sm:p-5 shadow-sm backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820]">
          <div className="mb-2.5 flex items-center gap-2 font-heading font-bold text-sm tracking-tight text-foreground dark:text-[#E8EDF0]">
            <FileText
              className={`h-4 w-4 ${
                isIntensive
                  ? "text-amber-500"
                  : "text-muted-foreground dark:text-[#25A8A2]"
              }`}
            />
            <span>Description</span>
          </div>
          <p className="whitespace-pre-line text-xs sm:text-sm leading-relaxed text-muted-foreground dark:text-[#9AA7AE]">
            {description}
          </p>
        </div>
      )}
    </div>
  );
}
