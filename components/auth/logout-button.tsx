"use client";

import * as React from "react";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";

export function LogoutButton() {
  const [isPending, startTransition] = React.useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logout();
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleLogout}
      disabled={isPending}
      className="min-h-[44px] min-w-[44px] gap-1.5 text-xs text-foreground/80 hover:text-red-600 hover:border-red-200 dark:border-[#1F2C34] dark:bg-[#111820] dark:text-[#9AA7AE] dark:hover:text-red-400 dark:hover:border-red-500/30 rounded-xl active:scale-95 transition-all duration-200 cursor-pointer"
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-red-500" />
      ) : (
        <LogOut className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
      )}
      <span className="hidden sm:inline">
        {isPending ? "Logging out..." : "Log out"}
      </span>
    </Button>
  );
}
