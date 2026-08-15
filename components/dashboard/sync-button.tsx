"use client";

import * as React from "react";
import { syncNow } from "@/app/actions/sync";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";

interface SyncButtonProps {
  playlists?: { id: string; name: string }[];
}

export function OwnerSyncButton({ playlists }: SyncButtonProps) {
  const [isPending, setIsPending] = React.useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = React.useState<string>("");
  const [result, setResult] = React.useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleSync = async () => {
    setIsPending(true);
    setResult(null);

    try {
      const res = await syncNow(selectedPlaylist || undefined);
      setResult(res);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sync failed";
      setResult({ success: false, message });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {playlists && playlists.length > 0 && (
          <select
            value={selectedPlaylist}
            onChange={(e) => setSelectedPlaylist(e.target.value)}
            disabled={isPending}
            className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="">Default Playlist (from .env)</option>
            {playlists.map((pl) => (
              <option key={pl.id} value={pl.id}>
                {pl.name} ({pl.id})
              </option>
            ))}
          </select>
        )}

        <Button
          onClick={handleSync}
          disabled={isPending}
          className="gap-2 shadow-sm font-semibold"
          size="default"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Syncing with YouTube...</span>
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              <span>Sync Now</span>
            </>
          )}
        </Button>
      </div>

      {result && (
        <div
          className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-sm transition-all ${
            result.success
              ? "border-emerald-200 bg-emerald-50/80 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "border-red-200 bg-red-50/80 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
          }`}
        >
          {result.success ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
          )}
          <p className="leading-snug">{result.message}</p>
        </div>
      )}
    </div>
  );
}
