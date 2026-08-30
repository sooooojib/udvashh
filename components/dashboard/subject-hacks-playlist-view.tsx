"use client";

import * as React from "react";
import { VideoCard, type Video } from "@/components/dashboard/video-card";
import { VideoOff } from "lucide-react";
import { compareVideos } from "@/lib/utils/format";

interface SubjectHacksPlaylistViewProps {
  videos: Video[];
  watchedVideoIds: string[];
}

export function SubjectHacksPlaylistView({
  videos,
  watchedVideoIds,
}: SubjectHacksPlaylistViewProps) {
  const watchedSet = new Set(watchedVideoIds);

  const sortedVideos = React.useMemo(() => {
    return [...videos].sort(compareVideos);
  }, [videos]);

  if (sortedVideos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-fuchsia-500/20 bg-card/50 py-20 backdrop-blur-md dark:border-fuchsia-500/15 dark:bg-[#111820]/40">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-fuchsia-500/10 text-fuchsia-500 dark:text-fuchsia-400 mb-3">
          <VideoOff className="h-7 w-7" />
        </div>
        <p className="text-sm font-semibold tracking-tight text-foreground dark:text-[#E8EDF0]">
          No videos found
        </p>
      </div>
    );
  }

  return (
    /* Mobile: 1 col, sm: 2 col, lg: 3 col, xl: 4 col, 2xl: 5 col */
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {sortedVideos.map((video, idx) => (
        <VideoCard
          key={video.id}
          video={video}
          initialWatched={watchedSet.has(video.id)}
          index={idx}
        />
      ))}
    </div>
  );
}
