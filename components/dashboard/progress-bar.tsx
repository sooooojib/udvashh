"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  GraduationCap,
  Play,
  PlayCircle,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/utils/format";

export type ProgressTheme = "teal" | "emerald" | "amber" | "blue";

export interface CompletedVideoItem {
  id: string;
  youtube_video_id: string;
  title: string;
  description?: string | null;
  thumbnail_url: string | null;
  duration: number;
  playlist_id: string | null;
  watched_at?: string | null;
  moduleName?: string;
  moduleHref?: string;
  moduleType?: "live" | "intensive" | "subject-hacks";
  playlistName?: string;
  has_pdf?: boolean;
  pdf_count?: number;
}

interface WatchProgressBarProps {
  total: number;
  watched: number;
  theme?: ProgressTheme;
  completedVideos?: CompletedVideoItem[];
  moduleName?: string;
}

const themeStyles = {
  teal: {
    glow: "bg-[radial-gradient(circle_at_top_right,rgba(37,168,162,0.12),transparent_65%)]",
    progressIcon:
      "bg-teal-500/15 text-teal-600 ring-1 ring-teal-500/30 dark:bg-[#25A8A2]/15 dark:text-[#25A8A2] dark:ring-[#25A8A2]/30",
    completedIcon:
      "bg-teal-500/15 text-teal-600 ring-1 ring-teal-500/30 dark:bg-[#25A8A2]/15 dark:text-[#25A8A2] dark:ring-[#25A8A2]/30",
    percentDone:
      "text-teal-600 dark:text-[#25A8A2] dark:drop-shadow-[0_0_8px_rgba(37,168,162,0.4)]",
    progressFill:
      "bg-teal-600 dark:bg-[#25A8A2] dark:shadow-[0_0_10px_rgba(37,168,162,0.4)]",
    hoverBorder: "hover:border-teal-500/50 dark:hover:border-[#25A8A2]/50",
    accentBadge:
      "text-teal-700 bg-teal-500/15 border-teal-500/30 dark:text-[#25A8A2] dark:bg-[#25A8A2]/15 dark:border-[#25A8A2]/30",
    actionButton:
      "bg-teal-600 hover:bg-teal-700 text-white dark:bg-[#25A8A2] dark:hover:bg-[#20928D] shadow-xs",
    chipActive:
      "bg-teal-600 text-white dark:bg-[#25A8A2] dark:text-white shadow-xs font-semibold",
    pulseDot: "bg-teal-500",
  },
  emerald: {
    glow: "bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_65%)]",
    progressIcon:
      "bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/30",
    completedIcon:
      "bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/30",
    percentDone:
      "text-emerald-600 dark:text-emerald-400 dark:drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]",
    progressFill:
      "bg-emerald-600 dark:bg-emerald-500 dark:shadow-[0_0_10px_rgba(16,185,129,0.4)]",
    hoverBorder: "hover:border-emerald-500/50 dark:hover:border-emerald-500/50",
    accentBadge:
      "text-emerald-700 bg-emerald-500/15 border-emerald-500/30 dark:text-emerald-400 dark:bg-emerald-500/15 dark:border-emerald-500/30",
    actionButton:
      "bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-xs",
    chipActive:
      "bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white shadow-xs font-semibold",
    pulseDot: "bg-emerald-500",
  },
  amber: {
    glow: "bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_65%)]",
    progressIcon:
      "bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400 dark:ring-amber-500/30",
    completedIcon:
      "bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400 dark:ring-amber-500/30",
    percentDone:
      "text-amber-600 dark:text-amber-400 dark:drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]",
    progressFill:
      "bg-amber-500 dark:bg-amber-500 dark:shadow-[0_0_10px_rgba(245,158,11,0.4)]",
    hoverBorder: "hover:border-amber-500/50 dark:hover:border-amber-500/50",
    accentBadge:
      "text-amber-700 bg-amber-500/15 border-amber-500/30 dark:text-amber-400 dark:bg-amber-500/15 dark:border-amber-500/30",
    actionButton:
      "bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-600 dark:hover:bg-amber-500 shadow-xs",
    chipActive:
      "bg-amber-600 text-white dark:bg-amber-600 dark:text-white shadow-xs font-semibold",
    pulseDot: "bg-amber-500",
  },
  blue: {
    glow: "bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_65%)]",
    progressIcon:
      "bg-blue-500/15 text-blue-600 ring-1 ring-blue-500/30 dark:bg-blue-500/15 dark:text-blue-400 dark:ring-blue-500/30",
    completedIcon:
      "bg-blue-500/15 text-blue-600 ring-1 ring-blue-500/30 dark:bg-blue-500/15 dark:text-blue-400 dark:ring-blue-500/30",
    percentDone:
      "text-blue-600 dark:text-blue-400 dark:drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]",
    progressFill:
      "bg-blue-600 dark:bg-blue-600 dark:shadow-[0_0_10px_rgba(59,130,246,0.4)]",
    hoverBorder: "hover:border-blue-500/50 dark:hover:border-blue-500/50",
    accentBadge:
      "text-blue-700 bg-blue-500/15 border-blue-500/30 dark:text-blue-400 dark:bg-blue-500/15 dark:border-blue-500/30",
    actionButton:
      "bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-500 shadow-xs",
    chipActive:
      "bg-blue-600 text-white dark:bg-blue-600 dark:text-white shadow-xs font-semibold",
    pulseDot: "bg-blue-500",
  },
} as const;

export function WatchProgressBar({
  total,
  watched,
  theme = "teal",
  completedVideos = [],
  moduleName,
}: WatchProgressBarProps) {
  const [isExpanded, setIsExpanded] = React.useState<boolean>(false);
  const [moduleFilter, setModuleFilter] = React.useState<string>("all");

  const percent = total > 0 ? Math.round((watched / total) * 100) : 0;
  const t = themeStyles[theme];

  // Derive distinct module types if on dashboard or multiple modules exist
  const distinctModules = React.useMemo(() => {
    const types = new Set<string>();
    completedVideos.forEach((v) => {
      if (v.moduleType) types.add(v.moduleType);
    });
    return Array.from(types);
  }, [completedVideos]);

  const hasMultipleModules = distinctModules.length > 1;

  // Filter completed videos by module chip
  const filteredVideos = React.useMemo(() => {
    if (moduleFilter === "all") return completedVideos;
    return completedVideos.filter((v) => v.moduleType === moduleFilter);
  }, [completedVideos, moduleFilter]);

  const handleToggle = () => {
    setIsExpanded((prev) => !prev);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card/90 shadow-sm backdrop-blur-md transition-all duration-300 dark:bg-[#111820]/90",
        isExpanded
          ? cn("border-border/80 shadow-md", t.hoverBorder)
          : cn("border-border/60 hover:shadow-md", t.hoverBorder)
      )}
    >
      {/* Background radial glow */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-60 transition-opacity dark:opacity-100",
          t.glow
        )}
      />

      {/* ── Interactive Progress Bar Header ── */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls="completed-videos-accordion"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className="group relative cursor-pointer select-none p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
      >
        <div className="flex items-center justify-between gap-4 mb-3">
          {/* Left: Icon & Progress Text */}
          <div className="flex items-center gap-3 min-w-0">
            {watched === total && total > 0 ? (
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-2xs transition-transform duration-200 group-hover:scale-105",
                  t.completedIcon
                )}
              >
                <CheckCircle2 className="h-5 w-5" />
              </div>
            ) : (
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-2xs transition-transform duration-200 group-hover:scale-105",
                  t.progressIcon
                )}
              >
                <PlayCircle className="h-5 w-5" />
              </div>
            )}

            <div className="min-w-0">
              <p className="font-heading text-sm font-bold tracking-tight text-foreground dark:text-[#E8EDF0]">
                {watched === total && total > 0
                  ? "All classes watched"
                  : "Your Progress"}
              </p>

              <p className="text-xs text-muted-foreground font-mono truncate dark:text-[#9AA7AE] mt-0.5">
                {watched} of {total} videos watched
                {moduleName && ` • ${moduleName}`}
              </p>
            </div>
          </div>

          {/* Right: Percentage & Arrow */}
          <div className="flex items-center gap-3 shrink-0">
            <span
              className={cn(
                "font-mono text-2xl font-extrabold tabular-nums tracking-tight transition-colors",
                percent > 0
                  ? t.percentDone
                  : "text-muted-foreground dark:text-[#9AA7AE]"
              )}
            >
              {percent}%
            </span>

            <div
              title={isExpanded ? "Collapse archive" : "View watched classes"}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border border-border/50 bg-background/60 text-muted-foreground transition-all duration-300 group-hover:border-foreground/30 group-hover:text-foreground group-hover:scale-105 dark:border-[#1F2C34] dark:bg-[#141E28]/60",
                isExpanded &&
                  "rotate-180 bg-muted/80 text-foreground dark:bg-[#1A2632]"
              )}
            >
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Progress Bar Track */}
        <div className="relative">
          <Progress
            value={percent}
            className="h-2 rounded-full bg-muted/60 dark:bg-[#141E28]"
            indicatorClassName={cn("transition-all duration-500", t.progressFill)}
            aria-label={`${watched} of ${total} videos watched`}
          />
        </div>
      </div>

      {/* ── Expandable Accordion Drawer ── */}
      {isExpanded && (
        <div
          id="completed-videos-accordion"
          className="relative border-t border-border/50 bg-muted/15 p-4 sm:p-6 dark:border-[#1F2C34] dark:bg-[#0A0F12]/60 animate-in fade-in-50 slide-in-from-top-2 duration-300"
        >
          {/* Drawer Top Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 mb-5">
            <div className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", t.pulseDot)} />
              <h3 className="font-heading text-sm font-bold tracking-tight text-foreground dark:text-[#E8EDF0]">
                Watched Classes
              </h3>
              <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground dark:bg-[#1C262E] dark:text-[#8FA1AC]">
                {filteredVideos.length}
              </span>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
              {/* Module Filter Chips (only when on dashboard with multiple modules) */}
              {hasMultipleModules && (
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-background/70 border border-border/50 dark:bg-[#111820] dark:border-[#1F2C34]">
                  <button
                    type="button"
                    onClick={() => setModuleFilter("all")}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-150",
                      moduleFilter === "all"
                        ? t.chipActive
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    All ({completedVideos.length})
                  </button>
                  {distinctModules.includes("live") && (
                    <button
                      type="button"
                      onClick={() => setModuleFilter("live")}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-150",
                        moduleFilter === "live"
                          ? "bg-emerald-600 text-white shadow-xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Live (
                      {
                        completedVideos.filter((v) => v.moduleType === "live")
                          .length
                      }
                      )
                    </button>
                  )}
                  {distinctModules.includes("intensive") && (
                    <button
                      type="button"
                      onClick={() => setModuleFilter("intensive")}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-150",
                        moduleFilter === "intensive"
                          ? "bg-amber-600 text-white shadow-xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Intensive (
                      {
                        completedVideos.filter(
                          (v) => v.moduleType === "intensive"
                        )
                          .length
                      }
                      )
                    </button>
                  )}
                  {distinctModules.includes("subject-hacks") && (
                    <button
                      type="button"
                      onClick={() => setModuleFilter("subject-hacks")}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-150",
                        moduleFilter === "subject-hacks"
                          ? "bg-blue-600 text-white shadow-xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Hacks (
                      {
                        completedVideos.filter(
                          (v) => v.moduleType === "subject-hacks"
                        ).length
                      }
                      )
                    </button>
                  )}
                </div>
              )}

              {/* Redefined Minimal Collapse Control */}
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/80 hover:bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground dark:border-[#1F2C34] dark:bg-[#141E28] transition-all hover:scale-[1.02] active:scale-95 shadow-2xs cursor-pointer select-none"
              >
                <span>Collapse</span>
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Video Grid */}
          {filteredVideos.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredVideos.map((video) => (
                  <div
                    key={video.id}
                    className="group/card flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-sm backdrop-blur-md transition-all duration-200 hover:shadow-md hover:border-emerald-500/50 dark:border-[#1F2C34] dark:bg-[#111820]"
                  >
                    {/* Thumbnail Section */}
                    <div className="relative aspect-video w-full overflow-hidden bg-muted/40 dark:bg-[#0A0F12]">
                      <Link
                        href={`/watch/${video.youtube_video_id}`}
                        className="relative block h-full w-full"
                      >
                        {video.thumbnail_url ? (
                          <Image
                            src={video.thumbnail_url}
                            alt={video.title}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            loading="lazy"
                            decoding="async"
                            unoptimized={Boolean(
                              video.thumbnail_url?.includes("ytimg.com") ||
                                video.thumbnail_url?.includes("youtube.com")
                            )}
                            className="object-cover transition-transform duration-300 ease-out group-hover/card:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Play className="h-7 w-7 text-muted-foreground/40 dark:text-[#5C6A72]" />
                          </div>
                        )}

                        {/* Frosted Play Overlay on Hover */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 bg-black/25 backdrop-blur-[1px]">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-950 shadow-lg transition-transform duration-200 group-hover/card:scale-110">
                            <Play className="h-4 w-4 fill-current ml-0.5" />
                          </div>
                        </div>
                      </Link>

                      {/* Watched Badge */}
                      <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 rounded-md bg-black/75 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[10.5px] font-medium backdrop-blur-md shadow-xs">
                        <Check className="h-3 w-3 stroke-[3] text-emerald-400" />
                        <span>Watched</span>
                      </div>

                      {/* Module Chip */}
                      {video.moduleName && (
                        <div className="absolute top-2.5 right-2.5 z-10 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-mono font-medium text-white shadow-xs backdrop-blur-md border border-white/10">
                          {video.moduleName === "Live Classes"
                            ? "Live"
                            : video.moduleName === "Intensive Classes"
                            ? "Intensive"
                            : video.moduleName === "Subject Hacks"
                            ? "Hacks"
                            : video.moduleName}
                        </div>
                      )}

                      {/* Duration Badge */}
                      {video.duration > 0 && (
                        <div className="absolute bottom-2.5 right-2.5 z-10 flex items-center gap-1 rounded-md bg-black/85 px-1.5 py-0.5 text-[10.5px] font-mono font-medium text-white shadow-xs backdrop-blur-md">
                          <Clock className="h-2.5 w-2.5 text-zinc-300" />
                          <span>{formatDuration(video.duration)}</span>
                        </div>
                      )}

                      {/* PDF Notes Indicator */}
                      {video.has_pdf && (
                        <div
                          title="Lecture notes PDF available"
                          className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1 rounded-md bg-emerald-600/90 text-white px-1.5 py-0.5 text-[10px] font-bold tracking-wide shadow-xs backdrop-blur-md border border-emerald-400/40"
                        >
                          <FileText className="h-2.5 w-2.5 stroke-[2.5]" />
                          <span>PDF</span>
                        </div>
                      )}
                    </div>

                    {/* Card Content & Details */}
                    <div className="flex flex-1 flex-col justify-between p-3.5 gap-2.5">
                      <div>
                        {video.playlistName && (
                          <p className="text-[10.5px] font-mono font-medium text-muted-foreground line-clamp-1 dark:text-[#80909A]">
                            {video.playlistName}
                          </p>
                        )}
                        <h4
                          title={video.title}
                          className="font-heading text-xs sm:text-sm font-bold leading-snug line-clamp-2 text-foreground group-hover/card:text-emerald-600 dark:text-[#E8EDF0] dark:group-hover:text-emerald-400 transition-colors mt-0.5"
                        >
                          {video.title}
                        </h4>

                        {/* Video Description */}
                        {video.description && (
                          <p className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground/80 dark:text-[#9AA7AE] line-clamp-2 mt-1.5">
                            {video.description}
                          </p>
                        )}
                      </div>

                      {/* Revision Action */}
                      <Link
                        href={`/watch/${video.youtube_video_id}`}
                        className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-border/80 bg-card py-2 px-3 text-xs font-semibold text-foreground transition-all duration-150 hover:bg-emerald-500/10 hover:border-emerald-500/50 hover:text-emerald-600 dark:hover:text-emerald-400 dark:border-[#1F2C34] dark:bg-[#141E28] active:scale-95 shadow-2xs"
                      >
                        <RotateCcw className="h-3 w-3 stroke-[2.5]" />
                        <span>Re-watch Lecture</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Subtle Footer */}
              <div className="mt-5 pt-3.5 border-t border-border/40 dark:border-[#1F2C34]/80 flex items-center justify-between text-xs text-muted-foreground dark:text-[#80909A]">
                <span>
                  Showing {filteredVideos.length}{" "}
                  {filteredVideos.length === 1
                    ? "watched class"
                    : "watched classes"}
                </span>
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="font-medium hover:text-foreground dark:hover:text-[#E8EDF0] transition-colors cursor-pointer"
                >
                  Collapse ⌃
                </button>
              </div>
            </>
          ) : (
            /* ── Simple Empty State ── */
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm dark:border-[#1F2C34] dark:bg-[#111820]/50 max-w-md mx-auto">
              {/* Study Icon */}
              <div className="relative mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-transparent text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30 shadow-sm">
                <BookOpen className="h-5 w-5 stroke-[2]" />
              </div>

              <h4 className="font-heading text-sm sm:text-base font-bold text-foreground dark:text-[#E8EDF0]">
                No watched classes yet
              </h4>

              <p className="text-xs text-muted-foreground leading-relaxed dark:text-[#9AA7AE] mt-1 max-w-sm">
                Classes you watch or mark as watched will appear here.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
