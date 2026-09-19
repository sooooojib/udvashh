"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { formatDuration } from "@/lib/utils/format";
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
    <section aria-labelledby="currently-watching-heading" className="space-y-3">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400 ring-1 ring-rose-500/20">
            <Play className="h-3 w-3 fill-current ml-0.5" />
          </div>
          <div className="flex items-center gap-2">
            <h2
              id="currently-watching-heading"
              className="font-heading text-sm sm:text-base font-bold tracking-tight text-foreground dark:text-[#E8EDF0]"
            >
              Currently Watching
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold text-rose-600 dark:bg-rose-500/15 dark:text-rose-400 border border-rose-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
              In Progress
            </span>
          </div>
        </div>

        <span className="text-[11px] sm:text-xs font-medium text-muted-foreground dark:text-[#9AA7AE]">
          {videoList.length} {videoList.length === 1 ? "lecture" : "lectures"}
        </span>
      </div>

      {/* ── Cards Grid (Full width on small screen, compact on larger screens) ── */}
      <div
        className={cn(
          "grid gap-3.5 w-full",
          videoList.length === 1 && "grid-cols-1 w-full sm:max-w-[340px]",
          videoList.length === 2 && "grid-cols-1 sm:grid-cols-2 w-full sm:max-w-[700px]",
          videoList.length >= 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full sm:max-w-[1050px]"
        )}
      >
        {videoList.map((video) => {
          const duration = video.duration || 0;
          const progress = video.progress_seconds || 0;
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
                "group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border/60 bg-card/90 shadow-2xs backdrop-blur-md transition-all duration-200 ease-in-out hover:shadow-sm dark:border-[#1F2C34] dark:bg-[#111820] w-full",
                isIntensive
                  ? "hover:border-amber-500/40 dark:hover:border-amber-500/50"
                  : isSubjectHacks
                  ? "hover:border-blue-500/40 dark:hover:border-blue-500/50"
                  : "hover:border-emerald-500/40 dark:hover:border-emerald-500/50"
              )}
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-video w-full overflow-hidden bg-muted/40 dark:bg-[#0A0F12]">
                <Link
                  href={resumeHref}
                  className="absolute inset-0 block"
                  aria-label={`Resume ${video.title}`}
                >
                  <Image
                    src={thumbnailUrl}
                    alt={video.title}
                    fill
                    sizes="(max-width: 640px) 100vw, 340px"
                    className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                    unoptimized={thumbnailUrl.includes("ytimg.com")}
                  />

                  {/* Hover Play Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center backdrop-blur-[1px]">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-zinc-900 shadow-lg transition-transform duration-200 group-hover:scale-110">
                      <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                    </div>
                  </div>

                  {/* Duration Badge */}
                  {duration > 0 && (
                    <div className="absolute bottom-1.5 right-1.5 rounded bg-black/85 px-1 py-0.5 text-[10px] font-mono font-medium text-white shadow-xs backdrop-blur-xs">
                      {formatDuration(duration)}
                    </div>
                  )}

                  {/* Micro Progress Bar pinned at the bottom of the thumbnail */}
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-black/50 backdrop-blur-xs">
                    <div
                      className={cn(
                        "h-full transition-all duration-300",
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

                {/* Remove from Currently Watching Cross Button */}
                <button
                  type="button"
                  onClick={(e) => handleRemove(video.id, e)}
                  disabled={removingId === video.id}
                  title="Remove from Currently Watching"
                  aria-label={`Remove "${video.title}" from Currently Watching`}
                  className="absolute top-1.5 right-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white/80 border border-white/20 hover:text-white hover:bg-black/90 hover:scale-110 active:scale-95 transition-all shadow-md backdrop-blur-xs cursor-pointer opacity-90 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                >
                  {removingId === video.id ? (
                    <Loader2 className="h-3 w-3 animate-spin text-white" />
                  ) : (
                    <X className="h-3.5 w-3.5 stroke-[2.5]" />
                  )}
                </button>
              </div>

              {/* Card Body (Compact & proportional) */}
              <div className="flex flex-1 flex-col justify-between p-3 space-y-2.5">
                <div className="space-y-1.5">
                  {/* Module & Playlist Category Tag */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider border",
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
                      <span className="text-[10px] text-muted-foreground dark:text-[#9AA7AE] truncate max-w-[150px]">
                        • {video.playlistName}
                      </span>
                    )}
                  </div>

                  {/* Video Title */}
                  <Link href={resumeHref} className="block group-hover:underline">
                    <h3
                      className={cn(
                        "font-heading text-xs sm:text-[13px] font-semibold tracking-tight text-foreground dark:text-[#E8EDF0] transition-colors line-clamp-1 leading-snug",
                        isIntensive
                          ? "group-hover:text-amber-600 dark:group-hover:text-amber-400"
                          : isSubjectHacks
                          ? "group-hover:text-blue-600 dark:group-hover:text-blue-400"
                          : "group-hover:text-emerald-600 dark:group-hover:text-emerald-400"
                      )}
                    >
                      {video.title}
                    </h3>
                  </Link>
                </div>

                {/* Time & Progress Info */}
                <div className="space-y-1.5 pt-1 border-t border-border/40 dark:border-[#1F2C34]">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground dark:text-[#9AA7AE]">
                    <span className="font-mono font-medium">
                      Left off at {formatDuration(progress)}
                    </span>
                    <span className="font-semibold text-foreground dark:text-[#E8EDF0]">
                      {percent}%
                    </span>
                  </div>

                  {/* Progress Bar in card body */}
                  <div className="h-1 w-full overflow-hidden rounded-full bg-muted/60 dark:bg-[#0A0F12]">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        isIntensive
                          ? "bg-amber-500"
                          : isSubjectHacks
                          ? "bg-blue-500"
                          : "bg-emerald-500"
                      )}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-0.5">
                  <Link
                    href={resumeHref}
                    className={cn(
                      "inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow-2xs transition-all duration-150 active:scale-[0.98]",
                      isIntensive
                        ? "bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500"
                        : isSubjectHacks
                        ? "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
                        : "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                    )}
                  >
                    <Play className="h-3 w-3 fill-current" />
                    <span>Resume Lecture</span>
                    <ArrowRight className="h-3 w-3 ml-auto opacity-70 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
