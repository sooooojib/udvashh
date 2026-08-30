"use client";

import * as React from "react";
import {
  syncSubjectHacksNow,
  type SubjectHacksSyncResult,
} from "@/app/actions/sync-subject-hacks";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";

export interface SubjectHacksPlaylist {
  id: string;
  name: string;
}

interface SubjectHacksSyncButtonProps {
  playlists?: SubjectHacksPlaylist[];
}

export function SubjectHacksSyncButton({
  playlists,
}: SubjectHacksSyncButtonProps) {
  const [isPending, setIsPending] = React.useState(false);
  const [selectedPlaylist, setSelectedPlaylist] =
    React.useState<string>("all");
  const [result, setResult] =
    React.useState<SubjectHacksSyncResult | null>(null);

  const handleSync = async () => {
    setIsPending(true);
    setResult(null);
    try {
      const res = await syncSubjectHacksNow(selectedPlaylist || undefined);
      setResult(res);
      if (res.success) {
        toast.success("Subject Hacks Playlist Synced", {
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
    selectedPlaylist === "all"
      ? "All Playlists"
      : playlists?.find((p) => p.id === selectedPlaylist)?.name ||
        "All Playlists";

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Playlist selector */}
        {playlists && playlists.length > 0 && (
          <div className="flex-1">
            <select
              id="subject-hacks-playlist-select"
              value={selectedPlaylist}
              onChange={(e) => {
                setSelectedPlaylist(e.target.value);
                setResult(null);
              }}
              disabled={isPending}
              className="w-full h-11 rounded-xl border border-border/80 bg-card/80 pl-3.5 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1 disabled:opacity-50 dark:border-[#1F2C34] dark:bg-[#0A0F12]/60 dark:text-[#E8EDF0] dark:focus:ring-violet-500"
            >
              <option value="all">
                All {playlists.length} Subject Hacks Playlist{playlists.length !== 1 ? "s" : ""}
              </option>
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
          className="gap-2 font-semibold shadow-sm shrink-0 bg-violet-600 text-white hover:bg-violet-700 dark:bg-violet-600 dark:text-white dark:hover:bg-violet-700 dark:shadow-[0_0_10px_rgba(124,58,237,0.3)] transition-all active:scale-95"
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
