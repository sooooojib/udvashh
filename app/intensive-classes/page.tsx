import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { type Video } from "@/components/dashboard/video-card";
import { WatchProgressBar } from "@/components/dashboard/progress-bar";
import { IntensivePlaylistView } from "@/components/dashboard/intensive-playlist-view";
import { IntensiveSyncButton } from "@/components/dashboard/intensive-sync-button";
import { INTENSIVE_PLAYLISTS } from "@/lib/youtube/intensive-playlists";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Flame, PlaySquare, VideoOff } from "lucide-react";

export const metadata: Metadata = {
  title: "Intensive Classes | অবনতি",
  description: "Intensive Class playlists, videos, and progress tracker",
};

export default async function IntensiveClassesPage() {
  const session = await getSession();
  if (!session) redirect("/login?redirectTo=/intensive-classes");

  const adminEmail = process.env.ADMIN_EMAIL;
  const allowedAdmins = adminEmail
    ? adminEmail.split(",").map((e) => e.trim().toLowerCase())
    : [];

  const isOwner =
    allowedAdmins.length === 0 ||
    allowedAdmins.includes(session.email?.toLowerCase() || "");

  // Get all intensive playlist IDs to filter videos
  const intensivePlaylistIds = INTENSIVE_PLAYLISTS.map((p) => p.id);

  // Fetch videos only for intensive playlists
  let videoList: Video[] = [];
  if (intensivePlaylistIds.length > 0) {
    const videos = await sql`
      SELECT * FROM videos
      WHERE playlist_id = ANY(${intensivePlaylistIds})
      ORDER BY position ASC
    `;
    videoList = videos as unknown as Video[];
  }

  // Fetch user's watch progress for intensive videos only
  let watchedVideoIds: string[] = [];
  if (videoList.length > 0) {
    const videoIds = videoList.map((v) => v.id);
    const progressRows = await sql`
      SELECT video_id FROM watch_progress
      WHERE user_id = ${session.id}
        AND watched = true
        AND video_id = ANY(${videoIds})
    `;
    watchedVideoIds = progressRows.map((r) => r.video_id as string);
  }

  const watchedCount = watchedVideoIds.length;


  return (
    <main className="flex-1 p-3.5 sm:p-5 md:py-6 md:px-6 lg:px-8 max-w-[1680px] mx-auto w-full space-y-8 min-h-[calc(100dvh-4rem)] animate-page-enter">
      {/* Page Header with Amber Accent */}
      <div className="flex items-center gap-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/30 shadow-sm dark:text-amber-400">
          <Flame className="h-5.5 w-5.5" />
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground dark:text-[#E8EDF0]">
          Intensive Classes
        </h1>
      </div>

      {/* Owner Sync Panel */}
      {isOwner && (
        <Card className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-sm backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820]">
          <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500" />
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-[0_0_10px_rgba(217,119,6,0.4)]">
                <PlaySquare className="h-4.5 w-4.5" />
              </div>
              <div>
                <CardTitle className="font-heading text-sm font-bold tracking-tight text-foreground dark:text-[#E8EDF0]">
                  Intensive YouTube Sync
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground dark:text-[#9AA7AE]">
                  Owner only — pull latest intensive class videos from YouTube
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <IntensiveSyncButton playlists={INTENSIVE_PLAYLISTS} />
          </CardContent>
        </Card>
      )}

      {/* Progress Bar */}
      {videoList.length > 0 && (
        <WatchProgressBar total={videoList.length} watched={watchedCount} />
      )}

      {/* Video Content Grouped by Playlist */}
      {videoList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/50 py-20 backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820]/40">
          <VideoOff className="h-9 w-9 text-muted-foreground/50 dark:text-[#5C6A72]" />
          <p className="mt-3 text-sm font-semibold tracking-tight text-foreground dark:text-[#E8EDF0]">
            {INTENSIVE_PLAYLISTS.length === 0
              ? "No intensive playlists configured"
              : "No videos found"}
          </p>
          {isOwner && (
            <p className="mt-0.5 text-xs text-muted-foreground dark:text-[#9AA7AE]">
              {INTENSIVE_PLAYLISTS.length === 0
                ? "Add playlist IDs in lib/youtube/intensive-playlists.ts, then use the Sync button."
                : "Use the Sync button above to pull videos from YouTube."}
            </p>
          )}
        </div>
      ) : (
        <IntensivePlaylistView
          videos={videoList}
          watchedVideoIds={watchedVideoIds}
        />
      )}
    </main>
  );
}
