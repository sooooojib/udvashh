import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { VideoPlayer } from "@/components/watch/video-player";
import { getPlaylistName } from "@/lib/youtube/playlists";

interface WatchPageProps {
  params: Promise<{ videoId: string }>;
}

export async function generateMetadata({
  params,
}: WatchPageProps): Promise<Metadata> {
  const { videoId } = await params;
  const supabase = await createClient();
  const { data: video } = await supabase
    .from("videos")
    .select("title")
    .eq("youtube_video_id", videoId)
    .single();

  return {
    title: video ? `${video.title} | অবনতি` : "Watch | অবনতি",
  };
}

export default async function WatchPage({ params }: WatchPageProps) {
  const { videoId } = await params;
  const supabase = await createClient();

  // Auth guard
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=/watch/${videoId}`);

  // Fetch the video by youtube_video_id
  const { data: video } = await supabase
    .from("videos")
    .select("*")
    .eq("youtube_video_id", videoId)
    .single();

  if (!video) notFound();

  // Fetch watched status for this video
  const { data: progress } = await supabase
    .from("watch_progress")
    .select("watched")
    .eq("user_id", user.id)
    .eq("video_id", video.id)
    .single();

  const isWatched = progress?.watched === true;

  // Find all videos in the same playlist and sort naturally by class number
  const { data: playlistVideos } = await supabase
    .from("videos")
    .select("youtube_video_id, title, position")
    .eq("playlist_id", video.playlist_id);

  let nextVideoId: string | null = null;
  let videoPosition = video.position;

  if (playlistVideos && playlistVideos.length > 0) {
    const { compareVideos } = await import("@/lib/utils/format");
    playlistVideos.sort(compareVideos);

    const currentIndex = playlistVideos.findIndex(
      (v) => v.youtube_video_id === video.youtube_video_id
    );

    if (currentIndex !== -1) {
      videoPosition = currentIndex;
      if (currentIndex + 1 < playlistVideos.length) {
        nextVideoId = playlistVideos[currentIndex + 1].youtube_video_id;
      }
    }
  }

  const playlistName = getPlaylistName(video.playlist_id);

  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-0 sm:px-6 py-4 sm:py-6 md:py-10 animate-fade-in-up overflow-x-hidden">
      <VideoPlayer
        videoId={video.id}
        youtubeVideoId={video.youtube_video_id}
        title={video.title}
        description={video.description}
        duration={video.duration}
        position={videoPosition}
        playlistName={playlistName}
        initialWatched={isWatched}
        nextVideoId={nextVideoId}
      />
    </main>
  );
}
