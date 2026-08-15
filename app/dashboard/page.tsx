import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { WatchProgressBar } from "@/components/dashboard/progress-bar";
import { OwnerSyncButton } from "@/components/dashboard/sync-button";
import { KNOWN_PLAYLISTS } from "@/lib/youtube/playlists";
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
  PlaySquare,
  Tv,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Dashboard | অবনতি",
  description: "Your course hub and learning dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  // Auth guard
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/dashboard");

  const adminEmail = process.env.ADMIN_EMAIL;
  const allowedAdmins = adminEmail
    ? adminEmail.split(",").map((e) => e.trim().toLowerCase())
    : [];

  const isOwner =
    allowedAdmins.length === 0 ||
    allowedAdmins.includes(user.email?.toLowerCase() || "");

  // Fetch total video count
  const { data: videos } = await supabase
    .from("videos")
    .select("id, duration");

  // Fetch user's watched progress
  const { data: progressRows } = await supabase
    .from("watch_progress")
    .select("video_id, watched")
    .eq("user_id", user.id)
    .eq("watched", true);

  const totalVideos = videos?.length ?? 0;
  const watchedCount = progressRows?.length ?? 0;

  return (
    <main className="flex-1 p-4 sm:p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8">
      {/* Overall Progress Bar */}
      {totalVideos > 0 && (
        <WatchProgressBar total={totalVideos} watched={watchedCount} />
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

      {/* Hub Modules Grid */}
      <div className="space-y-3.5">
        <h2 className="font-heading text-base font-bold tracking-tight text-foreground dark:text-[#E8EDF0]">
          Course Sections
        </h2>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Module 1: Live Classes (ACTIVE) */}
          <Link
            href="/live-classes"
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card/90 p-5.5 shadow-sm backdrop-blur-md transition-all duration-200 ease-in-out hover:scale-[1.01] hover:border-primary/50 dark:border-[#1F2C34] dark:bg-[#111820] dark:hover:border-[#25A8A2]/60 hover:shadow-md"
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

            {/* Content */}
            <div className="my-4 space-y-1.5">
              <h3 className="font-heading text-lg font-bold tracking-tight text-foreground transition-colors group-hover:text-primary dark:text-[#E8EDF0] dark:group-hover:text-[#25A8A2]">
                Live Classes
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed dark:text-[#9AA7AE]">
                Browse and watch recorded live classes across {KNOWN_PLAYLISTS.length} subjects with automated progress tracking.
              </p>
            </div>

            {/* Meta & Button */}
            <div className="flex items-center justify-between border-t border-border/40 dark:border-[#1F2C34] pt-3 text-xs">
              <span className="font-medium text-muted-foreground font-mono text-[11px] dark:text-[#9AA7AE]">
                {totalVideos} videos • {KNOWN_PLAYLISTS.length} subjects
              </span>
              <span className="flex items-center gap-1 font-bold text-primary dark:text-[#25A8A2] transition-transform group-hover:translate-x-0.5">
                <span>View Classes</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>

          {/* Module 2: Lecture Notes & Materials (FUTURE) */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/40 bg-card/50 p-5.5 opacity-75 backdrop-blur-md dark:border-[#1F2C34]/60 dark:bg-[#111820]/40">
            <div className="flex items-center justify-between gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground dark:bg-[#141E28] dark:text-[#5C6A72]">
                <FileText className="h-5.5 w-5.5" />
              </div>
              <span className="rounded-full bg-muted dark:bg-[#141E28] px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground dark:text-[#9AA7AE]">
                Coming Soon
              </span>
            </div>

            <div className="my-4 space-y-1.5">
              <h3 className="font-heading text-lg font-bold tracking-tight text-foreground/80 dark:text-[#E8EDF0]/80">
                Lecture Notes & PDFs
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed dark:text-[#9AA7AE]">
                Downloadable slide decks, lecture summaries, and reference study sheets.
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-border/30 dark:border-[#1F2C34]/40 pt-3 text-xs text-muted-foreground dark:text-[#5C6A72]">
              <span>Section ready</span>
              <span>Available soon</span>
            </div>
          </div>

          {/* Module 3: Model Tests & Exams (FUTURE) */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/40 bg-card/50 p-5.5 opacity-75 backdrop-blur-md dark:border-[#1F2C34]/60 dark:bg-[#111820]/40">
            <div className="flex items-center justify-between gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground dark:bg-[#141E28] dark:text-[#5C6A72]">
                <BookOpen className="h-5.5 w-5.5" />
              </div>
              <span className="rounded-full bg-muted dark:bg-[#141E28] px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground dark:text-[#9AA7AE]">
                Coming Soon
              </span>
            </div>

            <div className="my-4 space-y-1.5">
              <h3 className="font-heading text-lg font-bold tracking-tight text-foreground/80 dark:text-[#E8EDF0]/80">
                Model Tests & Quizzes
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed dark:text-[#9AA7AE]">
                Subject-wise practice quizzes, timed mock tests, and instant score evaluation.
              </p>
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
