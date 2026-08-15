"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, LayoutDashboard, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[Application Error]:", error);
  }, [error]);

  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-1 flex-col items-center justify-center p-6 text-center animate-fade-in-up">
      <div className="mx-auto flex max-w-md flex-col items-center space-y-6 rounded-3xl border border-border/80 bg-card/90 p-8 shadow-xl backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820]">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/15 text-destructive ring-1 ring-destructive/30 shadow-sm dark:bg-red-950/40 dark:text-red-400">
          <AlertTriangle className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-destructive dark:text-red-400">
            Something Went Wrong
          </span>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground dark:text-[#E8EDF0]">
            An Error Occurred
          </h1>
          <p className="text-xs text-muted-foreground dark:text-[#9AA7AE] leading-relaxed">
            {error?.message || "An unexpected error occurred while loading this page."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row w-full gap-3 pt-2">
          <Button
            onClick={() => reset()}
            className="flex-1 h-10 rounded-xl gap-2 text-xs font-semibold shadow-sm bg-primary text-primary-foreground dark:bg-[#25A8A2] dark:text-white dark:hover:bg-[#20928D]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Try Again</span>
          </Button>

          <Button
            asChild
            variant="outline"
            className="flex-1 h-10 rounded-xl gap-2 text-xs font-medium dark:border-[#1F2C34] dark:bg-[#141E28] dark:text-[#E8EDF0]"
          >
            <Link href="/dashboard">
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Dashboard</span>
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
