import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  getCachedVideosByPlaylists,
  getCachedWatchedVideoIds,
} from "@/lib/db/cached-catalog";
import { getSession } from "@/lib/auth/session";
import { type Video } from "@/components/dashboard/video-card";
import { WatchProgressBar } from "@/components/dashboard/progress-bar";
import { SubjectHacksPlaylistView } from "@/components/dashboard/subject-hacks-playlist-view";
import { SubjectHacksSyncButton } from "@/components/dashboard/subject-hacks-sync-button";
import { SUBJECT_HACKS_PLAYLISTS } from "@/lib/youtube/subject-hacks-playlists";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Lightbulb, VideoOff } from "lucide-react";

export const metadata: Metadata = {
  title: "Subject Hacks | অবনতি",
  description: "Subject Hacks playlists, videos, and progress tracker",
};

export default async function SubjectHacksPage() {
  const session = await getSession();
  if (!session) redirect("/login?redirectTo=/subject-hacks");

  const adminEmail = process.env.ADMIN_EMAIL;
  const allowedAdmins = adminEmail
    ? adminEmail.split(",").map((e) => e.trim().toLowerCase())
    : [];

  const isOwner =
    allowedAdmins.length === 0 ||
    allowedAdmins.includes(session.email?.toLowerCase() || "");

  const subjectHacksPlaylistIds = SUBJECT_HACKS_PLAYLISTS.map((p) => p.id);

  // Fetch videos and user watched progress in parallel from server cache (0 Neon DB queries)
  const [videoList, allWatchedVideoIds] = await Promise.all([
    getCachedVideosByPlaylists(subjectHacksPlaylistIds),
    getCachedWatchedVideoIds(session.id),
  ]);

  const hacksVideoIds = new Set(videoList.map((v) => v.id));
  const watchedVideoIds: string[] = allWatchedVideoIds.filter((id) =>
    hacksVideoIds.has(id)
  );

  const watchedCount = watchedVideoIds.length;

  return (
    <main className="flex-1 px-3.5 sm:px-5 lg:px-6 py-6 sm:py-8 max-w-[1400px] mx-auto w-full space-y-5 sm:space-y-8 min-h-[calc(100dvh-4rem)] animate-page-enter overflow-x-hidden">

      {/* ── Page Header ── */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 ring-1 ring-blue-500/30 shadow-sm shadow-blue-500/10 dark:text-blue-400">
          <Lightbulb className="h-5 w-5" />
        </div>
        <h1 className="font-heading text-xl sm:text-3xl font-extrabold tracking-tight text-foreground dark:text-[#E8EDF0]">
          Subject Hacks
        </h1>
      </div>

      {/* ── Owner Sync Panel ── */}
      {isOwner && (
        <Card className="overflow-hidden rounded-2xl border border-blue-500/20 bg-card/90 shadow-sm backdrop-blur-md dark:border-blue-500/15 dark:bg-[#111820]">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]">
                <Lightbulb className="h-4.5 w-4.5" />
              </div>
              <div>
                <CardTitle className="font-heading text-sm font-bold tracking-tight text-foreground dark:text-[#E8EDF0]">
                  Subject Hacks Sync
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground dark:text-[#9AA7AE]">
                  Owner only — pull latest videos from YouTube
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <SubjectHacksSyncButton />
          </CardContent>
        </Card>
      )}

      {/* ── Progress Bar ── */}
      {videoList.length > 0 && (
        <WatchProgressBar total={videoList.length} watched={watchedCount} theme="blue" />
      )}

      {/* ── Video Grid / Empty State ── */}
      {videoList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-blue-500/20 bg-card/50 py-16 sm:py-20 backdrop-blur-md dark:border-blue-500/15 dark:bg-[#111820]/40">
          <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 dark:text-blue-400 mb-3">
            <VideoOff className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
          <p className="text-sm font-semibold tracking-tight text-foreground dark:text-[#E8EDF0]">
            {SUBJECT_HACKS_PLAYLISTS.length === 0
              ? "No playlists configured"
              : "No videos found"}
          </p>
          {isOwner && (
            <p className="mt-1 text-xs text-center text-muted-foreground dark:text-[#9AA7AE] max-w-[260px]">
              {SUBJECT_HACKS_PLAYLISTS.length === 0
                ? "Add playlist IDs in lib/youtube/subject-hacks-playlists.ts, then sync."
                : "Use the Sync button above to pull videos from YouTube."}
            </p>
          )}
        </div>
      ) : (
        <SubjectHacksPlaylistView
          videos={videoList}
          watchedVideoIds={watchedVideoIds}
          isAdmin={isOwner}
        />
      )}
    </main>
  );
}
