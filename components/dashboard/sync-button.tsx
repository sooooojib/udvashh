"use client";

import * as React from "react";
import { syncNow, type SyncActionResult } from "@/app/actions/sync";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";

export interface Playlist {
  id: string;
  name: string;
}

interface OwnerSyncButtonProps {
  playlists?: Playlist[];
}

export function OwnerSyncButton({ playlists }: OwnerSyncButtonProps) {
  const [isPending, setIsPending] = React.useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = React.useState<string>("");
  const [result, setResult] = React.useState<SyncActionResult | null>(null);

  const handleSync = async () => {
    setIsPending(true);
    setResult(null);
    try {
      const res = await syncNow(selectedPlaylist || undefined);
      setResult(res);
      if (res.success) {
        toast.success("Playlist Synced", {
          description: res.message,
        });
      } else {
        toast.error("Sync Failed", {
          description: res.message,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sync failed";
      setResult({ success: false, message });
      toast.error("Sync Failed", { description: message });
    } finally {
      setIsPending(false);
    }
  };

  const selectedLabel =
    playlists?.find((p) => p.id === selectedPlaylist)?.name ||
    "Default Playlist";

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Playlist selector */}
        {playlists && playlists.length > 0 && (
          <div className="flex-1">
            <select
              id="playlist-select"
              value={selectedPlaylist}
              onChange={(e) => {
                setSelectedPlaylist(e.target.value);
                setResult(null);
              }}
              disabled={isPending}
              className="w-full h-11 rounded-xl border border-border/80 bg-card/80 pl-3.5 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:opacity-50 dark:border-[#1F2C34] dark:bg-[#0A0F12]/60 dark:text-[#E8EDF0] dark:focus:ring-[#25A8A2]"
            >
              <option value="all">All 12 Course Playlists</option>
              <option value="">Default Playlist (from env)</option>
              {playlists.map((pl) => (
                <option key={pl.id} value={pl.id}>
                  {pl.name} — {pl.id}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Sync Now button */}
        <Button
          onClick={handleSync}
          disabled={isPending}
          className="gap-2 font-semibold shadow-sm shrink-0 bg-primary text-primary-foreground dark:bg-[#25A8A2] dark:text-white dark:hover:bg-[#20928D] dark:shadow-[0_0_10px_rgba(37,168,162,0.3)] transition-all active:scale-95"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Syncing {selectedLabel}…</span>
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              <span>Sync Now</span>
            </>
          )}
        </Button>
      </div>

      {/* Result feedback */}
      {result && (
        <div
          role={result.success ? "status" : "alert"}
          className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm transition-all animate-in fade-in slide-in-from-bottom-2 duration-300 ${
            result.success
              ? "border-emerald-200 bg-emerald-50/80 text-emerald-800 dark:border-[#25A8A2]/30 dark:bg-[#25A8A2]/10 dark:text-[#25A8A2]"
              : "border-red-200 bg-red-50/80 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
          }`}
        >
          {result.success ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-px text-emerald-600 dark:text-[#25A8A2]" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 mt-px text-red-600 dark:text-red-400" />
          )}
          <p className="leading-snug">{result.message}</p>
        </div>
      )}
    </div>
  );
}
