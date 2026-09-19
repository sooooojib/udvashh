"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useOptimistic, useTransition } from "react";
import { toggleWatched } from "@/app/actions/progress";
import { toggleVideoPrivacy } from "@/app/actions/toggle-privacy";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { formatDuration, extractClassNumber } from "@/lib/utils/format";
import { Check, Clock, FileText, Globe, Link2, Loader2, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export type VideoTheme = "teal" | "emerald" | "amber" | "blue";

export interface Video {
  id: string;
  youtube_video_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  position: number;
  duration: number;
  published_at: string | null;
  playlist_id: string | null;
  privacy_status?: string | null;
  has_pdf?: boolean;
  pdf_count?: number;
}

interface VideoCardProps {
  video: Video;
  initialWatched: boolean;
  index: number;
  theme?: VideoTheme;
  isAdmin?: boolean;
}

// All Tailwind classes must be static strings so they survive purging
const themeStyles = {
  teal: {
    watchedCard:
      "border-teal-500/30 bg-teal-500/5 dark:border-[#25A8A2]/40 dark:bg-[#25A8A2]/10 shadow-[0_0_15px_rgba(37,168,162,0.08)]",
    defaultCard:
      "border-border/60 bg-card/90 backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820] dark:hover:border-[#25A8A2]/50 hover:border-teal-500/40",
    overlayRing: "bg-[#25A8A2] shadow-[0_0_12px_rgba(37,168,162,0.6)]",
    titleHover: "group-hover:text-teal-600 dark:group-hover:text-[#25A8A2]",
    checkboxChecked:
      "data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600 dark:data-[state=checked]:bg-[#25A8A2] dark:data-[state=checked]:border-[#25A8A2]",
    watchedLabel: "text-teal-600 dark:text-[#25A8A2]",
    watchButton:
      "bg-teal-600 text-white hover:bg-teal-700 shadow-sm dark:bg-[#25A8A2] dark:text-white dark:hover:bg-[#20928D] dark:shadow-[0_0_10px_rgba(37,168,162,0.3)]",
  },
  emerald: {
    watchedCard:
      "border-emerald-500/30 bg-emerald-500/5 dark:border-emerald-500/40 dark:bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.08)]",
    defaultCard:
      "border-border/60 bg-card/90 backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820] dark:hover:border-emerald-500/50 hover:border-emerald-500/40",
    overlayRing: "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]",
    titleHover: "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
    checkboxChecked:
      "data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 dark:data-[state=checked]:bg-emerald-500 dark:data-[state=checked]:border-emerald-500",
    watchedLabel: "text-emerald-600 dark:text-emerald-400",
    watchButton:
      "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-500 dark:shadow-[0_0_10px_rgba(16,185,129,0.3)]",
  },
  amber: {
    watchedCard:
      "border-amber-500/30 bg-amber-500/5 dark:border-amber-500/40 dark:bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.08)]",
    defaultCard:
      "border-border/60 bg-card/90 backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820] dark:hover:border-amber-500/50 hover:border-amber-500/40",
    overlayRing: "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]",
    titleHover: "dark:group-hover:text-amber-400",
    checkboxChecked:
      "data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500",
    watchedLabel: "text-amber-600 dark:text-amber-400",
    watchButton:
      "bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-600 dark:text-white dark:hover:bg-amber-700 dark:shadow-[0_0_10px_rgba(245,158,11,0.3)]",
  },
  blue: {
    watchedCard:
      "border-blue-500/30 bg-blue-500/5 dark:border-blue-500/40 dark:bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.08)]",
    defaultCard:
      "border-border/60 bg-card/90 backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820] dark:hover:border-blue-500/50 hover:border-blue-500/40",
    overlayRing: "bg-blue-600 shadow-[0_0_12px_rgba(59,130,246,0.6)]",
    titleHover: "dark:group-hover:text-blue-400",
    checkboxChecked:
      "data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600",
    watchedLabel: "text-blue-600 dark:text-blue-400",
    watchButton:
      "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700 dark:shadow-[0_0_10px_rgba(59,130,246,0.3)]",
  },
} as const;

export function VideoCard({
  video,
  initialWatched,
  index,
  theme = "teal",
  isAdmin = false,
}: VideoCardProps) {
  const [optimisticWatched, setOptimisticWatched] =
    useOptimistic(initialWatched);
  const [optimisticPrivacy, setOptimisticPrivacy] = useOptimistic(
    video.privacy_status || "unlisted"
  );
  const [, startTransition] = useTransition();
  const [isTogglingPrivacy, startPrivacyTransition] = useTransition();

  const classNumber = extractClassNumber(video.title) ?? (index + 1);
  const t = themeStyles[theme];

  const handleToggle = (checked: boolean | "indeterminate") => {
    const nextWatched = checked === true;
    startTransition(async () => {
      setOptimisticWatched(nextWatched);
      if (nextWatched) {
        toast.success("Marked as watched", { description: video.title });
      } else {
        toast.info("Marked as unwatched", { description: video.title });
      }
      await toggleWatched(video.id, nextWatched);
    });
  };

  const handleTogglePrivacy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextStatus = optimisticPrivacy === "public" ? "unlisted" : "public";
    startPrivacyTransition(async () => {
      setOptimisticPrivacy(nextStatus);
      const res = await toggleVideoPrivacy(video.youtube_video_id, nextStatus);
      if (res.success) {
        toast.success(res.message, { description: video.title });
      } else {
        toast.error(res.message, { description: video.title });
        setOptimisticPrivacy(optimisticPrivacy);
      }
    });
  };

  return (
    <Card
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-200 ease-out hover:scale-[1.015] hover:shadow-md transform-gpu will-change-transform",
        optimisticWatched ? t.watchedCard : t.defaultCard
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted/40 shrink-0 dark:bg-[#0A0F12]">
        {video.thumbnail_url ? (
          <Image
            src={video.thumbnail_url}
            alt={video.title}
            fill
            sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
            loading={index < 3 ? "eager" : "lazy"}
            decoding="async"
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Play className="h-8 w-8 text-muted-foreground/40 dark:text-[#5C6A72]" />
          </div>
        )}

        {/* Duration badge */}
        {video.duration > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/85 px-1.5 py-0.5 text-[11px] font-mono font-medium text-white shadow-sm backdrop-blur-md">
            <Clock className="h-2.5 w-2.5 text-zinc-300" />
            <span>{formatDuration(video.duration)}</span>
          </div>
        )}

        {/* PDF Status Indicator */}
        {video.has_pdf ? (
          <div
            title={`${video.pdf_count ?? 1} Lecture PDF${(video.pdf_count ?? 1) > 1 ? "s" : ""} available`}
            className="absolute bottom-2 left-2 z-10 flex items-center gap-1 rounded-md bg-emerald-600/90 text-white px-1.5 py-0.5 text-[10.5px] font-bold tracking-wide shadow-sm backdrop-blur-md border border-emerald-400/40"
          >
            <FileText className="h-3 w-3 stroke-[2.5]" />
            <span>PDF{video.pdf_count && video.pdf_count > 1 ? ` (${video.pdf_count})` : ""}</span>
          </div>
        ) : (
          <div
            title="No PDF attached to this lecture"
            className="absolute bottom-2 left-2 z-10 flex items-center gap-1 rounded-md bg-black/75 dark:bg-[#0A0F12]/85 text-zinc-400 dark:text-[#80909A] px-1.5 py-0.5 text-[10.5px] font-medium tracking-wide shadow-sm backdrop-blur-md border border-white/10"
          >
            <FileText className="h-3 w-3 opacity-50" />
            <span>No PDF</span>
          </div>
        )}

        {/* Index tag */}
        <div className="absolute left-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-md bg-black/80 px-1.5 text-[11px] font-bold text-white shadow-sm backdrop-blur-md font-mono">
          {classNumber}
        </div>

        {/* Privacy toggle badge (Admin only) */}
        {isAdmin && (
          <button
            type="button"
            disabled={isTogglingPrivacy}
            onClick={handleTogglePrivacy}
            title={
              optimisticPrivacy === "public"
                ? "Privacy: Public (searchable on YouTube). Click to switch to Unlisted"
                : "Privacy: Unlisted (accessible via link only). Click to switch to Public"
            }
            className={cn(
              "absolute right-2 top-2 z-10 flex h-6 items-center gap-1.5 rounded-md px-2 text-[11px] font-semibold tracking-wide shadow-xs backdrop-blur-md transition-all duration-150 cursor-pointer active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 border",
              optimisticPrivacy === "public"
                ? "bg-emerald-600/90 hover:bg-emerald-500 text-white shadow-emerald-900/30 border-emerald-400/40 dark:bg-emerald-500/25 dark:text-emerald-300 dark:border-emerald-500/40 dark:hover:bg-emerald-500/35 dark:hover:border-emerald-500/60"
                : "bg-card/90 hover:bg-card text-foreground/80 hover:text-foreground border-border/80 shadow-xs dark:bg-[#141E28]/95 dark:text-[#9AA7AE] dark:border-[#1F2C34] dark:hover:bg-[#1B2631] dark:hover:text-white dark:hover:border-border/80"
            )}
          >
            {isTogglingPrivacy ? (
              <Loader2 className="h-3 w-3 animate-spin text-current" />
            ) : optimisticPrivacy === "public" ? (
              <>
                <Globe className="h-3 w-3 text-emerald-200 dark:text-emerald-400 shrink-0" />
                <span>Public</span>
              </>
            ) : (
              <>
                <Link2 className="h-3 w-3 text-muted-foreground dark:text-[#9AA7AE] shrink-0" />
                <span>Unlisted</span>
              </>
            )}
          </button>
        )}

        {/* Watched overlay */}
        {optimisticWatched && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0A0F12]/40 backdrop-blur-[1px] transition-all">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-white",
                t.overlayRing
              )}
            >
              <Check className="h-5 w-5 stroke-[3]" />
            </div>
          </div>
        )}
      </div>

      {/* Card Content */}
      <CardContent className="flex flex-1 flex-col gap-2.5 p-4.5">
        <h3
          className={cn(
            "font-heading text-sm font-bold leading-snug tracking-tight transition-colors",
            optimisticWatched
              ? "text-muted-foreground dark:text-[#9AA7AE]"
              : cn("text-foreground dark:text-[#E8EDF0]", t.titleHover)
          )}
        >
          {video.title}
        </h3>

        {video.description && (
          <p className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground dark:text-[#9AA7AE]">
            {video.description}
          </p>
        )}

        {/* Footer: Checkbox + Watch button */}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/40 dark:border-[#1F2C34] pt-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground select-none transition-colors hover:text-foreground dark:text-[#9AA7AE] dark:hover:text-[#E8EDF0] min-h-[44px] py-1 -my-1 px-0.5">
            <Checkbox
              checked={optimisticWatched}
              onCheckedChange={handleToggle}
              id={`watched-${video.id}`}
              className={cn("rounded-md border-border dark:border-[#1F2C34] h-4 w-4", t.checkboxChecked)}
              aria-label={`Mark "${video.title}" as ${optimisticWatched ? "unwatched" : "watched"}`}
            />
            <span className="text-xs">
              {optimisticWatched ? (
                <span className={cn("font-semibold", t.watchedLabel)}>
                  Watched
                </span>
              ) : (
                <span>Mark watched</span>
              )}
            </span>
          </label>

          <Button
            asChild
            size="sm"
            className={cn(
              "min-h-[44px] rounded-xl px-3.5 text-xs font-semibold shadow-sm transition-all duration-150 active:scale-95",
              t.watchButton
            )}
          >
            <Link href={`/watch/${video.youtube_video_id}`}>
              <Play className="h-3 w-3 fill-current" />
              <span>Watch</span>
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
