import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { type Video } from "@/components/dashboard/video-card";
import { WatchProgressBar } from "@/components/dashboard/progress-bar";
import { PlaylistView } from "@/components/dashboard/playlist-view";
import { OwnerSyncButton } from "@/components/dashboard/sync-button";
import { KNOWN_PLAYLISTS } from "@/lib/youtube/playlists";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlaySquare, Tv, VideoOff } from "lucide-react";

export const metadata: Metadata = {
  title: "Live Classes | অবনতি",
  description: "Live Class playlists, videos, and progress tracker",
};

export default async function LiveClassesPage() {
  const supabase = await createClient();

  // Auth guard
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/live-classes");

  const adminEmail = process.env.ADMIN_EMAIL;
  const allowedAdmins = adminEmail
    ? adminEmail.split(",").map((e) => e.trim().toLowerCase())
    : [];

  const isOwner =
    allowedAdmins.length === 0 ||
    allowedAdmins.includes(user.email?.toLowerCase() || "");

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

  const watchedVideoIds: string[] = (progressRows ?? []).map(
    (r: { video_id: string }) => r.video_id
  );

  const videoList: Video[] = videos ?? [];
  const watchedCount = watchedVideoIds.length;

  return (
    <main className="flex-1 p-4 sm:p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8">
      {/* Clean Page Header with SevenGrid Accent */}
      <div className="flex items-center gap-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#25A8A2]/15 text-[#25A8A2] ring-1 ring-[#25A8A2]/30 shadow-sm">
          <Tv className="h-5.5 w-5.5" />
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground dark:text-[#E8EDF0]">
          Live Classes
        </h1>
      </div>

      {/* Progress Bar */}
      {videoList.length > 0 && (
        <WatchProgressBar total={videoList.length} watched={watchedCount} />
      )}

      {/* Owner Sync Panel */}
      {isOwner && (
        <Card className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-sm backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820]">
          <div className="h-1 w-full bg-gradient-to-r from-[#25A8A2] via-teal-500 to-emerald-500" />
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#25A8A2] text-white shadow-[0_0_10px_rgba(37,168,162,0.4)]">
                <PlaySquare className="h-4.5 w-4.5" />
              </div>
              <div>
                <CardTitle className="font-heading text-sm font-bold tracking-tight text-foreground dark:text-[#E8EDF0]">
                  YouTube Quick Sync
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground dark:text-[#9AA7AE]">
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

      {/* Video Content Grouped by Playlist */}
      {videoList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/50 py-20 backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820]/40">
          <VideoOff className="h-9 w-9 text-muted-foreground/50 dark:text-[#5C6A72]" />
          <p className="mt-3 text-sm font-semibold tracking-tight text-foreground dark:text-[#E8EDF0]">
            No videos found
          </p>
          {isOwner && (
            <p className="mt-0.5 text-xs text-muted-foreground dark:text-[#9AA7AE]">
              Use the Sync button above to pull videos from YouTube.
            </p>
          )}
        </div>
      ) : (
        <PlaylistView
          videos={videoList}
          watchedVideoIds={watchedVideoIds}
        />
      )}
    </main>
  );
}
