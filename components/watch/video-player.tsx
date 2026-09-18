"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useOptimistic, useTransition } from "react";
import { toggleWatched } from "@/app/actions/progress";
import { toggleVideoPrivacy } from "@/app/actions/toggle-privacy";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDuration } from "@/lib/utils/format";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Circle,
  Clock,
  FileText,
  Flame,
  Gauge,
  Globe,
  LayoutGrid,
  Lightbulb,
  Loader2,
  Lock,
  Link2,
  Pause,
  Play,
  SkipForward,
  Tv,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";

// Dynamically import react-youtube to avoid SSR issues
const YouTube = dynamic(
  () => import("react-youtube").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-video w-full items-center justify-center bg-muted/20 dark:bg-[#0A0F12] animate-pulse">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/40 text-muted-foreground dark:bg-[#141E28] dark:text-[#5C6A72]">
          <Play className="h-6 w-6 ml-0.5" />
        </div>
      </div>
    ),
  }
);

interface VideoPlayerProps {
  videoId: string; // Supabase video UUID
  youtubeVideoId: string; // YouTube video ID for embedding
  title: string;
  description: string | null;
  duration: number;
  position: number;
  playlistName?: string;
  moduleName?: string;
  moduleHref?: string;
  moduleType?: "live" | "intensive" | "subject-hacks";
  initialWatched: boolean;
  nextVideoId: string | null;
  isAdmin?: boolean;
  privacyStatus?: string | null;
}

export function VideoPlayer({
  videoId,
  youtubeVideoId,
  title,
  description,
  duration,
  position,
  playlistName,
  moduleName = "Live Classes",
  moduleHref = "/live-classes",
  moduleType = "live",
  initialWatched,
  nextVideoId,
  isAdmin = false,
  privacyStatus,
}: VideoPlayerProps) {
  const [optimisticWatched, setOptimisticWatched] =
    useOptimistic(initialWatched);
  const [optimisticPrivacy, setOptimisticPrivacy] = useOptimistic(
    privacyStatus || "unlisted"
  );
  const [isPending, startTransition] = useTransition();
  const [isTogglingPrivacy, startPrivacyTransition] = useTransition();
  const [hasAutoMarked, setHasAutoMarked] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [is2xSpeed, setIs2xSpeed] = React.useState(false);
  const [currentRate, setCurrentRate] = React.useState<number>(1);
  const [seekFeedback, setSeekFeedback] = React.useState<{
    direction: "forward" | "backward";
    seconds: number;
    key: number;
  } | null>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [isTheaterMode, setIsTheaterMode] = React.useState(false);
  const seekTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const { theme, setTheme, resolvedTheme } = useTheme();
  const previousThemeRef = React.useRef<string | null>(null);

  // When Theater Mode is enabled, switch background mode to dark (cinema atmosphere)
  React.useEffect(() => {
    if (isTheaterMode) {
      const isCurrentlyDark =
        typeof document !== "undefined" &&
        document.documentElement.classList.contains("dark");

      if (!isCurrentlyDark) {
        previousThemeRef.current = theme || "light";
        setTheme("dark");
      }
    } else {
      if (previousThemeRef.current) {
        setTheme(previousThemeRef.current);
        previousThemeRef.current = null;
      }
    }
  }, [isTheaterMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lock body scroll when Theater Mode is active on big screens so the dark overlay covers everything cleanly
  React.useEffect(() => {
    if (isTheaterMode && typeof window !== "undefined" && window.innerWidth >= 768) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isTheaterMode]);

  // Auto-exit theater mode if screen is resized to small screen (< 768px)
  React.useEffect(() => {
    const handleResize = () => {
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        setIsTheaterMode((prev) => (prev ? false : prev));
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Restore theme on unmount if left in Theater Mode
  React.useEffect(() => {
    return () => {
      if (previousThemeRef.current) {
        setTheme(previousThemeRef.current);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const playerRef = React.useRef<any>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const speedPopoverRef = React.useRef<HTMLDivElement>(null);
  const seekPopoverRef = React.useRef<HTMLDivElement>(null);
  const previousRateRef = React.useRef<number>(1);
  const isHoldingSpaceRef = React.useRef<boolean>(false);
  const spaceDownTimeRef = React.useRef<number>(0);
  const spaceHoldTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const is2xActiveFromSpaceRef = React.useRef<boolean>(false);

  const toggleTheaterMode = React.useCallback(() => {
    // Theater mode is strictly for big screens (>= 768px)
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return;
    }
    setIsTheaterMode((prev) => !prev);
  }, []);

  const toggleFullscreen = React.useCallback(() => {
    const fsEl =
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement;

    if (!fsEl) {
      const container = containerRef.current as any;
      if (container) {
        if (container.requestFullscreen) {
          container.requestFullscreen().catch(() => {});
        } else if (container.webkitRequestFullscreen) {
          container.webkitRequestFullscreen();
        }
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  }, []);

  // Initialize YouTube player instance and enforce proper iframe attributes
  const handlePlayerReady = (event: any) => {
    playerRef.current = event.target;
    try {
      const iframe = event.target.getIframe?.();
      if (iframe) {
        iframe.setAttribute(
          "allow",
          "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        );
        iframe.setAttribute("allowfullscreen", "true");
        iframe.setAttribute("webkitallowfullscreen", "true");
        iframe.setAttribute("mozallowfullscreen", "true");
      }
      const initialRate = event.target.getPlaybackRate?.();
      if (typeof initialRate === "number" && initialRate > 0) {
        setCurrentRate(initialRate);
        previousRateRef.current = initialRate;
      }
    } catch {}
  };

  // Safe helper to get current rate synchronously
  const getPlayerRate = React.useCallback((): number => {
    if (!playerRef.current) return 1;
    try {
      const rate = playerRef.current.getPlaybackRate?.();
      if (typeof rate === "number" && rate > 0) return rate;
    } catch {}
    return 1;
  }, []);

  // Dedicated speed changer (no toast popup on speed click)
  const setPlayerSpeed = React.useCallback((speed: number) => {
    if (!playerRef.current) return;
    try {
      playerRef.current.setPlaybackRate?.(speed);
      setCurrentRate(speed);
      previousRateRef.current = speed;
    } catch {}
  }, []);

  // Start 2x speed (Spacebar hold or touch/click hold)
  const start2xSpeed = React.useCallback(() => {
    if (!playerRef.current || isHoldingSpaceRef.current) return;
    isHoldingSpaceRef.current = true;
    setIs2xSpeed(true);

    try {
      const current = getPlayerRate();
      if (current && current !== 2) {
        previousRateRef.current = current;
      }
      playerRef.current.setPlaybackRate?.(2);
      setCurrentRate(2);
    } catch {
      try {
        playerRef.current.setPlaybackRate?.(2);
      } catch {}
    }
  }, [getPlayerRate]);

  // Stop 2x speed (Revert to previous rate)
  const stop2xSpeed = React.useCallback(() => {
    if (!playerRef.current || !isHoldingSpaceRef.current) return;
    isHoldingSpaceRef.current = false;
    setIs2xSpeed(false);

    const restoreRate = previousRateRef.current || 1;
    try {
      playerRef.current.setPlaybackRate?.(restoreRate);
      setCurrentRate(restoreRate);
    } catch {}
  }, []);

  // Safe Play/Pause toggle
  const togglePlayPause = React.useCallback(() => {
    if (!playerRef.current) return;
    try {
      const state = playerRef.current.getPlayerState?.();
      if (state === 1) {
        playerRef.current.pauseVideo?.();
        setIsPlaying(false);
      } else {
        playerRef.current.playVideo?.();
        setIsPlaying(true);
      }
    } catch {}
  }, []);

  // Safe seek
  const seekPlayer = React.useCallback((deltaSeconds: number) => {
    if (!playerRef.current) return;
    try {
      const currentTime = playerRef.current.getCurrentTime?.();
      if (typeof currentTime === "number") {
        playerRef.current.seekTo?.(Math.max(0, currentTime + deltaSeconds), true);
      }
    } catch {}
  }, []);

  // Native YouTube-style seek with accumulated seconds and on-screen ripple animation
  const handleSeek = React.useCallback(
    (deltaSeconds: number) => {
      seekPlayer(deltaSeconds);
      const direction = deltaSeconds > 0 ? "forward" : "backward";

      setSeekFeedback((prev) => {
        const isSameDirection = prev && prev.direction === direction;
        const newSeconds = isSameDirection
          ? prev.seconds + Math.abs(deltaSeconds)
          : Math.abs(deltaSeconds);
        return {
          direction,
          seconds: newSeconds,
          key: Date.now(),
        };
      });

      if (seekTimerRef.current) {
        clearTimeout(seekTimerRef.current);
      }
      seekTimerRef.current = setTimeout(() => {
        setSeekFeedback(null);
      }, 700);
    },
    [seekPlayer]
  );

  const handleContainerMouseMove = () => {
    if (document.activeElement?.tagName === "IFRAME") {
      containerRef.current?.focus();
    }
  };

  // Reclaim focus from iframe so keyboard shortcuts always respond even after mouse clicks
  React.useEffect(() => {
    const reclaimFocus = () => {
      if (
        document.activeElement &&
        document.activeElement.tagName === "IFRAME"
      ) {
        containerRef.current?.focus();
        window.focus();
      }
    };

    window.addEventListener("blur", () => {
      setTimeout(reclaimFocus, 50);
      setTimeout(reclaimFocus, 150);
      setTimeout(reclaimFocus, 350);
    });

    const interval = setInterval(reclaimFocus, 300);

    return () => {
      clearInterval(interval);
      window.removeEventListener("blur", reclaimFocus);
    };
  }, []);

  // Listen for fullscreen changes to know when the player is in native fullscreen
  React.useEffect(() => {
    const handleFsChange = () => {
      const fs = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement
      );
      setIsFullscreen(fs);
    };

    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    document.addEventListener("mozfullscreenchange", handleFsChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
      document.removeEventListener("mozfullscreenchange", handleFsChange);
    };
  }, []);

  // Manage Top-Layer Popover for 2x speed in fullscreen mode
  React.useEffect(() => {
    const el = speedPopoverRef.current as any;
    if (!el || typeof el.showPopover !== "function") return;
    const isFs = Boolean(
      isFullscreen ||
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement
    );

    try {
      if (is2xSpeed && isFs) {
        if (!el.matches?.(":popover-open")) {
          el.showPopover();
        }
      } else {
        if (el.matches?.(":popover-open")) {
          el.hidePopover();
        }
      }
    } catch {}
  }, [is2xSpeed, isFullscreen]);

  // Manage Top-Layer Popover for Seek Feedback in fullscreen mode
  React.useEffect(() => {
    const el = seekPopoverRef.current as any;
    if (!el || typeof el.showPopover !== "function") return;
    const isFs = Boolean(
      isFullscreen ||
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement
    );

    try {
      if (seekFeedback && isFs) {
        if (!el.matches?.(":popover-open")) {
          el.showPopover();
        }
      } else {
        if (el.matches?.(":popover-open")) {
          el.hidePopover();
        }
      }
    } catch {}
  }, [seekFeedback, isFullscreen]);

  // Global Keyboard Shortcuts: Spacebar (tap play/pause, hold 2x), Left/Right arrows (seek), 'T' (Theater), 'F' (Fullscreen)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      if (
        tagName === "input" ||
        tagName === "textarea" ||
        target?.isContentEditable
      ) {
        return;
      }

      // Spacebar: Hold for ~500ms to 2x speed, tap for play/pause
      if (e.code === "Space" || e.key === " ") {
        if (
          document.activeElement instanceof HTMLButtonElement ||
          document.activeElement instanceof HTMLAnchorElement
        ) {
          document.activeElement.blur();
          containerRef.current?.focus();
        }
        e.preventDefault();
        e.stopPropagation();
        if (e.repeat) return; // Prevent repeated keydown when held
        spaceDownTimeRef.current = Date.now();
        is2xActiveFromSpaceRef.current = false;

        if (spaceHoldTimerRef.current) {
          clearTimeout(spaceHoldTimerRef.current);
        }

        // Only start 2x if held continuously for at least 500ms
        spaceHoldTimerRef.current = setTimeout(() => {
          is2xActiveFromSpaceRef.current = true;
          start2xSpeed();
        }, 500);

        return;
      }

      // 'T' key: Toggle YouTube Theater Mode (big screens only)
      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        if (typeof window !== "undefined" && window.innerWidth >= 768) {
          toggleTheaterMode();
        }
        return;
      }

      // 'F' key: Toggle Fullscreen
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
        return;
      }

      // ArrowRight: Seek +5s
      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleSeek(5);
        return;
      }

      // ArrowLeft: Seek -5s
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleSeek(-5);
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      if (
        tagName === "input" ||
        tagName === "textarea" ||
        target?.isContentEditable
      ) {
        return;
      }

      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();

        // Clear the hold timer immediately
        if (spaceHoldTimerRef.current) {
          clearTimeout(spaceHoldTimerRef.current);
          spaceHoldTimerRef.current = null;
        }

        if (is2xActiveFromSpaceRef.current) {
          // Space was held long enough to activate 2x fast-forward -> revert speed, don't toggle play/pause
          is2xActiveFromSpaceRef.current = false;
          stop2xSpeed();
        } else {
          // Released before hold threshold (quick tap) -> pure play/pause toggle without 2x ever triggering!
          togglePlayPause();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, { passive: false });
    window.addEventListener("keyup", handleKeyUp, { passive: false });

    return () => {
      if (spaceHoldTimerRef.current) {
        clearTimeout(spaceHoldTimerRef.current);
      }
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    start2xSpeed,
    stop2xSpeed,
    togglePlayPause,
    handleSeek,
    toggleTheaterMode,
    toggleFullscreen,
  ]);

  const handleTogglePrivacy = () => {
    const nextStatus = optimisticPrivacy === "public" ? "unlisted" : "public";
    startPrivacyTransition(async () => {
      setOptimisticPrivacy(nextStatus);
      const res = await toggleVideoPrivacy(youtubeVideoId, nextStatus);
      if (res.success) {
        toast.success(res.message, { description: title });
      } else {
        toast.error(res.message, { description: title });
        setOptimisticPrivacy(optimisticPrivacy);
      }
    });
  };

  const handleToggle = () => {
    const nextWatched = !optimisticWatched;
    startTransition(async () => {
      setOptimisticWatched(nextWatched);
      if (nextWatched) {
        toast.success("Marked as watched", {
          description: title,
        });
      } else {
        toast.info("Marked as unwatched", {
          description: title,
        });
      }
      await toggleWatched(videoId, nextWatched);
    });
  };

  const handleVideoEnd = () => {
    if (!optimisticWatched && !hasAutoMarked) {
      setHasAutoMarked(true);
      startTransition(async () => {
        setOptimisticWatched(true);
        toast.success("Video completed", {
          description: "Progress saved automatically.",
        });
        await toggleWatched(videoId, true);
      });
    }
  };

  const handlePlayerStateChange = (event: any) => {
    const state = event.data;
    if (state === 1) {
      setIsPlaying(true);
    } else if (state === 2) {
      setIsPlaying(false);
    }
    if (state === 0) {
      handleVideoEnd();
    }
  };

  const isIntensive = moduleType === "intensive";
  const isSubjectHacks = moduleType === "subject-hacks";

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ── Location / Navigation Breadcrumb ── */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center flex-wrap gap-1.5 sm:gap-2 text-xs text-muted-foreground"
      >
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted/60 transition-colors text-foreground/80 hover:text-foreground font-medium"
        >
          <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Dashboard</span>
        </Link>

        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />

        <Link
          href={moduleHref}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted/60 transition-colors text-foreground/80 hover:text-foreground font-medium"
        >
          {isIntensive ? (
            <Flame className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          ) : isSubjectHacks ? (
            <Lightbulb className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          ) : (
            <Tv className="h-3.5 w-3.5 text-[#25A8A2] shrink-0" />
          )}
          <span>{moduleName}</span>
        </Link>

        {playlistName && playlistName !== moduleName && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
            <span
              className="px-2 py-1 rounded-lg text-foreground/75 font-medium max-w-[180px] sm:max-w-[280px] truncate"
              title={playlistName}
            >
              {playlistName}
            </span>
          </>
        )}

        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />

        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-muted/60 text-foreground dark:bg-[#141E28] dark:text-[#E8EDF0]">
          Class {position + 1}
        </span>
      </nav>

      {/* ── Video Title & Meta Bar ── */}
      <div className="space-y-2.5">
        <h1 className="font-heading text-xl font-extrabold tracking-tight text-foreground sm:text-2xl md:text-3xl leading-tight">
          {title}
        </h1>
        <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
          {duration > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/80 px-2.5 py-1 font-mono font-medium shadow-2xs dark:border-[#1F2C34] dark:bg-[#111820]">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{formatDuration(duration)}</span>
            </span>
          )}

          <span
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-medium transition-colors shadow-2xs ${
              optimisticWatched
                ? isIntensive
                  ? "border-amber-500/30 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300"
                  : isSubjectHacks
                  ? "border-blue-500/30 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300"
                  : "border-emerald-500/30 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-border/60 bg-card/80 text-muted-foreground dark:border-[#1F2C34] dark:bg-[#111820]"
            }`}
          >
            {optimisticWatched ? (
              <>
                <CheckCircle2
                  className={`h-3.5 w-3.5 ${
                    isIntensive
                      ? "text-amber-600 dark:text-amber-400"
                      : isSubjectHacks
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                />
                <span className="font-semibold">Watched</span>
              </>
            ) : (
              <>
                <Circle className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span>Not watched</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Top-layer Popover for 2X Speed Indicator in Native Fullscreen */}
      <div
        ref={speedPopoverRef}
        popover="manual"
        className="fixed top-6 sm:top-10 left-1/2 -translate-x-1/2 m-0 p-0 border-none bg-transparent shadow-none pointer-events-none z-[999999] overflow-visible [&::backdrop]:hidden outline-none"
      >
        <div className="flex items-center gap-1.5 rounded-full px-4 py-1.5 shadow-2xl backdrop-blur-md border border-white/10 bg-black/85 text-white select-none">
          <span className="text-xs sm:text-sm font-semibold tracking-wide text-white">
            2x
          </span>
          <ChevronsRight className="h-4 w-4 fill-white text-white" />
        </div>
      </div>

      {/* Top-layer Popover for Seek Feedback in Native Fullscreen */}
      <div
        ref={seekPopoverRef}
        popover="manual"
        style={
          seekFeedback?.direction === "forward"
            ? { left: "auto", right: "3.5rem" }
            : { right: "auto", left: "3.5rem" }
        }
        className="fixed top-1/2 -translate-y-1/2 m-0 p-0 border-none bg-transparent shadow-none pointer-events-none z-[999999] overflow-visible [&::backdrop]:hidden outline-none"
      >
        {seekFeedback && (
          <div className="flex flex-col items-center justify-center rounded-full bg-black/80 px-5 py-4 text-white shadow-2xl backdrop-blur-md border border-white/10 animate-in fade-in zoom-in-75 duration-150 select-none">
            {seekFeedback.direction === "forward" ? (
              <div className="flex items-center text-white mb-1">
                <ChevronsRight className="h-7 w-7 fill-white stroke-none animate-pulse" />
              </div>
            ) : (
              <div className="flex items-center text-white mb-1">
                <ChevronsLeft className="h-7 w-7 fill-white stroke-none animate-pulse" />
              </div>
            )}
            <span className="font-mono text-xs font-bold tracking-wider">
              {seekFeedback.seconds} seconds
            </span>
          </div>
        )}
      </div>

      {/* ── Theater Mode: Full-screen dark backdrop (big screens only) ── */}
      {isTheaterMode && (
        <div
          className="hidden md:block fixed inset-0 z-40 bg-[#080b0e]/97 backdrop-blur-[2px] transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* ── YouTube Player Container ── */}
      {/* Spacer: keeps page layout stable when player is fixed in theater mode */}
      {isTheaterMode && (
        <div className="hidden md:block w-full aspect-video" aria-hidden="true" />
      )}

      <div
        ref={containerRef}
        tabIndex={0}
        onMouseMove={handleContainerMouseMove}
        onMouseEnter={() => containerRef.current?.focus()}
        className={cn(
          "group relative bg-black outline-none select-none overflow-hidden",
          isTheaterMode
            ? "rounded-2xl border border-border/60 shadow-xl dark:border-[#1F2C34] md:border-0 md:fixed md:z-50 md:top-[calc(2rem+50dvh)] md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[min(96vw,calc((100dvh-4rem-16px)*16/9))] md:shadow-[0_0_100px_rgba(0,0,0,0.95)] md:rounded-2xl md:ring-1 md:ring-white/10 md:transition-none"
            : "rounded-2xl border border-border/60 shadow-xl dark:border-[#1F2C34] transition-all duration-300"
        )}
      >
        {/* Theater Mode Toggle Button on Player (Hidden on small screens, visible on big screens only) */}
        {!isFullscreen && (
          <button
            type="button"
            onClick={toggleTheaterMode}
            title={isTheaterMode ? "Default view (t)" : "Theater mode (t)"}
            className="absolute top-3 right-3 z-30 hidden md:flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-black/75 text-white/85 hover:text-white hover:bg-black/95 backdrop-blur-md border border-white/15 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 active:scale-95 cursor-pointer shadow-lg"
          >
            {isTheaterMode ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <rect x="6" y="7" width="12" height="10" rx="1" fill="currentColor" opacity="0.6" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <rect x="4" y="6" width="16" height="12" rx="1" fill="currentColor" opacity="0.6" />
              </svg>
            )}
          </button>
        )}

        {/* Floating 2X Speed Indicator Overlay (YouTube Style) */}
        <div
          aria-live="polite"
          className={cn(
            "pointer-events-none absolute top-4 sm:top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 rounded-full px-4 py-1.5 shadow-lg backdrop-blur-md transition-all duration-150 border border-white/10 select-none",
            is2xSpeed
              ? "opacity-100 scale-100 bg-black/80 text-white"
              : "opacity-0 scale-95"
          )}
        >
          <span className="text-xs sm:text-sm font-semibold tracking-wide text-white">
            2x
          </span>
          <ChevronsRight className="h-4 w-4 fill-white text-white" />
        </div>

        {/* Native YouTube-style On-Screen Seek Ripple Animation */}
        {seekFeedback && (
          <div
            key={seekFeedback.key}
            style={
              seekFeedback.direction === "forward"
                ? { left: "auto", right: "2.5rem" }
                : { right: "auto", left: "2.5rem" }
            }
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 z-50 flex flex-col items-center justify-center animate-in fade-in zoom-in-75 duration-150 select-none"
          >
            <div className="flex flex-col items-center justify-center rounded-full bg-black/75 px-5 py-4 text-white shadow-2xl backdrop-blur-md border border-white/10">
              {seekFeedback.direction === "forward" ? (
                <div className="flex items-center text-white mb-1">
                  <ChevronsRight className="h-7 w-7 fill-white stroke-none animate-pulse" />
                </div>
              ) : (
                <div className="flex items-center text-white mb-1">
                  <ChevronsLeft className="h-7 w-7 fill-white stroke-none animate-pulse" />
                </div>
              )}
              <span className="font-mono text-xs font-bold tracking-wider">
                {seekFeedback.seconds} seconds
              </span>
            </div>
          </div>
        )}

        {/* Video Frame: strictly keeps 16:9 aspect ratio */}
        <div className="relative select-none w-full overflow-hidden aspect-video">
          <YouTube
            videoId={youtubeVideoId}
            onReady={handlePlayerReady}
            onEnd={handleVideoEnd}
            onStateChange={handlePlayerStateChange}
            opts={{
              width: "100%",
              height: "100%",
              playerVars: {
                autoplay: 0,
                modestbranding: 0,
                rel: 0,
                fs: 1,
                enablejsapi: 1,
                playsinline: 1,
                origin:
                  typeof window !== "undefined"
                    ? window.location.origin
                    : undefined,
              },
            }}
            className="w-full h-full [&>div]:!h-full [&>div]:!w-full [&_iframe]:!h-full [&_iframe]:!w-full pointer-events-auto"
          />
        </div>
      </div>

      {/* ── Action Control Bar (hidden in theater mode on big screens) ── */}
      <div className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/90 p-3 sm:p-4 shadow-sm backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820]",
        isTheaterMode && "md:hidden"
      )}>
        {/* Top: Back to Module & Speed Presets */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <Button
            asChild
            variant="outline"
            className="h-10 sm:h-11 w-full sm:w-auto rounded-xl gap-2 text-xs font-semibold dark:border-[#1F2C34] dark:bg-[#141E28] dark:text-[#E8EDF0] dark:hover:bg-[#1F2C34] active:scale-[0.98] transition-all justify-center sm:justify-start"
          >
            <Link href={moduleHref}>
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span className="truncate">Back to {moduleName}</span>
            </Link>
          </Button>

          {/* Speed Presets & Desktop Hold 2x */}
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
            {/* Speed Presets */}
            <div className="flex items-center rounded-xl border border-border/60 bg-muted/40 p-1 dark:border-[#1F2C34] dark:bg-[#141E28]">
              {([1, 1.25, 1.5, 2] as const).map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => setPlayerSpeed(speed)}
                  title={`Set playback speed to ${speed}x`}
                  className={cn(
                    "h-8 px-2 sm:px-2.5 rounded-lg text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer",
                    currentRate === speed && !is2xSpeed
                      ? isIntensive
                        ? "bg-amber-500 text-white shadow-sm"
                        : isSubjectHacks
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-[#25A8A2] text-white shadow-sm"
                      : is2xSpeed && speed === 2
                      ? "bg-amber-500 text-white shadow-sm ring-1 ring-amber-400"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/80 dark:text-[#9AA7AE] dark:hover:text-white"
                  )}
                >
                  {speed}x
                </button>
              ))}
            </div>

            {/* Hold 2x Button: HIDDEN on small screens / mobile */}
            <button
              type="button"
              onMouseDown={start2xSpeed}
              onMouseUp={stop2xSpeed}
              onMouseLeave={stop2xSpeed}
              onTouchStart={(e) => {
                e.preventDefault();
                start2xSpeed();
              }}
              onTouchEnd={stop2xSpeed}
              title="Hold Spacebar or hold this button for 2x speed"
              className={cn(
                "hidden md:inline-flex h-11 items-center gap-1.5 rounded-xl border px-3 text-xs font-mono font-bold transition-all select-none cursor-pointer active:scale-95",
                is2xSpeed
                  ? "bg-amber-500 text-white border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                  : "border-border/60 bg-muted/40 text-muted-foreground hover:border-amber-500/40 hover:text-amber-500 dark:border-[#1F2C34] dark:bg-[#141E28] dark:text-[#9AA7AE]"
              )}
            >
              <Zap className={cn("h-3.5 w-3.5", is2xSpeed && "fill-white")} />
              <span>Hold 2x</span>
            </button>
          </div>
        </div>

        {/* Bottom: Action Buttons (Admin Privacy Toggle, Mark as Watched, Next Video) */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full pt-1 sm:pt-0 sm:justify-end">
          {/* Admin YouTube Privacy Toggle Button */}
          {isAdmin && (
            <Button
              type="button"
              onClick={handleTogglePrivacy}
              disabled={isTogglingPrivacy}
              title={
                optimisticPrivacy === "public"
                  ? "Privacy: Public (searchable on YouTube). Click to switch to Unlisted"
                  : "Privacy: Unlisted (accessible via link only). Click to switch to Public"
              }
              className={cn(
                "h-10 sm:h-11 rounded-xl gap-2 font-semibold shadow-xs transition-all duration-150 active:scale-[0.98] text-xs flex-1 sm:flex-initial min-w-0 border",
                optimisticPrivacy === "public"
                  ? "border-emerald-500/40 text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100/90 hover:border-emerald-500/60 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25 dark:hover:border-emerald-500/60"
                  : "border-border/80 text-foreground/80 bg-card/90 hover:bg-muted/70 hover:text-foreground hover:border-border dark:border-[#1F2C34] dark:bg-[#141E28] dark:text-[#E8EDF0] dark:hover:bg-[#1B2631] dark:hover:text-white dark:hover:border-[#25A8A2]/40"
              )}
            >
              {isTogglingPrivacy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  <span className="truncate">Updating…</span>
                </>
              ) : optimisticPrivacy === "public" ? (
                <>
                  <Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate">Public</span>
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 text-zinc-500 dark:text-[#9AA7AE] shrink-0" />
                  <span className="truncate">Unlisted</span>
                </>
              )}
            </Button>
          )}

          {/* Watched Toggle Button */}
          <Button
            variant={optimisticWatched ? "outline" : "default"}
            onClick={handleToggle}
            disabled={isPending}
            className={`flex-1 sm:flex-initial h-10 sm:h-11 rounded-xl gap-2 font-semibold shadow-sm transition-all active:scale-[0.98] text-xs min-w-0 ${
              optimisticWatched
                ? isIntensive
                  ? "border-amber-500/40 text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-400"
                  : isSubjectHacks
                  ? "border-blue-500/40 text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-400"
                  : "border-[#25A8A2]/40 text-[#25A8A2] bg-[#25A8A2]/10 hover:bg-[#25A8A2]/20 dark:border-[#25A8A2]/40 dark:bg-[#25A8A2]/15 dark:text-[#25A8A2]"
                : isIntensive
                ? "bg-amber-500 text-white hover:bg-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                : isSubjectHacks
                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-[0_0_10px_rgba(37,99,235,0.3)]"
                : "bg-primary text-primary-foreground dark:bg-[#25A8A2] dark:text-white dark:hover:bg-[#20928D] dark:shadow-[0_0_10px_rgba(37,168,162,0.3)]"
            }`}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            ) : optimisticWatched ? (
              <Check className="h-4 w-4 stroke-[3] shrink-0" />
            ) : (
              <Circle className="h-4 w-4 shrink-0" />
            )}
            <span className="truncate">
              {optimisticWatched ? "Watched" : "Mark as Watched"}
            </span>
          </Button>

          {/* Next Video Button (if available) */}
          {nextVideoId && (
            <Button
              asChild
              className={`flex-1 sm:flex-initial h-10 sm:h-11 rounded-xl gap-2 font-semibold shadow-sm text-xs active:scale-[0.98] transition-all min-w-0 ${
                isIntensive
                  ? "bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-600"
                  : isSubjectHacks
                  ? "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
                  : "bg-primary text-primary-foreground dark:bg-[#25A8A2] dark:text-white dark:hover:bg-[#20928D]"
              }`}
            >
              <Link href={`/watch/${nextVideoId}`} className="min-w-0">
                <span className="truncate">Next</span>
                <SkipForward className="h-4 w-4 shrink-0" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* ── Description Box (hidden in theater mode on big screens) ── */}
      {description && (
        <div className={cn(
          "rounded-2xl border border-border/60 bg-card/90 p-4 sm:p-5 shadow-sm backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820]",
          isTheaterMode && "md:hidden"
        )}>
          <div className="mb-2.5 flex items-center gap-2 font-heading font-bold text-sm tracking-tight text-foreground dark:text-[#E8EDF0]">
            <FileText
              className={`h-4 w-4 ${
                isIntensive
                  ? "text-amber-500"
                  : isSubjectHacks
                  ? "text-blue-500"
                  : "text-muted-foreground dark:text-[#25A8A2]"
              }`}
            />
            <span>Description</span>
          </div>
          <p className="whitespace-pre-line text-xs sm:text-sm leading-relaxed text-muted-foreground dark:text-[#9AA7AE]">
            {description}
          </p>
        </div>
      )}
    </div>
  );
}
