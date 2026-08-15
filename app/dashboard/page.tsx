import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OwnerSyncButton } from "@/components/dashboard/sync-button";
import { CheckCircle2, PlaySquare, ShieldCheck, User } from "lucide-react";

const KNOWN_PLAYLISTS = [
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
  // If ADMIN_EMAIL is configured, verify user.email matches; otherwise default to allowing owner
  const isOwner = !adminEmail || user.email?.toLowerCase() === adminEmail.toLowerCase();

  // Fetch total cached video count in Supabase
  const { count } = await supabase
    .from("videos")
    .select("*", { count: "exact", head: true });

  return (
    <main className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Welcome back, <span className="font-medium text-zinc-900 dark:text-zinc-100">{user.email}</span>
          </p>
        </div>

        {isOwner && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20 w-fit">
            <ShieldCheck className="h-3.5 w-3.5" />
            Owner Access
          </span>
        )}
      </div>

      {isOwner && (
        <Card className="border-zinc-200/80 bg-gradient-to-br from-zinc-50/50 via-white to-zinc-50/30 dark:from-zinc-900/40 dark:via-zinc-950 dark:to-zinc-900/20 shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white shadow-sm">
                  <PlaySquare className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">YouTube Quick Sync (Owner Only)</CardTitle>
                  <CardDescription>
                    Trigger an immediate on-demand cache update after uploading a new video.
                  </CardDescription>
                </div>
              </div>
              <div className="hidden sm:block text-right">
                <span className="text-xs text-zinc-400">Total Cached Videos</span>
                <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{count ?? 0}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <OwnerSyncButton playlists={KNOWN_PLAYLISTS} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Authentication Status</CardTitle>
              <CardDescription>Protected route verified</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              <span>Session active & protected by Supabase middleware</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              <User className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">User Profile</CardTitle>
              <CardDescription>Your account details</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-zinc-500 dark:text-zinc-400">Email: </span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{user.email}</span>
            </p>
            <p>
              <span className="text-zinc-500 dark:text-zinc-400">User ID: </span>
              <code className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                {user.id}
              </code>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
