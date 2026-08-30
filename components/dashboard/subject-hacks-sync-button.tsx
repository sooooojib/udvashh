"use client";

import * as React from "react";
import { syncSubjectHacksNow } from "@/app/actions/sync-subject-hacks";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";

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
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleSync}
        disabled={isPending}
        size="sm"
        className="gap-2 font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-sm shadow-blue-500/20 dark:shadow-[0_0_10px_rgba(37,99,235,0.3)] transition-all active:scale-95 border-0 whitespace-nowrap"
      >
        {isPending ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Syncing…</span>
          </>
        ) : (
          <>
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Sync Now</span>
          </>
        )}
      </Button>

      {result && (
        <div
          role={result.success ? "status" : "alert"}
          className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs transition-all animate-in fade-in slide-in-from-bottom-2 duration-300 ${
            result.success
              ? "border-blue-200 bg-blue-50/80 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400"
              : "border-red-200 bg-red-50/80 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
          }`}
        >
          {result.success ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-px text-blue-600 dark:text-blue-400" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 mt-px text-red-600 dark:text-red-400" />
          )}
          <p className="leading-snug">{result.message}</p>
        </div>
      )}
    </div>
  );
}
