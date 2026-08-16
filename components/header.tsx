import { BrandLogo } from "@/components/brand-logo";
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
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/80 backdrop-blur-md dark:border-[#1F2C34]/80 dark:bg-[#0A0F12]/80 transition-colors duration-200 pt-safe">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left side: User badge */}
        <div className="flex-1 flex items-center justify-start">
          {user && (
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-border/80 bg-card/80 px-3 py-1.5 text-xs font-medium text-foreground/80 dark:border-[#1F2C34] dark:bg-[#111820] dark:text-[#E8EDF0]">
              <User className="h-3.5 w-3.5 text-muted-foreground dark:text-[#9AA7AE]" />
              <span className="max-w-[150px] truncate font-mono text-[11px]">{user.email}</span>
            </div>
          )}
        </div>

        {/* Center: Brand Logo */}
        <div className="flex items-center justify-center">
          <BrandLogo />
        </div>

        {/* Right side: Theme Toggle + Logout */}
        <div className="flex-1 flex items-center justify-end gap-2">
          {/* Theme toggle — 44px touch target */}
          <div className="min-h-[44px] min-w-[44px] flex items-center justify-center">
            <ThemeToggle />
          </div>
          {user && (
            <form action={logout}>
              <Button
                variant="outline"
                size="sm"
                type="submit"
                className="min-h-[44px] min-w-[44px] gap-1.5 text-xs text-foreground/80 hover:text-red-600 hover:border-red-200 dark:border-[#1F2C34] dark:bg-[#111820] dark:text-[#9AA7AE] dark:hover:text-red-400 dark:hover:border-red-500/30 rounded-xl active:scale-95 transition-transform"
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
