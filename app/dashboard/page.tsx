import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { VideoCard, type Video } from "@/components/dashboard/video-card";
import { WatchProgressBar } from "@/components/dashboard/progress-bar";
import { OwnerSyncButton, type Playlist } from "@/components/dashboard/sync-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlaySquare, VideoOff } from "lucide-react";

const KNOWN_PLAYLISTS: Playlist[] = [
  { id: "PLDJLm9cIb9hg", name: "Playlist 1" },
  { id: "PLO7MJY6H3NDM", name: "Playlist 2" },
  { id: "PLAGl1YvIlysU", name: "Playlist 3" },
  { id: "PLFrZE8Zvdygk", name: "Playlist 4" },
  { id: "PLQt32jtf0y2o", name: "Playlist 5" },
  { id: "PLK1y2_naWSd8", name: "Playlist 6" },
  { id: "PLY5ga8LFlsGk", name: "Playlist 7" },
];

export default async function DashboardPage() {
  const supabase = await createClient();

  // Auth guard
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/dashboard");

  const adminEmail = process.env.ADMIN_EMAIL;
  const isOwner =
    !adminEmail || user.email?.toLowerCase() === adminEmail.toLowerCase();

  // Fetch all videos ordered by position
  const { data: videos } = await supabase
    .from("videos")
    .select("*")
    .order("position", { ascending: true });

  // Fetch user's watch progress
  const { data: progressRows } = await supabase
    .from("watch_progress")
    .select("video_id, watched")
    .eq("user_id", user.id)
    .eq("watched", true);

  const watchedSet = new Set(
    (progressRows ?? []).map((r: { video_id: string }) => r.video_id)
  );

  const videoList: Video[] = videos ?? [];
  const watchedCount = videoList.filter((v) => watchedSet.has(v.id)).length;

  return (
    <main className="flex-1 p-4 sm:p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            My Videos
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {videoList.length} videos across {KNOWN_PLAYLISTS.length} playlists
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      {videoList.length > 0 && (
        <WatchProgressBar total={videoList.length} watched={watchedCount} />
      )}

      {/* Owner Sync Panel */}
      {isOwner && (
        <Card className="overflow-hidden border-zinc-200/80 shadow-sm dark:border-zinc-800">
          <div className="h-1 w-full bg-gradient-to-r from-red-500 via-red-600 to-rose-500" />
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white">
                <PlaySquare className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  YouTube Quick Sync
                </CardTitle>
                <CardDescription className="text-xs">
                  Owner only — pull latest videos from YouTube
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <OwnerSyncButton playlists={KNOWN_PLAYLISTS} />
          </CardContent>
        </Card>
      )}

      {/* Video Grid */}
      {videoList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 py-24 dark:border-zinc-800 dark:bg-zinc-900/20">
          <VideoOff className="h-10 w-10 text-zinc-300 dark:text-zinc-700" />
          <p className="mt-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            No videos found
          </p>
          {isOwner && (
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-600">
              Use the Sync button above to pull videos from YouTube.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videoList.map((video, index) => (
            <VideoCard
              key={video.id}
              video={video}
              initialWatched={watchedSet.has(video.id)}
              index={index}
            />
          ))}
        </div>
      )}
    </main>
  );
}
