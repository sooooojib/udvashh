import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { VideoPlayer } from "@/components/watch/video-player";
import { getPlaylistName } from "@/lib/youtube/playlists";

interface WatchPageProps {
  params: Promise<{ videoId: string }>;
}

export async function generateMetadata({
  params,
}: WatchPageProps): Promise<Metadata> {
  const { videoId } = await params;
  const rows = await sql`
    SELECT title FROM videos WHERE youtube_video_id = ${videoId} LIMIT 1
  `;
  const video = rows[0];

  return {
    title: video ? `${video.title} | অবনতি` : "Watch | অবনতি",
  };
}

export default async function WatchPage({ params }: WatchPageProps) {
  const { videoId } = await params;
  const session = await getSession();
  if (!session) redirect(`/login?redirectTo=/watch/${videoId}`);

  // Fetch the video by youtube_video_id
  const videoRows = await sql`
    SELECT * FROM videos WHERE youtube_video_id = ${videoId} LIMIT 1
  `;

  if (videoRows.length === 0) notFound();
  const video = videoRows[0];

  // Fetch watched status for this video
  const progressRows = await sql`
    SELECT watched FROM watch_progress
    WHERE user_id = ${session.id} AND video_id = ${video.id}
    LIMIT 1
  `;

  const isWatched = progressRows[0]?.watched === true;

  // Find all videos in the same playlist and sort naturally by class number
  const playlistRows = await sql`
    SELECT youtube_video_id, title, position FROM videos
    WHERE playlist_id = ${video.playlist_id}
  `;

  let nextVideoId: string | null = null;
  let videoPosition = video.position;

  if (playlistRows.length > 0) {
    const { compareVideos } = await import("@/lib/utils/format");
    playlistRows.sort(compareVideos as Parameters<typeof playlistRows.sort>[0]);

    const currentIndex = playlistRows.findIndex(
      (v) => v.youtube_video_id === video.youtube_video_id
    );

    if (currentIndex !== -1) {
      videoPosition = currentIndex;
      if (currentIndex + 1 < playlistRows.length) {
        nextVideoId = playlistRows[currentIndex + 1].youtube_video_id;
      }
    }
  }

  const { INTENSIVE_PLAYLISTS, getIntensivePlaylistName } = await import(
    "@/lib/youtube/intensive-playlists"
  );

  const isIntensive = INTENSIVE_PLAYLISTS.some(
    (p) => p.id === video.playlist_id
  );
  const moduleName = isIntensive ? "Intensive Classes" : "Live Classes";
  const moduleHref = isIntensive ? "/intensive-classes" : "/live-classes";
  const moduleType = isIntensive ? "intensive" : "live";
  const playlistName = isIntensive
    ? getIntensivePlaylistName(video.playlist_id)
    : getPlaylistName(video.playlist_id);

  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-10 animate-fade-in-up">
      <VideoPlayer
        videoId={video.id}
        youtubeVideoId={video.youtube_video_id}
        title={video.title}
        description={video.description}
        duration={video.duration}
        position={videoPosition}
        playlistName={playlistName}
        moduleName={moduleName}
        moduleHref={moduleHref}
        moduleType={moduleType}
        initialWatched={isWatched}
        nextVideoId={nextVideoId}
      />
    </main>
  );
}
