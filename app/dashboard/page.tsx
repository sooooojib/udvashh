import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { WatchProgressBar } from "@/components/dashboard/progress-bar";
import { OwnerSyncButton } from "@/components/dashboard/sync-button";
import { KNOWN_PLAYLISTS } from "@/lib/youtube/playlists";
import { INTENSIVE_PLAYLISTS } from "@/lib/youtube/intensive-playlists";
import { SUBJECT_HACKS_PLAYLISTS } from "@/lib/youtube/subject-hacks-playlists";
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
  FileText,
  Flame,
  Zap,
  PlaySquare,
  Tv,
} from "lucide-react";

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

  const videos = await sql`
    SELECT id, duration, playlist_id FROM videos
    WHERE playlist_id = ANY(${allKnownPlaylistIds})
  `;

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

  // All playlists for Dashboard sync
  const allDashboardPlaylists = [
    ...KNOWN_PLAYLISTS.map((p) => ({ ...p, category: "Live Classes" })),
    ...INTENSIVE_PLAYLISTS.map((p) => ({ ...p, category: "Intensive Classes" })),
    ...SUBJECT_HACKS_PLAYLISTS.map((p) => ({ ...p, category: "Subject Hacks" })),
  ];


  return (
    <main className="flex-1 p-3.5 sm:p-5 md:py-6 md:px-6 lg:px-8 max-w-[1680px] mx-auto w-full space-y-8 min-h-[calc(100dvh-4rem)] animate-page-enter overflow-x-hidden">
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

      {/* Hub Modules Grid */}
      <div className="space-y-3.5">
        <h2 className="font-heading text-base font-bold tracking-tight text-foreground dark:text-[#E8EDF0]">
          Course Sections
        </h2>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Module 1: Live Classes (ACTIVE) */}
          <Link
            href="/live-classes"
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card/90 p-5 shadow-sm backdrop-blur-md transition-all duration-200 ease-in-out hover:scale-[1.01] active:scale-[0.99] hover:border-primary/50 dark:border-[#1F2C34] dark:bg-[#111820] dark:hover:border-[#25A8A2]/60 hover:shadow-md min-h-[180px]"
          >
            {/* Top Badge */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#25A8A2]/15 text-[#25A8A2] ring-1 ring-[#25A8A2]/30 shadow-sm transition-transform duration-200 group-hover:scale-105">
                <Tv className="h-5.5 w-5.5" />
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-[#25A8A2]/15 px-2.5 py-0.5 text-xs font-bold text-[#25A8A2] border border-[#25A8A2]/30">
                <span className="h-1.5 w-1.5 rounded-full bg-[#25A8A2] animate-pulse" />
                Active
              </span>
            </div>

            {/* Title */}
            <div className="mt-4">
              <h3 className="font-heading text-lg font-bold tracking-tight text-foreground transition-colors group-hover:text-primary dark:text-[#E8EDF0] dark:group-hover:text-[#25A8A2]">
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
                <span className="font-mono text-sm font-bold text-emerald-600 dark:text-[#25A8A2]">
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
              <span className="flex items-center gap-1 font-bold text-primary dark:text-[#25A8A2] transition-transform group-hover:translate-x-0.5">
                <span>View Classes</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>

          {/* Module 2: Intensive Classes (ACTIVE) */}
          <Link
            href="/intensive-classes"
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
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card/90 p-5 shadow-sm backdrop-blur-md transition-all duration-200 ease-in-out hover:scale-[1.01] active:scale-[0.99] hover:border-fuchsia-500/50 dark:border-[#1F2C34] dark:bg-[#111820] dark:hover:border-fuchsia-500/60 hover:shadow-md min-h-[180px]"
          >
            {/* Top Badge */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-fuchsia-500/15 text-fuchsia-600 ring-1 ring-fuchsia-500/30 shadow-sm transition-transform duration-200 group-hover:scale-105 dark:text-fuchsia-400">
                <Zap className="h-5.5 w-5.5" />
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-fuchsia-500/15 px-2.5 py-0.5 text-xs font-bold text-fuchsia-600 border border-fuchsia-500/30 dark:text-fuchsia-400">
                <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-500 animate-pulse" />
                Active
              </span>
            </div>

            {/* Title */}
            <div className="mt-4">
              <h3 className="font-heading text-lg font-bold tracking-tight text-foreground transition-colors group-hover:text-fuchsia-600 dark:text-[#E8EDF0] dark:group-hover:text-fuchsia-400">
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
                <span className="font-mono text-sm font-bold text-fuchsia-600 dark:text-fuchsia-400">
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
              <span className="flex items-center gap-1 font-bold text-fuchsia-600 dark:text-fuchsia-400 transition-transform group-hover:translate-x-0.5">
                <span>View Hacks</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>

          {/* Module 4: Lecture Notes & Materials (FUTURE) */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/40 bg-card/50 p-5.5 opacity-75 backdrop-blur-md dark:border-[#1F2C34]/60 dark:bg-[#111820]/40">
            <div className="flex items-center justify-between gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground dark:bg-[#141E28] dark:text-[#5C6A72]">
                <FileText className="h-5.5 w-5.5" />
              </div>
              <span className="rounded-full bg-muted dark:bg-[#141E28] px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground dark:text-[#9AA7AE]">
                Coming Soon
              </span>
            </div>

            <div className="mt-4">
              <h3 className="font-heading text-lg font-bold tracking-tight text-foreground/80 dark:text-[#E8EDF0]/80">
                Lecture Notes & PDFs
              </h3>
            </div>

            {/* Stats Row */}
            <div className="my-4 grid grid-cols-3 gap-2 rounded-xl border border-border/40 bg-muted/15 p-2.5 dark:border-[#1F2C34]/60 dark:bg-[#0A0F12]/30">
              <div>
                <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider dark:text-[#5C6A72]">
                  Total
                </span>
                <span className="font-mono text-sm font-bold text-foreground/70 dark:text-[#E8EDF0]/70">
                  0 <span className="text-[10px] font-normal text-muted-foreground">PDFs</span>
                </span>
              </div>
              <div className="border-l border-border/40 pl-2.5 dark:border-[#1F2C34]/60">
                <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider dark:text-[#5C6A72]">
                  Saved
                </span>
                <span className="font-mono text-sm font-bold text-foreground/70 dark:text-[#E8EDF0]/70">
                  0 <span className="text-[10px] font-normal text-muted-foreground">read</span>
                </span>
              </div>
              <div className="border-l border-border/40 pl-2.5 dark:border-[#1F2C34]/60">
                <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider dark:text-[#5C6A72]">
                  Status
                </span>
                <span className="font-mono text-xs font-semibold text-muted-foreground">
                  Ready
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border/30 dark:border-[#1F2C34]/40 pt-3 text-xs text-muted-foreground dark:text-[#5C6A72]">
              <span>Section ready</span>
              <span>Available soon</span>
            </div>
          </div>

          {/* Module 4: Model Tests & Exams (FUTURE) */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/40 bg-card/50 p-5.5 opacity-75 backdrop-blur-md dark:border-[#1F2C34]/60 dark:bg-[#111820]/40">
            <div className="flex items-center justify-between gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground dark:bg-[#141E28] dark:text-[#5C6A72]">
                <BookOpen className="h-5.5 w-5.5" />
              </div>
              <span className="rounded-full bg-muted dark:bg-[#141E28] px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground dark:text-[#9AA7AE]">
                Coming Soon
              </span>
            </div>

            <div className="mt-4">
              <h3 className="font-heading text-lg font-bold tracking-tight text-foreground/80 dark:text-[#E8EDF0]/80">
                Model Tests & Quizzes
              </h3>
            </div>

            {/* Stats Row */}
            <div className="my-4 grid grid-cols-3 gap-2 rounded-xl border border-border/40 bg-muted/15 p-2.5 dark:border-[#1F2C34]/60 dark:bg-[#0A0F12]/30">
              <div>
                <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider dark:text-[#5C6A72]">
                  Total
                </span>
                <span className="font-mono text-sm font-bold text-foreground/70 dark:text-[#E8EDF0]/70">
                  0 <span className="text-[10px] font-normal text-muted-foreground">tests</span>
                </span>
              </div>
              <div className="border-l border-border/40 pl-2.5 dark:border-[#1F2C34]/60">
                <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider dark:text-[#5C6A72]">
                  Attended
                </span>
                <span className="font-mono text-sm font-bold text-foreground/70 dark:text-[#E8EDF0]/70">
                  0 <span className="text-[10px] font-normal text-muted-foreground">done</span>
                </span>
              </div>
              <div className="border-l border-border/40 pl-2.5 dark:border-[#1F2C34]/60">
                <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider dark:text-[#5C6A72]">
                  Status
                </span>
                <span className="font-mono text-xs font-semibold text-muted-foreground">
                  Ready
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border/30 dark:border-[#1F2C34]/40 pt-3 text-xs text-muted-foreground dark:text-[#5C6A72]">
              <span>Section ready</span>
              <span>Available soon</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
