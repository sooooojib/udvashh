"use client";

import * as React from "react";
import { VideoCard, type Video } from "@/components/dashboard/video-card";
import { KNOWN_PLAYLISTS, getPlaylistName } from "@/lib/youtube/playlists";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  CheckCircle2,
  Folder,
  Layers,
  Sparkles,
} from "lucide-react";

interface PlaylistGroup {
  id: string;
  name: string;
  videos: Video[];
}

interface PlaylistViewProps {
  videos: Video[];
  watchedVideoIds: string[];
}

export function PlaylistView({ videos, watchedVideoIds }: PlaylistViewProps) {
  const [selectedFilter, setSelectedFilter] = React.useState<string>("all");
  const watchedSet = new Set(watchedVideoIds);

  // Group videos by playlist_id
  const groups = React.useMemo(() => {
    const map = new Map<string, Video[]>();

    // Initialize known playlists in order
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
        // Sort videos within playlist by position ascending
        vids.sort((a, b) => a.position - b.position);
        result.push({
          id: pid,
          name: getPlaylistName(pid),
          videos: vids,
        });
      }
    });

    return result;
  }, [videos]);

  const displayedGroups =
    selectedFilter === "all"
      ? groups
      : groups.filter((g) => g.id === selectedFilter);

  return (
    <div className="space-y-10">
      {/* Playlist Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200/80 pb-4 dark:border-zinc-800">
        <button
          onClick={() => setSelectedFilter("all")}
          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
            selectedFilter === "all"
              ? "bg-zinc-900 text-white shadow-md dark:bg-zinc-100 dark:text-zinc-900"
              : "border border-zinc-200/80 bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>All Playlists ({videos.length})</span>
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
              onClick={() => setSelectedFilter(group.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                selectedFilter === group.id
                  ? "bg-zinc-900 text-white shadow-md dark:bg-zinc-100 dark:text-zinc-900"
                  : "border border-zinc-200/80 bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              }`}
            >
              {isComplete ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <BookOpen className="h-3.5 w-3.5 opacity-70" />
              )}
              <span className="max-w-[200px] truncate">{group.name}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                  selectedFilter === group.id
                    ? "bg-white/20 text-white dark:bg-zinc-900/40 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                {group.videos.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Playlist Sections */}
      <div className="space-y-12">
        {displayedGroups.map((group) => {
          const groupWatchedCount = group.videos.filter((v) =>
            watchedSet.has(v.id)
          ).length;
          const groupPercent =
            group.videos.length > 0
              ? Math.round((groupWatchedCount / group.videos.length) * 100)
              : 0;

          return (
            <section
              key={group.id}
              className="space-y-5 rounded-3xl border border-zinc-200/80 bg-white/50 p-5 sm:p-7 shadow-sm backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-950/40"
            >
              {/* Section Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-100 pb-4 dark:border-zinc-900">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-md dark:bg-zinc-100 dark:text-zinc-900">
                    <Folder className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                      {group.name}
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {group.videos.length} video
                      {group.videos.length !== 1 ? "s" : ""} •{" "}
                      {groupWatchedCount} of {group.videos.length} completed
                    </p>
                  </div>
                </div>

                {/* Section Progress */}
                <div className="flex items-center gap-3 min-w-[160px] sm:max-w-xs w-full sm:w-auto">
                  <Progress
                    value={groupPercent}
                    className={`h-2 flex-1 ${
                      groupPercent === 100
                        ? "[&>div]:bg-emerald-500 dark:[&>div]:bg-emerald-400"
                        : ""
                    }`}
                  />
                  <span className="text-xs font-bold tabular-nums text-zinc-700 dark:text-zinc-300 w-9 text-right">
                    {groupPercent}%
                  </span>
                </div>
              </div>

              {/* Videos in this playlist */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pt-1">
                {group.videos.map((video, idx) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    initialWatched={watchedSet.has(video.id)}
                    index={idx}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
