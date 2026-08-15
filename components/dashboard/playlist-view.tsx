"use client";

import * as React from "react";
import { VideoCard, type Video } from "@/components/dashboard/video-card";
import { KNOWN_PLAYLISTS, getPlaylistName } from "@/lib/youtube/playlists";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { formatHoursMinutes } from "@/lib/utils/format";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock,
  Folder,
  Layers,
  ListVideo,
  Play,
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

  // Group and sort videos by playlist
  const groups = React.useMemo(() => {
    const map = new Map<string, Video[]>();

    // Pre-populate known playlists in fixed order
    KNOWN_PLAYLISTS.forEach((pl) => {
      map.set(pl.id, []);
    });

    // Bucket videos
    videos.forEach((video) => {
      const pid = video.playlist_id || "uncategorized";
      if (!map.has(pid)) {
        map.set(pid, []);
      }
      map.get(pid)!.push(video);
    });

    const result: PlaylistGroup[] = [];

    map.forEach((vids, pid) => {
      if (vids.length > 0) {
        vids.sort((a, b) => a.position - b.position);
        const totalDuration = vids.reduce((acc, v) => acc + (v.duration || 0), 0);
        result.push({
          id: pid,
          name: getPlaylistName(pid),
          videos: vids,
          totalDuration,
        });
      }
    });

    return result;
  }, [videos]);

  const togglePlaylist = (id: string) => {
    setExpandedPlaylists((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    groups.forEach((g) => {
      allExpanded[g.id] = true;
    });
    setExpandedPlaylists(allExpanded);
  };

  const collapseAll = () => {
    setExpandedPlaylists({});
  };

  const displayedGroups =
    filterPlaylistId === "all"
      ? groups
      : groups.filter((g) => g.id === filterPlaylistId);

  const areAllExpanded =
    groups.length > 0 && groups.every((g) => expandedPlaylists[g.id]);

  return (
    <div className="space-y-6">
      {/* Top Filter Bar & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200/80 pb-4 dark:border-zinc-800">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterPlaylistId("all")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              filterPlaylistId === "all"
                ? "bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900"
                : "border border-zinc-200/80 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400 dark:hover:bg-zinc-800"
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
                onClick={() => {
                  setFilterPlaylistId(group.id);
                  // Automatically expand this playlist when selected via pill
                  setExpandedPlaylists((prev) => ({ ...prev, [group.id]: true }));
                }}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  filterPlaylistId === group.id
                    ? "bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900"
                    : "border border-zinc-200/80 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                {isComplete ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <BookOpen className="h-3.5 w-3.5 opacity-60" />
                )}
                <span className="max-w-[140px] truncate">{group.name}</span>
                <span className="text-[10px] opacity-70 font-mono">
                  ({group.videos.length})
                </span>
              </button>
            );
          })}
        </div>

        {/* Expand / Collapse All Toggle */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={areAllExpanded ? collapseAll : expandAll}
            className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 h-8 px-2.5"
          >
            {areAllExpanded ? "Collapse All" : "Expand All"}
          </Button>
        </div>
      </div>

      {/* Playlist Collapsible Cards */}
      <div className="space-y-4">
        {displayedGroups.map((group) => {
          const isExpanded =
            expandedPlaylists[group.id] ||
            (filterPlaylistId === group.id && expandedPlaylists[group.id] !== false);

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
              className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm transition-all duration-200 dark:border-zinc-800/80 dark:bg-zinc-950"
            >
              {/* Interactive Playlist Header Card */}
              <div
                onClick={() => togglePlaylist(group.id)}
                className="group flex cursor-pointer flex-col gap-4 p-5 transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 sm:flex-row sm:items-center sm:justify-between select-none"
              >
                {/* Left: Icon & Subject Title */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-transform duration-200 group-hover:scale-105 ${
                      isComplete
                        ? "bg-emerald-500 text-white"
                        : "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Folder className="h-5 w-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-zinc-700 dark:group-hover:text-zinc-200">
                        {group.name}
                      </h2>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="inline-flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-300">
                        <ListVideo className="h-3.5 w-3.5 text-zinc-400" />
                        {group.videos.length} videos
                      </span>

                      {group.totalDuration > 0 && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3 text-zinc-400" />
                            {formatHoursMinutes(group.totalDuration)}
                          </span>
                        </>
                      )}

                      <span>•</span>
                      <span>
                        {groupWatchedCount} of {group.videos.length} watched
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Progress Bar & Chevron Indicator */}
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="flex items-center gap-3 flex-1 sm:w-48 sm:flex-initial">
                    <Progress
                      value={groupPercent}
                      className={`h-2 flex-1 ${
                        isComplete
                          ? "[&>div]:bg-emerald-500 dark:[&>div]:bg-emerald-400"
                          : ""
                      }`}
                    />
                    <span className="text-xs font-bold tabular-nums text-zinc-700 dark:text-zinc-300 w-9 text-right">
                      {groupPercent}%
                    </span>
                  </div>

                  {/* Click to expand/collapse chevron button */}
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 transition-transform duration-300 dark:border-zinc-800 dark:bg-zinc-900 ${
                      isExpanded ? "rotate-180 bg-zinc-100 dark:bg-zinc-800" : ""
                    }`}
                  >
                    <ChevronDown className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                  </div>
                </div>
              </div>

              {/* Expanded Content: Video Grid */}
              {isExpanded && (
                <div className="border-t border-zinc-100 bg-zinc-50/40 p-5 dark:border-zinc-900 dark:bg-zinc-900/20">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {group.videos.map((video, idx) => (
                      <VideoCard
                        key={video.id}
                        video={video}
                        initialWatched={watchedSet.has(video.id)}
                        index={idx}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
