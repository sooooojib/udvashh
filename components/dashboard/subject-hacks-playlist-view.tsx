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
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/50 py-20 backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820]/40">
        <VideoOff className="h-9 w-9 text-muted-foreground/50 dark:text-[#5C6A72]" />
        <p className="mt-3 text-sm font-semibold tracking-tight text-foreground dark:text-[#E8EDF0]">
          No videos found
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
