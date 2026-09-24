import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { sql } from "@/lib/db";
import { getCachedDashboardVideos } from "@/lib/db/cached-catalog";
import { getSession } from "@/lib/auth/session";
import { WatchProgressBar } from "@/components/dashboard/progress-bar";
import { OwnerSyncButton } from "@/components/dashboard/sync-button";
import { KNOWN_PLAYLISTS, getPlaylistName } from "@/lib/youtube/playlists";
import { INTENSIVE_PLAYLISTS, getIntensivePlaylistName } from "@/lib/youtube/intensive-playlists";
import { SUBJECT_HACKS_PLAYLISTS, getSubjectHacksPlaylistName } from "@/lib/youtube/subject-hacks-playlists";
import { CurrentlyWatching, type CurrentlyWatchingVideo } from "@/components/dashboard/currently-watching";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowRight,
  BookOpen,
  Flame,
  GraduationCap,
  Lightbulb,
  PlaySquare,
  Tv,
} from "lucide-react";
import { getExamStats } from "@/lib/exams";

export const metadata: Metadata = {
  title: "Dashboard | অবনতি",
  description: "Your course hub and learning dashboard",
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login?redirectTo=/dashboard");

  const adminEmail = process.env.ADMIN_EMAIL;
  const allowedAdmins = adminEmail
    ? adminEmail.split(",").map((e) => e.trim().toLowerCase())
    : [];

  const isOwner =
    allowedAdmins.length === 0 ||
    allowedAdmins.includes(session.email?.toLowerCase() || "");

  // Fetch total video count for all known modules
  const livePlaylistIds = KNOWN_PLAYLISTS.map((p) => p.id);
  const intensivePlaylistIds = INTENSIVE_PLAYLISTS.map((p) => p.id);
  const subjectHacksPlaylistIds = SUBJECT_HACKS_PLAYLISTS.map((p) => p.id);
  const allKnownPlaylistIds = [...livePlaylistIds, ...intensivePlaylistIds, ...subjectHacksPlaylistIds];

  const videos = await getCachedDashboardVideos(allKnownPlaylistIds);

  // Separate live vs intensive vs subject hacks videos
  const liveVideos = videos.filter((v) =>
    v.playlist_id ? livePlaylistIds.includes(v.playlist_id) : false
  );
  const intensiveVideos = videos.filter((v) =>
    v.playlist_id ? intensivePlaylistIds.includes(v.playlist_id) : false
  );
  const subjectHacksVideos = videos.filter((v) =>
    v.playlist_id ? subjectHacksPlaylistIds.includes(v.playlist_id) : false
  );

  // Fetch user's watched progress
  const progressRows = await sql`
    SELECT video_id FROM watch_progress
    WHERE user_id = ${session.id} AND watched = true
  `;

  const watchedIds = new Set(progressRows.map((r) => r.video_id));

  // Live Classes stats
  const totalVideos = liveVideos.length;
  const watchedCount = liveVideos.filter((v) => watchedIds.has(v.id)).length;
  const livePercent = totalVideos > 0 ? Math.round((watchedCount / totalVideos) * 100) : 0;

  // Intensive Classes stats
  const totalIntensive = intensiveVideos.length;
  const watchedIntensive = intensiveVideos.filter((v) => watchedIds.has(v.id)).length;
  const intensivePercent = totalIntensive > 0 ? Math.round((watchedIntensive / totalIntensive) * 100) : 0;

  // Subject Hacks stats
  const totalSubjectHacks = subjectHacksVideos.length;
  const watchedSubjectHacks = subjectHacksVideos.filter((v) => watchedIds.has(v.id)).length;
  const subjectHacksPercent = totalSubjectHacks > 0 ? Math.round((watchedSubjectHacks / totalSubjectHacks) * 100) : 0;

  // Exam stats & User Attempts for Live Exams Hub
  const examStats = getExamStats();
  let userExamAttemptsCount = 0;
  try {
    const attemptsResult = await sql`
      SELECT count(*)::int as count FROM exam_attempts
      WHERE user_id = ${session.id}
    `;
    userExamAttemptsCount = attemptsResult[0]?.count || 0;
  } catch {
    userExamAttemptsCount = 0;
  }
  const examPercent = examStats.total > 0 ? Math.round((userExamAttemptsCount / examStats.total) * 100) : 0;

  // All playlists for Dashboard sync
  const allDashboardPlaylists = [
    ...KNOWN_PLAYLISTS.map((p) => ({ ...p, category: "Live Classes" })),
    ...INTENSIVE_PLAYLISTS.map((p) => ({ ...p, category: "Intensive Classes" })),
    ...SUBJECT_HACKS_PLAYLISTS.map((p) => ({ ...p, category: "Subject Hacks" })),
  ];

  // Fetch up to 3 currently watching videos (in-progress, not marked watched, > 10s progress)
  const currentlyWatchingRows = await sql`
    SELECT 
      v.id,
      v.youtube_video_id,
      v.title,
      v.thumbnail_url,
      v.duration,
      v.playlist_id,
      wp.progress_seconds,
      wp.last_watched_at,
      wp.updated_at
    FROM watch_progress wp
    JOIN videos v ON v.id = wp.video_id
    WHERE wp.user_id = ${session.id}
      AND wp.watched = false
      AND wp.progress_seconds > 10
    ORDER BY COALESCE(wp.last_watched_at, wp.updated_at) DESC
    LIMIT 3
  `;

  const currentlyWatchingVideos: CurrentlyWatchingVideo[] = currentlyWatchingRows.map((row) => {
    const isIntensive = intensivePlaylistIds.includes(row.playlist_id || "");
    const isSubjectHacks = subjectHacksPlaylistIds.includes(row.playlist_id || "");

    let moduleName = "Live Classes";
    let moduleHref = "/live-classes";
    let moduleType: "live" | "intensive" | "subject-hacks" = "live";
    let playlistName = getPlaylistName(row.playlist_id || "");

    if (isIntensive) {
      moduleName = "Intensive Classes";
      moduleHref = "/intensive-classes";
      moduleType = "intensive";
      playlistName = getIntensivePlaylistName(row.playlist_id || "");
    } else if (isSubjectHacks) {
      moduleName = "Subject Hacks";
      moduleHref = "/subject-hacks";
      moduleType = "subject-hacks";
      playlistName = getSubjectHacksPlaylistName(row.playlist_id || "");
    }

    return {
      id: row.id,
      youtube_video_id: row.youtube_video_id,
      title: row.title,
      thumbnail_url: row.thumbnail_url,
      duration: row.duration,
      playlist_id: row.playlist_id,
      progress_seconds: row.progress_seconds,
      last_watched_at: row.last_watched_at,
      updated_at: row.updated_at,
      moduleName,
      moduleHref,
      moduleType,
      playlistName,
    };
  });


  return (
    <main className="flex-1 p-3.5 sm:p-5 md:py-6 md:px-6 lg:px-8 max-w-[1680px] mx-auto w-full space-y-8 min-h-[calc(100dvh-4rem)] animate-page-enter overflow-x-hidden">
      {/* Owner Sync Panel */}
      {isOwner && (
        <Card className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-sm backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820]">
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
            <OwnerSyncButton
              playlists={allDashboardPlaylists}
              moduleName="All Modules"
            />
          </CardContent>
        </Card>
      )}

      {/* Overall Progress Bar */}
      {totalVideos + totalIntensive + totalSubjectHacks > 0 && (
        <WatchProgressBar
          total={totalVideos + totalIntensive + totalSubjectHacks}
          watched={watchedCount + watchedIntensive + watchedSubjectHacks}
        />
      )}

      {/* Currently Watching Shelf (Up to 3 in-progress videos) */}
      {currentlyWatchingVideos.length > 0 && (
        <CurrentlyWatching videos={currentlyWatchingVideos} />
      )}

      {/* Hub Modules Grid */}
      <div className="space-y-3.5">
        <h2 className="font-heading text-base font-bold tracking-tight text-foreground dark:text-[#E8EDF0]">
          Course Sections
        </h2>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Module 1: Live Classes (ACTIVE) */}
          <Link
            href="/live-classes"
            prefetch={true}
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card/90 p-5 shadow-sm backdrop-blur-md transition-all duration-200 ease-in-out hover:scale-[1.01] active:scale-[0.99] hover:border-emerald-500/50 dark:border-[#1F2C34] dark:bg-[#111820] dark:hover:border-emerald-500/60 hover:shadow-md min-h-[180px]"
          >
            {/* Top Badge */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30 shadow-sm transition-transform duration-200 group-hover:scale-105">
                <Tv className="h-5.5 w-5.5" />
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            </div>

            {/* Title */}
            <div className="mt-4">
              <h3 className="font-heading text-lg font-bold tracking-tight text-foreground transition-colors group-hover:text-emerald-600 dark:text-[#E8EDF0] dark:group-hover:text-emerald-400">
                Live Classes
              </h3>
            </div>

            {/* Module Live Stats Grid */}
            <div className="my-4 grid grid-cols-3 gap-2 rounded-xl border border-border/40 bg-muted/20 p-2.5 dark:border-[#1F2C34] dark:bg-[#0A0F12]/60">
              <div>
                <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider dark:text-[#5C6A72]">
                  Total
                </span>
                <span className="font-mono text-sm font-bold text-foreground dark:text-[#E8EDF0]">
                  {totalVideos} <span className="text-[10px] font-normal text-muted-foreground">classes</span>
                </span>
              </div>
              <div className="border-l border-border/40 pl-2.5 dark:border-[#1F2C34]">
                <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider dark:text-[#5C6A72]">
                  Completed
                </span>
                <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {watchedCount} <span className="text-[10px] font-normal text-muted-foreground">done</span>
                </span>
              </div>
              <div className="border-l border-border/40 pl-2.5 dark:border-[#1F2C34]">
                <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider dark:text-[#5C6A72]">
                  Progress
                </span>
                <span className="font-mono text-sm font-bold text-foreground dark:text-[#E8EDF0]">
                  {livePercent}%
                </span>
              </div>
            </div>

            {/* Meta & Button */}
            <div className="flex items-center justify-between border-t border-border/40 dark:border-[#1F2C34] pt-3 text-xs">
              <span className="font-medium text-muted-foreground font-mono text-[11px] dark:text-[#9AA7AE]">
                {KNOWN_PLAYLISTS.length} subjects
              </span>
              <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 transition-transform group-hover:translate-x-0.5">
                <span>View Classes</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>

          {/* Module 2: Intensive Classes (ACTIVE) */}
          <Link
            href="/intensive-classes"
            prefetch={true}
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card/90 p-5 shadow-sm backdrop-blur-md transition-all duration-200 ease-in-out hover:scale-[1.01] active:scale-[0.99] hover:border-amber-500/50 dark:border-[#1F2C34] dark:bg-[#111820] dark:hover:border-amber-500/60 hover:shadow-md min-h-[180px]"
          >
            {/* Top Badge */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/30 shadow-sm transition-transform duration-200 group-hover:scale-105 dark:text-amber-400">
                <Flame className="h-5.5 w-5.5" />
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-600 border border-amber-500/30 dark:text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                Active
              </span>
            </div>

            {/* Title */}
            <div className="mt-4">
              <h3 className="font-heading text-lg font-bold tracking-tight text-foreground transition-colors group-hover:text-amber-600 dark:text-[#E8EDF0] dark:group-hover:text-amber-400">
                Intensive Classes
              </h3>
            </div>

            {/* Module Stats Grid */}
            <div className="my-4 grid grid-cols-3 gap-2 rounded-xl border border-border/40 bg-muted/20 p-2.5 dark:border-[#1F2C34] dark:bg-[#0A0F12]/60">
              <div>
                <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider dark:text-[#5C6A72]">
                  Total
                </span>
                <span className="font-mono text-sm font-bold text-foreground dark:text-[#E8EDF0]">
                  {totalIntensive} <span className="text-[10px] font-normal text-muted-foreground">classes</span>
                </span>
              </div>
              <div className="border-l border-border/40 pl-2.5 dark:border-[#1F2C34]">
                <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider dark:text-[#5C6A72]">
                  Completed
                </span>
                <span className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400">
                  {watchedIntensive} <span className="text-[10px] font-normal text-muted-foreground">done</span>
                </span>
              </div>
              <div className="border-l border-border/40 pl-2.5 dark:border-[#1F2C34]">
                <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider dark:text-[#5C6A72]">
                  Progress
                </span>
                <span className="font-mono text-sm font-bold text-foreground dark:text-[#E8EDF0]">
                  {intensivePercent}%
                </span>
              </div>
            </div>

            {/* Meta & Button */}
            <div className="flex items-center justify-between border-t border-border/40 dark:border-[#1F2C34] pt-3 text-xs">
              <span className="font-medium text-muted-foreground font-mono text-[11px] dark:text-[#9AA7AE]">
                {INTENSIVE_PLAYLISTS.length} subjects
              </span>
              <span className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 transition-transform group-hover:translate-x-0.5">
                <span>View Classes</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>

          {/* Module 3: Subject Hacks (ACTIVE) */}
          <Link
            href="/subject-hacks"
            prefetch={true}
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card/90 p-5 shadow-sm backdrop-blur-md transition-all duration-200 ease-in-out hover:scale-[1.01] active:scale-[0.99] hover:border-blue-500/50 dark:border-[#1F2C34] dark:bg-[#111820] dark:hover:border-blue-500/60 hover:shadow-md min-h-[180px]"
          >
            {/* Top Badge */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 ring-1 ring-blue-500/30 shadow-sm transition-transform duration-200 group-hover:scale-105 dark:text-blue-400">
                <Lightbulb className="h-5.5 w-5.5" />
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs font-bold text-blue-600 border border-blue-500/30 dark:text-blue-400">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                Active
              </span>
            </div>

            {/* Title */}
            <div className="mt-4">
              <h3 className="font-heading text-lg font-bold tracking-tight text-foreground transition-colors group-hover:text-blue-600 dark:text-[#E8EDF0] dark:group-hover:text-blue-400">
                Subject Hacks
              </h3>
            </div>

            {/* Module Stats Grid */}
            <div className="my-4 grid grid-cols-3 gap-2 rounded-xl border border-border/40 bg-muted/20 p-2.5 dark:border-[#1F2C34] dark:bg-[#0A0F12]/60">
              <div>
                <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider dark:text-[#5C6A72]">
                  Total
                </span>
                <span className="font-mono text-sm font-bold text-foreground dark:text-[#E8EDF0]">
                  {totalSubjectHacks} <span className="text-[10px] font-normal text-muted-foreground">videos</span>
                </span>
              </div>
              <div className="border-l border-border/40 pl-2.5 dark:border-[#1F2C34]">
                <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider dark:text-[#5C6A72]">
                  Completed
                </span>
                <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                  {watchedSubjectHacks} <span className="text-[10px] font-normal text-muted-foreground">done</span>
                </span>
              </div>
              <div className="border-l border-border/40 pl-2.5 dark:border-[#1F2C34]">
                <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider dark:text-[#5C6A72]">
                  Progress
                </span>
                <span className="font-mono text-sm font-bold text-foreground dark:text-[#E8EDF0]">
                  {subjectHacksPercent}%
                </span>
              </div>
            </div>

            {/* Meta & Button */}
            <div className="flex items-center justify-between border-t border-border/40 dark:border-[#1F2C34] pt-3 text-xs">
              <span className="font-medium text-muted-foreground font-mono text-[11px] dark:text-[#9AA7AE]">
                {SUBJECT_HACKS_PLAYLISTS.length} playlist{SUBJECT_HACKS_PLAYLISTS.length !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 transition-transform group-hover:translate-x-0.5">
                <span>View Hacks</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>


          {/* Module 4: Live Exams (ACTIVE) */}
          <Link
            href="/exams"
            prefetch={true}
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card/90 p-5 shadow-sm backdrop-blur-md transition-all duration-200 ease-in-out hover:scale-[1.01] active:scale-[0.99] hover:border-[#881337]/50 dark:border-[#1F2C34] dark:bg-[#111820] dark:hover:border-[#881337]/60 hover:shadow-md min-h-[180px]"
          >
            {/* Top Badge */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#881337] text-white shadow-xs transition-transform duration-200 group-hover:scale-105">
                <GraduationCap className="h-5.5 w-5.5" />
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-[#FFF1F2] px-2.5 py-0.5 text-xs font-bold text-[#881337] border border-[#881337]/20 dark:bg-[#881337]/25 dark:text-[#FDA4AF] dark:border-[#881337]/35">
                <span className="h-1.5 w-1.5 rounded-full bg-[#881337] dark:bg-[#FDA4AF] animate-pulse" />
                Active
              </span>
            </div>

            {/* Title */}
            <div className="mt-4">
              <h3 className="font-heading text-lg font-bold tracking-tight text-foreground transition-colors group-hover:text-[#881337] dark:text-[#E8EDF0] dark:group-hover:text-[#FDA4AF]">
                Live Exams
              </h3>
            </div>

            {/* Module Stats Grid */}
            <div className="my-4 grid grid-cols-3 gap-2 rounded-xl border border-border/40 bg-muted/20 p-2.5 dark:border-[#1F2C34] dark:bg-[#0A0F12]/60">
              <div>
                <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider dark:text-[#5C6A72]">
                  Total
                </span>
                <span className="font-mono text-sm font-bold text-foreground dark:text-[#E8EDF0]">
                  {examStats.total} <span className="text-[10px] font-normal text-muted-foreground">tests</span>
                </span>
              </div>
              <div className="border-l border-border/40 pl-2.5 dark:border-[#1F2C34]">
                <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider dark:text-[#5C6A72]">
                  Completed
                </span>
                <span className="font-mono text-sm font-bold text-[#881337] dark:text-[#FDA4AF]">
                  {userExamAttemptsCount} <span className="text-[10px] font-normal text-muted-foreground">done</span>
                </span>
              </div>
              <div className="border-l border-border/40 pl-2.5 dark:border-[#1F2C34]">
                <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider dark:text-[#5C6A72]">
                  Progress
                </span>
                <span className="font-mono text-sm font-bold text-foreground dark:text-[#E8EDF0]">
                  {examPercent}%
                </span>
              </div>
            </div>

            {/* Meta & Button */}
            <div className="flex items-center justify-between border-t border-border/40 dark:border-[#1F2C34] pt-3 text-xs">
              <span className="font-medium text-muted-foreground font-mono text-[11px] dark:text-[#9AA7AE]">
                Daily • Weekly • Written
              </span>
              <span className="flex items-center gap-1 font-bold text-[#881337] dark:text-[#FDA4AF] transition-transform group-hover:translate-x-0.5">
                <span>Explore Exams</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
