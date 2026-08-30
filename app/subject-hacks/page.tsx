import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { type Video } from "@/components/dashboard/video-card";
import { WatchProgressBar } from "@/components/dashboard/progress-bar";
import { SubjectHacksPlaylistView } from "@/components/dashboard/subject-hacks-playlist-view";
import { SubjectHacksSyncButton } from "@/components/dashboard/subject-hacks-sync-button";
import { SUBJECT_HACKS_PLAYLISTS } from "@/lib/youtube/subject-hacks-playlists";
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

  let videoList: Video[] = [];
  if (subjectHacksPlaylistIds.length > 0) {
    const videos = await sql`
      SELECT * FROM videos
      WHERE playlist_id = ANY(${subjectHacksPlaylistIds})
      ORDER BY position ASC
    `;
    videoList = videos as unknown as Video[];
  }

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
    <main className="flex-1 p-3.5 sm:p-5 md:py-6 md:px-6 lg:px-8 max-w-[1680px] mx-auto w-full space-y-5 sm:space-y-8 min-h-[calc(100dvh-4rem)] animate-page-enter">

      {/* ── Page Header ── */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/15 text-fuchsia-600 ring-1 ring-fuchsia-500/30 shadow-sm shadow-fuchsia-500/10 dark:text-fuchsia-400">
          <Lightbulb className="h-5 w-5" />
        </div>
        <h1 className="font-heading text-xl sm:text-3xl font-extrabold tracking-tight text-foreground dark:text-[#E8EDF0]">
          Subject Hacks
        </h1>
      </div>

      {/* ── Owner Sync Panel — inline compact row on mobile ── */}
      {isOwner && (
        <div className="overflow-hidden rounded-2xl border border-fuchsia-500/20 bg-card/90 shadow-sm dark:border-fuchsia-500/15 dark:bg-[#111820]">
          {/* top gradient stripe */}
          <div className="h-[3px] w-full bg-gradient-to-r from-fuchsia-600 via-pink-500 to-rose-500" />

          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            {/* left: icon + text */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-600 to-pink-600 text-white shadow-[0_0_10px_rgba(217,70,239,0.35)]">
                <Lightbulb className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold tracking-tight text-foreground dark:text-[#E8EDF0] truncate">
                  Subject Hacks Sync
                </p>
                <p className="text-xs text-muted-foreground dark:text-[#9AA7AE] truncate">
                  Owner only — pull latest videos from YouTube
                </p>
              </div>
            </div>

            {/* right: sync button */}
            <div className="shrink-0">
              <SubjectHacksSyncButton />
            </div>
          </div>
        </div>
      )}

      {/* ── Progress Bar ── */}
      {videoList.length > 0 && (
        <WatchProgressBar total={videoList.length} watched={watchedCount} />
      )}

      {/* ── Video Grid / Empty State ── */}
      {videoList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-fuchsia-500/20 bg-card/50 py-16 sm:py-20 backdrop-blur-md dark:border-fuchsia-500/15 dark:bg-[#111820]/40">
          <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-fuchsia-500/10 text-fuchsia-500 dark:text-fuchsia-400 mb-3">
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
        />
      )}
    </main>
  );
}
