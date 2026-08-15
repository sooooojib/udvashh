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
    <main className="flex-1 p-4 sm:p-6 md:p-10 max-w-7xl mx-auto w-full space-y-10">
      {/* Welcome Banner with brand title অবনতি */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
            অবনতি
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Welcome back! Select a section below to continue your preparation.
          </p>
        </div>
      </div>

      {/* Overall Progress Bar */}
      {totalVideos > 0 && (
        <WatchProgressBar total={totalVideos} watched={watchedCount} />
      )}

      {/* Owner Sync Panel */}
      {isOwner && (
        <Card className="overflow-hidden border-zinc-200/80 shadow-sm dark:border-zinc-800">
          <div className="h-1 w-full bg-gradient-to-r from-red-500 via-red-600 to-rose-500" />
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow-sm">
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

      {/* Hub Modules Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Course Sections
        </h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Module 1: Live Classes (ACTIVE) */}
          <Link
            href="/live-classes"
            className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 dark:border-zinc-800 dark:bg-zinc-950"
          >
            {/* Top Badge */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 text-white shadow-md transition-transform duration-300 group-hover:scale-105">
                <Tv className="h-6 w-6" />
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 dark:bg-red-950/60 dark:text-red-400">
                <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
                Active
              </span>
            </div>

            {/* Content */}
            <div className="my-5 space-y-2">
              <h3 className="text-xl font-bold text-zinc-900 transition-colors group-hover:text-red-600 dark:text-zinc-100 dark:group-hover:text-red-400">
                Live Classes
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Browse and watch recorded live classes across {KNOWN_PLAYLISTS.length} subjects with automated progress tracking.
              </p>
            </div>

            {/* Meta & Button */}
            <div className="flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-900">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                {totalVideos} videos • {KNOWN_PLAYLISTS.length} subjects
              </span>
              <span className="flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400 group-hover:translate-x-0.5 transition-transform">
                <span>View Classes</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>

          {/* Module 2: Lecture Notes & Materials (FUTURE) */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-zinc-200/60 bg-zinc-50/50 p-6 opacity-75 dark:border-zinc-800/60 dark:bg-zinc-900/30">
            <div className="flex items-center justify-between gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                <FileText className="h-6 w-6" />
              </div>
              <span className="rounded-full bg-zinc-200/70 px-2.5 py-1 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                Coming Soon
              </span>
            </div>

            <div className="my-5 space-y-2">
              <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-200">
                Lecture Notes & PDFs
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Downloadable slide decks, lecture summaries, and reference study sheets.
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-200/50 pt-4 dark:border-zinc-800/50 text-xs text-zinc-400">
              <span>Section ready</span>
              <span>Available soon</span>
            </div>
          </div>

          {/* Module 3: Model Tests & Exams (FUTURE) */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-zinc-200/60 bg-zinc-50/50 p-6 opacity-75 dark:border-zinc-800/60 dark:bg-zinc-900/30">
            <div className="flex items-center justify-between gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                <BookOpen className="h-6 w-6" />
              </div>
              <span className="rounded-full bg-zinc-200/70 px-2.5 py-1 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                Coming Soon
              </span>
            </div>

            <div className="my-5 space-y-2">
              <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-200">
                Model Tests & Quizzes
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Subject-wise practice quizzes, timed mock tests, and instant score evaluation.
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-200/50 pt-4 dark:border-zinc-800/50 text-xs text-zinc-400">
              <span>Section ready</span>
              <span>Available soon</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
