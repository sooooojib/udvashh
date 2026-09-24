"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { formatDuration } from "@/lib/utils/format";
import {
  Clock,
  Loader2,
  Play,
  Tv,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  removeFromCurrentlyWatching,
  updatePlaybackProgress,
} from "@/app/actions/progress";

export interface CurrentlyWatchingVideo {
  id: string;
  youtube_video_id: string;
  title: string;
  thumbnail_url: string | null;
  duration: number;
  playlist_id: string | null;
  progress_seconds: number;
  last_watched_at: string | null;
  updated_at: string;
  moduleName: string;
  moduleHref: string;
  moduleType: "live" | "intensive" | "subject-hacks";
  playlistName: string;
}

interface CurrentlyWatchingProps {
  videos: CurrentlyWatchingVideo[];
}

/**
 * Module-specific themes aligning with the main dashboard design system
 */
const moduleThemes: Record<
  "live" | "intensive" | "subject-hacks",
  {
    badge: string;
    progress: string;
    hoverBorder: string;
  }
> = {
  live: {
    badge: "text-emerald-400",
    progress: "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]",
    hoverBorder: "hover:border-emerald-500/50 dark:hover:border-emerald-500/60",
  },
  intensive: {
    badge: "text-amber-400",
    progress: "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]",
    hoverBorder: "hover:border-amber-500/50 dark:hover:border-amber-500/60",
  },
  "subject-hacks": {
    badge: "text-blue-400",
    progress: "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]",
    hoverBorder: "hover:border-blue-500/50 dark:hover:border-blue-500/60",
  },
};

/**
 * Formats seconds left into clean streaming format (e.g. "2m left", "2h 20m left")
 */
function formatTimeLeft(seconds: number): string {
  if (seconds <= 0) return "Finished";
  if (seconds < 60) return "< 1m left";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m left` : `${hours}h left`;
  }
  return `${minutes}m left`;
}

/**
 * Extracts clean title and category badge
 */
function parseVideoMeta(title: string, moduleType: string, playlistName?: string) {
  let cleanTitle = title
    .replace(/^Live Class\s+/i, "")
    .replace(/^Daily Live Exam\s+/i, "")
    .replace(/^Intensive Class\s+/i, "")
    .replace(/^Subject Hacks?\s+/i, "")
    .trim();

  if (!cleanTitle || /^\d+$/.test(cleanTitle)) {
    cleanTitle = playlistName || title;
  }

  let typeTag = "SERIES";
  if (moduleType === "live") typeTag = "LIVE CLASS";
  else if (moduleType === "intensive") typeTag = "INTENSIVE";
  else if (moduleType === "subject-hacks") typeTag = "HACKS";

  return {
    cleanTitle,
    typeTag,
  };
}

export function CurrentlyWatching({ videos }: CurrentlyWatchingProps) {
  const [videoList, setVideoList] = React.useState<CurrentlyWatchingVideo[]>(videos);
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setVideoList(videos);
  }, [videos]);

  if (!videoList || videoList.length === 0) {
    return null;
  }

  const handleRemove = async (videoId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const videoToRemove = videoList.find((v) => v.id === videoId);
    if (!videoToRemove) return;

    setRemovingId(videoId);

    // Optimistically remove from UI
    setVideoList((prev) => prev.filter((v) => v.id !== videoId));

    try {
      const res = await removeFromCurrentlyWatching(videoId);
      if (!res.success) {
        throw new Error(res.error || "Failed to remove");
      }

      toast.success("Removed from Currently Watching", {
        description: videoToRemove.title,
        action: {
          label: "Undo",
          onClick: async () => {
            setVideoList((prev) => [videoToRemove, ...prev]);
            await updatePlaybackProgress(
              videoToRemove.id,
              videoToRemove.progress_seconds,
              videoToRemove.duration
            );
          },
        },
      });
    } catch {
      // Revert optimistic removal
      setVideoList((prev) => [videoToRemove, ...prev]);
      toast.error("Failed to remove from Currently Watching");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <section aria-labelledby="currently-watching-heading" className="space-y-3.5">
      {/* ── Section Header (Matched to Dashboard Styling) ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-[#25A8A2]/15 dark:text-[#25A8A2] ring-1 ring-primary/25 shadow-xs">
            <Tv className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2">
            <h2
              id="currently-watching-heading"
              className="font-heading text-base font-bold tracking-tight text-foreground dark:text-[#E8EDF0]"
            >
              Currently Watching
            </h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary dark:bg-[#25A8A2]/15 dark:text-[#25A8A2] border border-primary/20">
              <span className="h-1.5 w-1.5 rounded-full bg-primary dark:bg-[#25A8A2] animate-pulse" />
              In Progress
            </span>
          </div>
        </div>

        {/* Right: Lecture Count */}
        <span className="text-[11px] sm:text-xs font-medium text-muted-foreground dark:text-[#9AA7AE]">
          {videoList.length} {videoList.length === 1 ? "lecture" : "lectures"}
        </span>
      </div>

      {/* ── Cinematic 16:9 Grid ── */}
      <div
        className={cn(
          "grid gap-4.5 w-full",
          videoList.length === 1 && "grid-cols-1 max-w-[500px]",
          videoList.length === 2 && "grid-cols-1 sm:grid-cols-2 max-w-[1020px]",
          videoList.length >= 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        )}
      >
        {videoList.map((video) => {
          const duration = video.duration || 0;
          const progress = video.progress_seconds || 0;
          const remainingSeconds = Math.max(0, duration - progress);
          const percent =
            duration > 0
              ? Math.min(100, Math.max(1, Math.round((progress / duration) * 100)))
              : 0;

          const resumeHref = `/watch/${video.youtube_video_id}?t=${progress}`;
          const fallbackThumbnail = `https://i.ytimg.com/vi/${video.youtube_video_id}/hqdefault.jpg`;
          const thumbnailUrl = video.thumbnail_url || fallbackThumbnail;

          const theme = moduleThemes[video.moduleType] || moduleThemes.live;
          const { cleanTitle, typeTag } = parseVideoMeta(
            video.title,
            video.moduleType,
            video.playlistName
          );

          return (
            <div
              key={video.id}
              className={cn(
                "group relative aspect-video w-full overflow-hidden rounded-2xl border border-border/60 dark:border-[#1F2C34] bg-card/90 dark:bg-[#111820] shadow-sm backdrop-blur-md transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
                theme.hoverBorder
              )}
            >
              <Link
                href={resumeHref}
                className="absolute inset-0 block"
                aria-label={`Resume ${cleanTitle}`}
              >
                {/* Background Image */}
                <Image
                  src={thumbnailUrl}
                  alt={cleanTitle}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 420px"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  unoptimized={thumbnailUrl.includes("ytimg.com")}
                />

                {/* Dark Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                {/* Centered Frosted Play Button on Hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-[1px] bg-black/20">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-zinc-950 shadow-xl transition-transform duration-300 group-hover:scale-110">
                    <Play className="h-5 w-5 fill-current ml-0.5" />
                  </div>
                </div>

                {/* Duration Badge */}
                {duration > 0 && (
                  <div className="absolute top-3 left-3 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-mono font-medium text-white/90 shadow-xs backdrop-blur-md border border-white/15">
                    {formatDuration(duration)}
                  </div>
                )}

                {/* Content Overlay at the Bottom */}
                <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4 pb-3 space-y-1 z-10">
                  {/* Title */}
                  <h3 className="font-heading text-sm sm:text-base font-bold tracking-tight text-white line-clamp-1 leading-snug drop-shadow-sm transition-colors">
                    {cleanTitle}
                  </h3>

                  {/* Metadata Line: LIVE CLASS · 🕒 2h 20m left */}
                  <div className="flex items-center gap-2 text-xs flex-wrap font-sans text-zinc-300">
                    <span
                      className={cn(
                        "font-bold uppercase tracking-wider text-[11px] shrink-0 drop-shadow-xs",
                        theme.badge
                      )}
                    >
                      {typeTag}
                    </span>

                    <span className="text-zinc-500">·</span>

                    <span className="inline-flex items-center gap-1.5 text-zinc-300 shrink-0 font-medium">
                      <Clock className="h-3 w-3 shrink-0" />
                      <span>{formatTimeLeft(remainingSeconds)}</span>
                    </span>
                  </div>
                </div>

                {/* ── Embedded Progress Bar at the very bottom edge ── */}
                <div className="absolute bottom-0 inset-x-0 h-1 sm:h-1.5 bg-black/50 backdrop-blur-xs overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-300 ease-out",
                      theme.progress
                    )}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </Link>

              {/* Dismiss [X] Button */}
              <button
                type="button"
                onClick={(e) => handleRemove(video.id, e)}
                disabled={removingId === video.id}
                title="Remove from Currently Watching"
                aria-label={`Remove "${cleanTitle}" from Currently Watching`}
                className="absolute top-2.5 right-2.5 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white/80 border border-white/20 hover:text-white hover:bg-black/90 hover:scale-110 active:scale-95 transition-all shadow-md backdrop-blur-md cursor-pointer"
              >
                {removingId === video.id ? (
                  <Loader2 className="h-3 w-3 animate-spin text-white" />
                ) : (
                  <X className="h-3.5 w-3.5 stroke-[2.2]" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
