import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OwnerSyncButton, type Playlist } from "@/components/dashboard/sync-button";
import { CheckCircle2, PlaySquare, ShieldCheck, User, Video } from "lucide-react";

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/dashboard");
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const isOwner =
    !adminEmail || user.email?.toLowerCase() === adminEmail.toLowerCase();

  // Fetch total video count from Supabase
  const { count: totalVideos } = await supabase
    .from("videos")
    .select("*", { count: "exact", head: true });

  return (
    <main className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Dashboard
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Welcome back,{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {user.email}
            </span>
          </p>
        </div>

        {isOwner && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-700/40 dark:bg-amber-950/40 dark:text-amber-400 w-fit">
            <ShieldCheck className="h-3.5 w-3.5" />
            Owner Access
          </span>
        )}
      </div>

      {/* Owner-only: YouTube Quick Sync card */}
      {isOwner && (
        <Card className="overflow-hidden border-zinc-200/80 shadow-md dark:border-zinc-800">
          {/* Red accent bar at top */}
          <div className="h-1 w-full bg-gradient-to-r from-red-500 via-red-600 to-rose-500" />

          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow-sm">
                  <PlaySquare className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    YouTube Quick Sync
                  </CardTitle>
                  <CardDescription className="text-zinc-500 dark:text-zinc-400">
                    Pull latest videos into Supabase immediately after uploading.
                  </CardDescription>
                </div>
              </div>

              {/* Live video count badge */}
              <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/60 shrink-0">
                <Video className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                <div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-none mb-0.5">
                    Cached videos
                  </p>
                  <p className="text-xl font-bold leading-none text-zinc-900 dark:text-zinc-100">
                    {totalVideos ?? 0}
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <OwnerSyncButton playlists={KNOWN_PLAYLISTS} />
          </CardContent>
        </Card>
      )}

      {/* Status cards grid */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Authentication
              </CardTitle>
              <CardDescription>Protected route verified</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Session active — protected by Supabase middleware</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              <User className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                User Profile
              </CardTitle>
              <CardDescription>Your account details</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-baseline gap-2">
              <span className="w-16 shrink-0 text-zinc-500 dark:text-zinc-400">
                Email
              </span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100 break-all">
                {user.email}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="w-16 shrink-0 text-zinc-500 dark:text-zinc-400">
                User ID
              </span>
              <code className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded break-all">
                {user.id}
              </code>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
