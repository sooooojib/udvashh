import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogOut, User } from "lucide-react";

export async function Header() {
  let user = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data?.user ?? null;
  } catch {
    user = null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/80 transition-colors duration-200">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left column (user badge if logged in, otherwise spacer) */}
        <div className="flex-1 flex items-center justify-start">
          {user && (
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-zinc-200/80 bg-zinc-50/80 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
              <User className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
              <span className="max-w-[150px] truncate">{user.email}</span>
            </div>
          )}
        </div>

        {/* Center: Brand name "অবনতি" + Mode Change Button */}
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center transition-opacity hover:opacity-90"
          >
            <span className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
              অবনতি
            </span>
          </Link>
          <ThemeToggle />
        </div>

        {/* Right column (logout button if logged in, otherwise spacer for balanced middle alignment) */}
        <div className="flex-1 flex items-center justify-end">
          {user && (
            <form action={logout}>
              <Button
                variant="outline"
                size="sm"
                type="submit"
                className="gap-1.5 text-xs text-zinc-700 hover:text-red-600 hover:border-red-200 dark:text-zinc-300 dark:hover:text-red-400"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Log out</span>
              </Button>
            </form>
          )}
        </div>
      </div>
    </header>
  );
}
