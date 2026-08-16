"use client";

import * as React from "react";
import { VideoCard, type Video } from "@/components/dashboard/video-card";
import {
  INTENSIVE_PLAYLISTS,
  getIntensivePlaylistName,
} from "@/lib/youtube/intensive-playlists";
import { Progress } from "@/components/ui/progress";
import { formatHoursMinutes, compareVideos } from "@/lib/utils/format";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock,
  Layers,
  ListVideo,
  Play,
  VideoOff,
} from "lucide-react";

interface PlaylistGroup {
  id: string;
  name: string;
  videos: Video[];
  totalDuration: number;
}

interface IntensivePlaylistViewProps {
  videos: Video[];
  watchedVideoIds: string[];
}

export function IntensivePlaylistView({
  videos,
  watchedVideoIds,
}: IntensivePlaylistViewProps) {
  const [expandedPlaylists, setExpandedPlaylists] = React.useState<
    Record<string, boolean>
  >({});
  const [filterPlaylistId, setFilterPlaylistId] =
    React.useState<string>("all");

  const watchedSet = new Set(watchedVideoIds);

  // Group and sort videos by playlist
  const groups = React.useMemo(() => {
    const map = new Map<string, Video[]>();

    // Pre-populate all intensive playlists in fixed order
    INTENSIVE_PLAYLISTS.forEach((pl) => {
      map.set(pl.id, []);
    });

    // Bucket videos into their playlist
    videos.forEach((video) => {
      const pid = video.playlist_id || "uncategorized";
      if (!map.has(pid)) {
        map.set(pid, []);
      }
      map.get(pid)!.push(video);
    });

    const result: PlaylistGroup[] = [];

    map.forEach((vids, pid) => {
      vids.sort(compareVideos);
      const totalDuration = vids.reduce(
        (acc, v) => acc + (v.duration || 0),
        0
      );
      result.push({
        id: pid,
        name: getIntensivePlaylistName(pid),
        videos: vids,
        totalDuration,
      });
    });

    return result;
  }, [videos]);

  const togglePlaylist = (id: string) => {
    setExpandedPlaylists((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleFilterClick = (id: string) => {
    setFilterPlaylistId(id);
    if (id === "all") {
      setExpandedPlaylists({});
    } else {
      setExpandedPlaylists({ [id]: true });
    }
  };

  const displayedGroups =
    filterPlaylistId === "all"
      ? groups
      : groups.filter((g) => g.id === filterPlaylistId);

  return (
    <div className="space-y-6">
      {/* Top Filter Pills Bar — Amber accent, horizontal scroll on mobile */}
      <div className="pills-row gap-2 border-b border-border/40 pb-4 dark:border-[#1F2C34]/80 lg:flex-wrap">
        <button
          onClick={() => handleFilterClick("all")}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold tracking-tight transition-all duration-200 active:scale-95 min-h-[44px] ${
            filterPlaylistId === "all"
              ? "bg-amber-500/15 text-amber-600 border border-amber-500/50 shadow-[0_0_12px_rgba(217,119,6,0.15)] font-medium dark:text-amber-400"
              : "border border-border/60 bg-card/80 text-muted-foreground hover:border-amber-500/40 hover:text-foreground dark:border-[#1F2C34] dark:bg-[#111820] dark:text-[#9AA7AE] dark:hover:border-amber-500/40 dark:hover:text-[#E8EDF0]"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>All</span>
          <span className="font-mono text-[11px] opacity-80">
            ({groups.length})
          </span>
        </button>

        {groups.map((group) => {
          const groupWatchedCount = group.videos.filter((v) =>
            watchedSet.has(v.id)
          ).length;
          const isComplete =
            group.videos.length > 0 &&
            groupWatchedCount === group.videos.length;

          const isSelected = filterPlaylistId === group.id;

          return (
            <button
              key={group.id}
              onClick={() => handleFilterClick(group.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs tracking-tight transition-all duration-200 active:scale-95 min-h-[44px] ${
                isSelected
                  ? "bg-amber-500/15 text-amber-600 border border-amber-500/50 shadow-[0_0_12px_rgba(217,119,6,0.15)] font-semibold dark:text-amber-400"
                  : "border border-border/60 bg-card/80 text-muted-foreground hover:border-amber-500/40 hover:text-foreground dark:border-[#1F2C34] dark:bg-[#111820] dark:text-[#9AA7AE] dark:hover:border-amber-500/40 dark:hover:text-[#E8EDF0]"
              }`}
            >
              {isComplete ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-500" />
              ) : (
                <BookOpen className="h-3.5 w-3.5 opacity-60" />
              )}
              <span className="max-w-[160px] truncate">{group.name}</span>
              <span className="text-[11px] opacity-75 font-mono">
                ({group.videos.length})
              </span>
            </button>
          );
        })}
      </div>

      {/* Playlist Collapsible Cards — Amber accent */}
      <div className="space-y-4">
        {displayedGroups.map((group) => {
          const isExpanded = !!expandedPlaylists[group.id];

          const groupWatchedCount = group.videos.filter((v) =>
            watchedSet.has(v.id)
          ).length;
          const groupPercent =
            group.videos.length > 0
              ? Math.round((groupWatchedCount / group.videos.length) * 100)
              : 0;
          const isComplete =
            group.videos.length > 0 &&
            groupWatchedCount === group.videos.length;

          return (
            <div
              key={group.id}
              className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-sm backdrop-blur-md transition-all duration-200 ease-in-out dark:border-[#1F2C34] dark:bg-[#111820] dark:hover:border-amber-500/50 hover:shadow-md"
            >
              {/* Interactive Playlist Header Card */}
              <div
                onClick={() => togglePlaylist(group.id)}
                className="group flex cursor-pointer flex-col gap-4 p-5 transition-colors hover:bg-accent/40 dark:hover:bg-[#141E28] sm:flex-row sm:items-center sm:justify-between select-none active:bg-accent/60 dark:active:bg-[#1F2C34] min-h-[72px]"
              >
                {/* Left: Icon & Title */}
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm transition-transform duration-200 group-hover:scale-105 ${
                      isComplete
                        ? "bg-amber-500 text-white shadow-[0_0_12px_rgba(217,119,6,0.4)]"
                        : "bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400"
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Play className="h-4.5 w-4.5 fill-current ml-0.5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-heading text-base font-bold tracking-tight text-foreground dark:text-[#E8EDF0] truncate transition-colors group-hover:text-amber-600 dark:group-hover:text-amber-400">
                        {group.name}
                      </h2>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground dark:text-[#9AA7AE] leading-relaxed">
                      <span className="inline-flex items-center gap-1 font-medium text-foreground/80 dark:text-[#E8EDF0]">
                        <ListVideo className="h-3.5 w-3.5 text-muted-foreground dark:text-[#5C6A72]" />
                        <span className="font-mono">
                          {group.videos.length}
                        </span>{" "}
                        videos
                      </span>

                      {group.totalDuration > 0 && (
                        <>
                          <span className="text-muted-foreground/40">•</span>
                          <span className="inline-flex items-center gap-1 font-mono">
                            <Clock className="h-3 w-3 text-muted-foreground dark:text-[#5C6A72]" />
                            {formatHoursMinutes(group.totalDuration)}
                          </span>
                        </>
                      )}

                      <span className="text-muted-foreground/40">•</span>
                      <span className="font-mono text-[11px]">
                        {group.videos.length > 0
                          ? `${groupWatchedCount} of ${group.videos.length} watched`
                          : "No videos uploaded yet"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Progress Bar & Chevron */}
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="flex items-center gap-3 flex-1 sm:w-48 sm:flex-initial">
                    <Progress
                      value={groupPercent}
                      className="h-2 flex-1 rounded-full bg-muted/60 dark:bg-[#141E28] [&>div]:bg-amber-500 [&>div]:transition-all [&>div]:duration-500"
                    />
                    <span className="text-xs font-bold tabular-nums text-foreground dark:text-[#E8EDF0] w-9 text-right font-mono">
                      {groupPercent}%
                    </span>
                  </div>

                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40 transition-transform duration-200 dark:border-[#1F2C34] dark:bg-[#141E28] ${
                      isExpanded
                        ? "rotate-180 bg-muted dark:bg-[#1F2C34] text-foreground dark:text-amber-400"
                        : "text-muted-foreground dark:text-[#9AA7AE]"
                    }`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border/40 bg-muted/15 p-4 sm:p-5 dark:border-[#1F2C34]/70 dark:bg-[#0A0F12]/60 animate-fade-in-up video-grid-container">
                  {group.videos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground dark:bg-[#141E28] dark:text-[#5C6A72]">
                        <VideoOff className="h-5 w-5" />
                      </div>
                      <p className="mt-2 text-sm font-semibold tracking-tight text-foreground dark:text-[#E8EDF0]">
                        No videos in this playlist yet
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground dark:text-[#9AA7AE] leading-relaxed">
                        Upload videos to this YouTube playlist, then click
                        &ldquo;Sync Now&rdquo; to populate it.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {group.videos.map((video, idx) => (
                        <VideoCard
                          key={video.id}
                          video={video}
                          initialWatched={watchedSet.has(video.id)}
                          index={idx}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
