import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { LogOut, User, LayoutDashboard } from "lucide-react";

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
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-zinc-900 transition-opacity hover:opacity-90 dark:text-zinc-100"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-extrabold text-sm">
              U
            </span>
            <span>Udvash</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            <Link
              href="/"
              className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Home
            </Link>
            {user && (
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                <User className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                <span className="max-w-[160px] truncate">{user.email}</span>
              </div>
              <form action={logout}>
                <Button
                  variant="outline"
                  size="sm"
                  type="submit"
                  className="gap-1.5 text-xs text-zinc-700 hover:text-red-600 hover:border-red-200 dark:text-zinc-300 dark:hover:text-red-400"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Log out</span>
                </Button>
              </form>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Sign up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
