"use client";

import * as React from "react";
import { VideoCard, type Video } from "@/components/dashboard/video-card";
import { KNOWN_PLAYLISTS, getPlaylistName } from "@/lib/youtube/playlists";
import { Progress } from "@/components/ui/progress";
import { formatHoursMinutes } from "@/lib/utils/format";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock,
  Folder,
  Layers,
  ListVideo,
  VideoOff,
} from "lucide-react";

interface PlaylistGroup {
  id: string;
  name: string;
  videos: Video[];
  totalDuration: number;
}

interface PlaylistViewProps {
  videos: Video[];
  watchedVideoIds: string[];
}

export function PlaylistView({ videos, watchedVideoIds }: PlaylistViewProps) {
  const [expandedPlaylists, setExpandedPlaylists] = React.useState<
    Record<string, boolean>
  >({});
  const [filterPlaylistId, setFilterPlaylistId] = React.useState<string>("all");

  const watchedSet = new Set(watchedVideoIds);

  // Group and sort videos by playlist, ensuring all known playlists are always included
  const groups = React.useMemo(() => {
    const map = new Map<string, Video[]>();

    // Pre-populate all 12 known playlists in fixed order
    KNOWN_PLAYLISTS.forEach((pl) => {
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
      vids.sort((a, b) => a.position - b.position);
      const totalDuration = vids.reduce(
        (acc, v) => acc + (v.duration || 0),
        0
      );
      result.push({
        id: pid,
        name: getPlaylistName(pid),
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
      // Expand only the selected course
      setExpandedPlaylists({ [id]: true });
    }
  };

  const displayedGroups =
    filterPlaylistId === "all"
      ? groups
      : groups.filter((g) => g.id === filterPlaylistId);

  return (
    <div className="space-y-6">
      {/* Top Filter Pills Bar */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border/40 pb-4">
        <button
          onClick={() => handleFilterClick("all")}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold tracking-tight transition-all duration-150 active:scale-95 ${
            filterPlaylistId === "all"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "border border-border/60 bg-card/80 text-muted-foreground hover:bg-accent hover:text-foreground backdrop-blur-sm"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>All ({groups.length})</span>
        </button>

        {groups.map((group) => {
          const groupWatchedCount = group.videos.filter((v) =>
            watchedSet.has(v.id)
          ).length;
          const isComplete =
            group.videos.length > 0 &&
            groupWatchedCount === group.videos.length;

          return (
            <button
              key={group.id}
              onClick={() => handleFilterClick(group.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium tracking-tight transition-all duration-150 active:scale-95 ${
                filterPlaylistId === group.id
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "border border-border/60 bg-card/80 text-muted-foreground hover:bg-accent hover:text-foreground backdrop-blur-sm"
              }`}
            >
              {isComplete ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <BookOpen className="h-3.5 w-3.5 opacity-60" />
              )}
              <span className="max-w-[150px] truncate">{group.name}</span>
              <span className="text-[10px] opacity-75 font-mono">
                ({group.videos.length})
              </span>
            </button>
          );
        })}
      </div>

      {/* Playlist Collapsible Cards */}
      <div className="space-y-3.5">
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
              className="overflow-hidden rounded-xl border border-border/60 bg-card/90 shadow-sm backdrop-blur-sm transition-all duration-200 ease-in-out hover:border-border hover:shadow-md"
            >
              {/* Interactive Playlist Header Card */}
              <div
                onClick={() => togglePlaylist(group.id)}
                className="group flex cursor-pointer flex-col gap-3.5 p-4.5 transition-colors hover:bg-accent/40 sm:flex-row sm:items-center sm:justify-between select-none"
              >
                {/* Left: Icon & Subject Title */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg shadow-sm transition-transform duration-200 group-hover:scale-105 ${
                      isComplete
                        ? "bg-emerald-600 text-white"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="h-4.5 w-4.5" />
                    ) : (
                      <Folder className="h-4.5 w-4.5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-heading text-base font-bold tracking-tight text-foreground truncate transition-colors">
                        {group.name}
                      </h2>
                    </div>

                    <div className="mt-0.5 flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground leading-relaxed">
                      <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                        <ListVideo className="h-3.5 w-3.5 text-muted-foreground" />
                        {group.videos.length} videos
                      </span>

                      {group.totalDuration > 0 && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {formatHoursMinutes(group.totalDuration)}
                          </span>
                        </>
                      )}

                      <span>•</span>
                      <span>
                        {group.videos.length > 0
                          ? `${groupWatchedCount} of ${group.videos.length} watched`
                          : "No videos uploaded yet"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Progress Bar & Chevron Indicator */}
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="flex items-center gap-2.5 flex-1 sm:w-44 sm:flex-initial">
                    <Progress
                      value={groupPercent}
                      className={`h-2 flex-1 ${
                        isComplete
                          ? "[&>div]:bg-emerald-600 dark:[&>div]:bg-emerald-400"
                          : ""
                      }`}
                    />
                    <span className="text-xs font-bold tabular-nums text-foreground/80 w-9 text-right font-mono">
                      {groupPercent}%
                    </span>
                  </div>

                  {/* Click to expand/collapse chevron button */}
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/30 transition-transform duration-200 ${
                      isExpanded
                        ? "rotate-180 bg-muted text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>

              {/* Expanded Content: Video Grid or Empty State */}
              {isExpanded && (
                <div className="border-t border-border/40 bg-muted/15 p-4.5">
                  {group.videos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-7 text-center">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <VideoOff className="h-4.5 w-4.5" />
                      </div>
                      <p className="mt-2 text-sm font-semibold tracking-tight text-foreground">
                        No videos in this playlist yet
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                        Upload videos to this YouTube playlist, then click &ldquo;Sync Now&rdquo; to populate it.
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
