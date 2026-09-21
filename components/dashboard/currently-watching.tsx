"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { formatDuration, formatHoursMinutes } from "@/lib/utils/format";
import {
  ArrowRight,
  Flame,
  Lightbulb,
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
    } catch (err) {
      // Revert optimistic removal
      setVideoList((prev) => [videoToRemove, ...prev]);
      toast.error("Failed to remove from Currently Watching");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <section aria-labelledby="currently-watching-heading" className="space-y-3.5">
      {/* ── Section Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400 ring-1 ring-rose-500/20 shadow-xs">
            <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
          </div>
          <div className="flex items-center gap-2">
            <h2
              id="currently-watching-heading"
              className="font-heading text-sm sm:text-base font-bold tracking-tight text-foreground dark:text-[#E8EDF0]"
            >
              Currently Watching
            </h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-rose-600 dark:bg-rose-500/15 dark:text-rose-400 border border-rose-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
              In Progress
            </span>
          </div>
        </div>

        <span className="text-[11px] sm:text-xs font-medium text-muted-foreground dark:text-[#9AA7AE]">
          {videoList.length} {videoList.length === 1 ? "lecture" : "lectures"}
        </span>
      </div>

      {/* ── Spacious Widescreen Streaming Cards Grid ── */}
      <div
        className={cn(
          "grid gap-4.5 w-full",
          videoList.length === 1 && "grid-cols-1 max-w-[460px]",
          videoList.length === 2 && "grid-cols-1 sm:grid-cols-2 max-w-[940px]",
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

          const isIntensive = video.moduleType === "intensive";
          const isSubjectHacks = video.moduleType === "subject-hacks";

          const resumeHref = `/watch/${video.youtube_video_id}?t=${progress}`;
          const fallbackThumbnail = `https://i.ytimg.com/vi/${video.youtube_video_id}/hqdefault.jpg`;
          const thumbnailUrl = video.thumbnail_url || fallbackThumbnail;

          return (
            <div
              key={video.id}
              className={cn(
                "group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card/90 dark:border-[#1F2C34] dark:bg-[#111820]/95 backdrop-blur-xl p-3.5 space-y-3 transition-all duration-300 hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/30 hover:-translate-y-1 w-full",
                isIntensive
                  ? "hover:border-amber-500/50 dark:hover:border-amber-500/50"
                  : isSubjectHacks
                  ? "hover:border-blue-500/50 dark:hover:border-blue-500/50"
                  : "hover:border-emerald-500/50 dark:hover:border-emerald-500/50"
              )}
            >
              {/* Ambient Background Glow matching module color on hover */}
              <div
                className={cn(
                  "pointer-events-none absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl",
                  isIntensive
                    ? "bg-amber-500/10"
                    : isSubjectHacks
                    ? "bg-blue-500/10"
                    : "bg-emerald-500/10"
                )}
              />

              {/* ── Top: Full-Width 16:9 Thumbnail ── */}
              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black/20 dark:bg-black/40 shadow-xs ring-1 ring-black/5 dark:ring-white/5">
                <Link
                  href={resumeHref}
                  className="absolute inset-0 block"
                  aria-label={`Resume ${video.title}`}
                >
                  <Image
                    src={thumbnailUrl}
                    alt={video.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 420px"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    unoptimized={thumbnailUrl.includes("ytimg.com")}
                  />

                  {/* Subtle Vignette Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                  {/* Center Frosted Glass Play Button on Hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-[1.5px] bg-black/20">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-zinc-950 shadow-2xl transition-transform duration-300 group-hover:scale-110">
                      <Play className="h-4.5 w-4.5 fill-current ml-0.5" />
                    </div>
                  </div>

                  {/* Duration Badge */}
                  {duration > 0 && (
                    <div className="absolute bottom-2.5 right-2 rounded-md bg-black/85 px-1.5 py-0.5 text-[10px] font-mono font-medium text-white shadow-xs backdrop-blur-md border border-white/10">
                      {formatDuration(duration)}
                    </div>
                  )}

                  {/* Ambient Bottom Edge Accent Line */}
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-black/60 backdrop-blur-xs">
                    <div
                      className={cn(
                        "h-full transition-all duration-300 ease-out",
                        isIntensive
                          ? "bg-amber-500"
                          : isSubjectHacks
                          ? "bg-blue-500"
                          : "bg-emerald-500"
                      )}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </Link>

                {/* Remove [X] Button floating with dark glass */}
                <button
                  type="button"
                  onClick={(e) => handleRemove(video.id, e)}
                  disabled={removingId === video.id}
                  title="Remove from Currently Watching"
                  aria-label={`Remove "${video.title}" from Currently Watching`}
                  className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white/80 border border-white/15 hover:text-white hover:bg-black/90 hover:scale-110 active:scale-95 transition-all shadow-md backdrop-blur-md cursor-pointer"
                >
                  {removingId === video.id ? (
                    <Loader2 className="h-3 w-3 animate-spin text-white" />
                  ) : (
                    <X className="h-3.5 w-3.5 stroke-[2.2]" />
                  )}
                </button>
              </div>

              {/* ── Bottom: Spacious Metadata & Full-Width Timeline ── */}
              <div className="relative flex flex-1 flex-col justify-between space-y-3 pt-0.5">
                {/* Category Tag & Module Header */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider border",
                      isIntensive
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        : isSubjectHacks
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    )}
                  >
                    {isIntensive ? (
                      <Flame className="h-2.5 w-2.5" />
                    ) : isSubjectHacks ? (
                      <Lightbulb className="h-2.5 w-2.5" />
                    ) : (
                      <Tv className="h-2.5 w-2.5" />
                    )}
                    <span>{video.moduleName}</span>
                  </span>

                  {video.playlistName && (
                    <span className="text-xs text-muted-foreground dark:text-[#9AA7AE] truncate max-w-[220px]">
                      • {video.playlistName}
                    </span>
                  )}
                </div>

                {/* Video Title */}
                <div>
                  <Link href={resumeHref} className="block group/title">
                    <h3
                      className={cn(
                        "font-heading text-[15px] font-bold tracking-tight text-foreground dark:text-[#E8EDF0] line-clamp-1 leading-snug transition-colors",
                        isIntensive
                          ? "group-hover/title:text-amber-600 dark:group-hover/title:text-amber-400"
                          : isSubjectHacks
                          ? "group-hover/title:text-blue-600 dark:group-hover/title:text-blue-400"
                          : "group-hover/title:text-emerald-600 dark:group-hover/title:text-emerald-400"
                      )}
                    >
                      {video.title}
                    </h3>
                  </Link>
                </div>

                {/* ── Full-Width Prominent Timeline & Progress Track ── */}
                <div className="space-y-1.5 pt-1 border-t border-border/40 dark:border-[#1F2C34]/80">
                  <div className="flex items-center justify-between text-xs text-muted-foreground dark:text-[#9AA7AE]">
                    <span className="font-medium">
                      Left off at{" "}
                      <span className="font-mono text-foreground/90 dark:text-[#E8EDF0] font-semibold">
                        {formatDuration(progress)}
                      </span>
                      {remainingSeconds > 0 && (
                        <span className="opacity-80 font-sans">
                          {" "}
                          • {formatHoursMinutes(remainingSeconds)} left
                        </span>
                      )}
                    </span>
                    <span className="font-mono font-bold text-foreground dark:text-[#E8EDF0]">
                      {percent}%
                    </span>
                  </div>

                  {/* Thick, high-contrast glowing progress track spanning 100% of card width */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted/70 dark:bg-[#1E293B]">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300 ease-out",
                        isIntensive
                          ? "bg-gradient-to-r from-amber-500 to-orange-400 shadow-[0_0_10px_rgba(245,158,11,0.6)]"
                          : isSubjectHacks
                          ? "bg-gradient-to-r from-blue-500 to-indigo-400 shadow-[0_0_10px_rgba(37,99,235,0.6)]"
                          : "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.6)]"
                      )}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Bottom Row: Sleek Resume Button & Total Duration */}
                <div className="pt-1 flex items-center justify-between gap-2">
                  <Link
                    href={resumeHref}
                    className={cn(
                      "group/btn inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-xs transition-all duration-200 active:scale-95 hover:shadow-md",
                      isIntensive
                        ? "bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-500 dark:text-zinc-950 dark:hover:bg-amber-400 hover:shadow-amber-500/25 font-medium dark:font-bold"
                        : isSubjectHacks
                        ? "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:text-white dark:hover:bg-blue-400 hover:shadow-blue-500/25 font-medium dark:font-bold"
                        : "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400 hover:shadow-emerald-500/25 font-medium dark:font-bold"
                    )}
                  >
                    <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                    <span>Resume Lecture</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5 opacity-80" />
                  </Link>

                  <span className="text-xs font-mono text-muted-foreground/80">
                    {formatDuration(progress)} / {formatDuration(duration)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

