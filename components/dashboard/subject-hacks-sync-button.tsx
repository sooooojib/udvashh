"use client";

import * as React from "react";
import { syncSubjectHacksNow } from "@/app/actions/sync-subject-hacks";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";

export function SubjectHacksSyncButton() {
  const [isPending, setIsPending] = React.useState(false);
  const [result, setResult] = React.useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleSync = async () => {
    setIsPending(true);
    setResult(null);
    try {
      const res = await syncSubjectHacksNow();
      setResult(res);
      if (res.success) {
        toast.success("Subject Hacks Synced", { description: res.message });
      } else {
        toast.error("Sync Failed", { description: res.message });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sync failed";
      setResult({ success: false, message });
      toast.error("Sync Failed", { description: message });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={handleSync}
        disabled={isPending}
        className="gap-2 font-semibold shadow-sm bg-violet-600 text-white hover:bg-violet-700 dark:bg-violet-600 dark:text-white dark:hover:bg-violet-700 dark:shadow-[0_0_10px_rgba(124,58,237,0.3)] transition-all active:scale-95"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Syncing…</span>
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" />
            <span>Sync Now</span>
          </>
        )}
      </Button>

      {result && (
        <div
          role={result.success ? "status" : "alert"}
          className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm transition-all animate-in fade-in slide-in-from-bottom-2 duration-300 ${
            result.success
              ? "border-violet-200 bg-violet-50/80 text-violet-800 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-400"
              : "border-red-200 bg-red-50/80 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
          }`}
        >
          {result.success ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-px text-violet-600 dark:text-violet-400" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 mt-px text-red-600 dark:text-red-400" />
          )}
          <p className="leading-snug">{result.message}</p>
        </div>
      )}
    </div>
  );
}
