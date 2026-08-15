import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CheckCircle2,
  Lock,
  PlaySquare,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-white via-zinc-50/50 to-zinc-100/30 px-4 py-20 dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/80 px-4 py-1.5 text-xs font-medium text-zinc-800 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-200 mb-6">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          <span>YouTube Playlist Learning & Progress Tracker</span>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl md:text-6xl">
          Learn, track, and master <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-zinc-900 via-zinc-600 to-zinc-400 bg-clip-text text-transparent dark:from-zinc-100 dark:via-zinc-300 dark:to-zinc-500">
            every playlist
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg leading-7 text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
          Synchronize YouTube playlists directly with Supabase, track video progress in real time with auto-completion, and study with distraction-free playback.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto gap-2 shadow-lg shadow-zinc-950/10 font-semibold"
          >
            <Link href="/dashboard">
              <span>Go to Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full sm:w-auto font-medium"
          >
            <Link href="/signup">Create Account</Link>
          </Button>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200/80 bg-white/70 p-5 backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-900/40">
            <div className="flex items-center gap-2.5 font-semibold text-zinc-900 dark:text-zinc-100">
              <PlaySquare className="h-4 w-4 text-red-500" />
              <span>Embedded Player</span>
            </div>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Native YouTube embed with automatic watched detection when videos finish.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200/80 bg-white/70 p-5 backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-900/40">
            <div className="flex items-center gap-2.5 font-semibold text-zinc-900 dark:text-zinc-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Progress Tracking</span>
            </div>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Optimistic watched checkboxes and animated overall playlist progress bar.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200/80 bg-white/70 p-5 backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-900/40">
            <div className="flex items-center gap-2.5 font-semibold text-zinc-900 dark:text-zinc-100">
              <Lock className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
              <span>Protected Routes</span>
            </div>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Secure Supabase SSR authentication with route middleware protection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
