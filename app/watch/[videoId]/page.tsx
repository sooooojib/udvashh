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
    title: video ? `${video.title} | Udvash` : "Watch | Udvash",
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

  // Find the next video in the same playlist by position
  const { data: nextVideo } = await supabase
    .from("videos")
    .select("youtube_video_id")
    .eq("playlist_id", video.playlist_id)
    .gt("position", video.position)
    .order("position", { ascending: true })
    .limit(1)
    .single();

  const playlistName = getPlaylistName(video.playlist_id);

  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6 sm:px-6 md:py-10">
      <VideoPlayer
        videoId={video.id}
        youtubeVideoId={video.youtube_video_id}
        title={video.title}
        description={video.description}
        duration={video.duration}
        position={video.position}
        playlistName={playlistName}
        initialWatched={isWatched}
        nextVideoId={nextVideo?.youtube_video_id ?? null}
      />
    </main>
  );
}
