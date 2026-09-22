"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useOptimistic, useTransition } from "react";
import { toggleWatched, updatePlaybackProgress } from "@/app/actions/progress";
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
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  SkipForward,
  Tv,
  Volume1,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { ConnectedExamCard } from "./connected-exam-card";
import type { ExamItem } from "@/lib/exams";

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
  initialProgressSeconds?: number;
  nextVideoId: string | null;
  isAdmin?: boolean;
  privacyStatus?: string | null;
  connectedExam?: ExamItem | null;
  initialExamAttempt?: {
    score: number;
    total: number;
    selectedAnswers: Record<string, string>;
  } | null;
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
  initialProgressSeconds = 0,
  nextVideoId,
  isAdmin = false,
  privacyStatus,
  connectedExam,
  initialExamAttempt,
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
  const [isPlayerReady, setIsPlayerReady] = React.useState(false);
  const [currentVolume, setCurrentVolume] = React.useState<number>(100);
  const [isMuted, setIsMuted] = React.useState<boolean>(false);
  const [volumeFeedback, setVolumeFeedback] = React.useState<{
    volume: number;
    isMuted: boolean;
    key: number;
  } | null>(null);
  const seekTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const volumeTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Reset player ready state when switching to a different video
  React.useEffect(() => {
    setIsPlayerReady(false);
  }, [youtubeVideoId]);

  // Sync document fullscreen state
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement
      );
      setIsFullscreen(isFs);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
    };
  }, []);

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

  // Scroll position store when toggling theater mode
  const scrollPositionRef = React.useRef<number>(0);

  // Lock all scrolling and style body when Theater Mode is active on big screens
  React.useEffect(() => {
    if (isTheaterMode && typeof window !== "undefined" && window.innerWidth >= 768) {
      document.body.classList.add("theater-mode-active");
      const originalHtmlOverflow = document.documentElement.style.overflow;
      const originalHtmlOverscroll = document.documentElement.style.overscrollBehavior;
      const originalBodyOverflow = document.body.style.overflow;
      const originalBodyOverscroll = document.body.style.overscrollBehavior;
      const originalTouchAction = document.body.style.touchAction;

      // Lock document root and body
      document.documentElement.style.overflow = "hidden";
      document.documentElement.style.overscrollBehavior = "none";
      document.body.style.overflow = "hidden";
      document.body.style.overscrollBehavior = "none";
      document.body.style.touchAction = "none";

      // Focus player container so Escape and other keyboard controls respond immediately
      setTimeout(() => {
        containerRef.current?.focus();
      }, 50);

      // Prevent wheel / trackpad momentum scrolling
      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
      };

      // Prevent touch drag scrolling
      const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault();
      };

      // Prevent scroll keys
      const handleKeyDown = (e: KeyboardEvent) => {
        const scrollKeys = ["PageUp", "PageDown", "End", "Home", "ArrowUp", "ArrowDown", " "];
        if (scrollKeys.includes(e.key)) {
          const target = e.target as HTMLElement;
          if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
            return;
          }
          if (["PageUp", "PageDown", "End", "Home", "ArrowUp", "ArrowDown"].includes(e.key)) {
            e.preventDefault();
          }
        }
      };

      window.addEventListener("wheel", handleWheel, { passive: false });
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("keydown", handleKeyDown);

      return () => {
        document.body.classList.remove("theater-mode-active");
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.documentElement.style.overscrollBehavior = originalHtmlOverscroll;
        document.body.style.overflow = originalBodyOverflow;
        document.body.style.overscrollBehavior = originalBodyOverscroll;
        document.body.style.touchAction = originalTouchAction;
        window.removeEventListener("wheel", handleWheel);
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
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
  const previousRateRef = React.useRef<number>(1);
  const isHoldingSpaceRef = React.useRef<boolean>(false);
  const spaceDownTimeRef = React.useRef<number>(0);
  const spaceHoldTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const is2xActiveFromSpaceRef = React.useRef<boolean>(false);
  const hasResumedRef = React.useRef<boolean>(false);

  // Reset resume guard whenever the video changes
  React.useEffect(() => {
    hasResumedRef.current = false;
  }, [videoId]);

  const isNearEnd = React.useMemo(() => {
    return Boolean(
      duration && duration > 0 && initialProgressSeconds >= duration - 15
    );
  }, [duration, initialProgressSeconds]);

  const initialStartSecondsRef = React.useRef(initialProgressSeconds);
  React.useEffect(() => {
    initialStartSecondsRef.current = initialProgressSeconds;
  }, [youtubeVideoId]);

  const playerOpts = React.useMemo(
    () => ({
      width: "100%",
      height: "100%",
      playerVars: {
        autoplay: 0,
        start:
          initialStartSecondsRef.current && initialStartSecondsRef.current > 5 && !isNearEnd
            ? Math.floor(initialStartSecondsRef.current)
            : undefined,
        controls: 1,
        modestbranding: 1,
        rel: 0,
        fs: 0,
        enablejsapi: 1,
        playsinline: 1,
        iv_load_policy: 3,
        cc_load_policy: 0,
      },
    }),
    [youtubeVideoId, isNearEnd]
  );

  const toggleTheaterMode = React.useCallback(() => {
    // Theater mode is strictly for big screens (>= 768px)
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return;
    }
    setIsTheaterMode((prev) => {
      if (!prev) {
        // Entering theater mode: record scroll position & scroll to top
        if (typeof window !== "undefined") {
          scrollPositionRef.current = window.scrollY;
          window.scrollTo({ top: 0, behavior: "instant" });
        }
        return true;
      } else {
        // Exiting theater mode: restore previous scroll position
        if (typeof window !== "undefined") {
          const targetY = scrollPositionRef.current;
          setTimeout(() => {
            window.scrollTo({ top: targetY, behavior: "instant" });
          }, 30);
        }
        return false;
      }
    });
  }, []);

  const toggleFullscreen = React.useCallback(async () => {
    const fsEl =
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement;

    if (!fsEl && !isFullscreen) {
      const container = containerRef.current as any;
      if (container) {
        try {
          if (container.requestFullscreen) {
            await container.requestFullscreen();
          } else if (container.webkitRequestFullscreen) {
            container.webkitRequestFullscreen();
          } else {
            setIsFullscreen(true);
          }
        } catch {
          setIsFullscreen(true);
        }
      } else {
        setIsFullscreen(true);
      }
    } else {
      try {
        if (document.exitFullscreen && document.fullscreenElement) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen && (document as any).webkitFullscreenElement) {
          (document as any).webkitExitFullscreen();
        }
      } catch {}
      setIsFullscreen(false);
    }
  }, [isFullscreen]);

  // Initialize YouTube player instance and enforce proper iframe attributes
  const handlePlayerReady = (event: any) => {
    playerRef.current = event.target;
    setIsPlayerReady(true);
    setTimeout(() => {
      containerRef.current?.focus();
    }, 50);
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
      const initialVol = event.target.getVolume?.();
      if (typeof initialVol === "number" && initialVol >= 0) {
        setCurrentVolume(initialVol);
      }
      const initialMuted = event.target.isMuted?.();
      if (typeof initialMuted === "boolean") {
        setIsMuted(initialMuted);
      }

      // Resume from previous progress if > 5 seconds and not at end (deduplicated: exactly once per video)
      if (initialProgressSeconds > 5 && !isNearEnd && !hasResumedRef.current) {
        hasResumedRef.current = true;
        event.target.seekTo?.(initialProgressSeconds, true);
        toast.info(`Resumed from ${formatDuration(initialProgressSeconds)}`, {
          id: `video-resume-${videoId}`,
          duration: 3000,
        });
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
    if (!playerRef.current) return;
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
    isHoldingSpaceRef.current = false;
    is2xActiveFromSpaceRef.current = false;
    setIs2xSpeed(false);

    if (!playerRef.current) return;
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
      const currentTimeVal = playerRef.current.getCurrentTime?.();
      if (typeof currentTimeVal === "number") {
        const nextTime = Math.max(0, currentTimeVal + deltaSeconds);
        playerRef.current.seekTo?.(nextTime, true);
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

  // Dedicated volume modifiers
  const changeVolume = React.useCallback((delta: number) => {
    if (!playerRef.current) return;
    try {
      let currentVol = playerRef.current.getVolume?.();
      if (typeof currentVol !== "number" || isNaN(currentVol)) {
        currentVol = currentVolume;
      }
      const wasMuted = playerRef.current.isMuted?.();
      if (wasMuted && delta > 0) {
        playerRef.current.unMute?.();
        setIsMuted(false);
      }
      const newVol = Math.min(100, Math.max(0, Math.round(currentVol + delta)));
      playerRef.current.setVolume?.(newVol);
      setCurrentVolume(newVol);
      const isNowMuted = newVol === 0;
      setIsMuted(isNowMuted);

      setVolumeFeedback({
        volume: newVol,
        isMuted: isNowMuted,
        key: Date.now(),
      });

      if (volumeTimerRef.current) {
        clearTimeout(volumeTimerRef.current);
      }
      volumeTimerRef.current = setTimeout(() => {
        setVolumeFeedback(null);
      }, 1200);
    } catch {}
  }, [currentVolume]);

  const toggleMute = React.useCallback(() => {
    if (!playerRef.current) return;
    try {
      const muted = playerRef.current.isMuted?.();
      if (muted) {
        playerRef.current.unMute?.();
        setIsMuted(false);
        const vol = playerRef.current.getVolume?.() || 100;
        setCurrentVolume(vol);
        setVolumeFeedback({
          volume: vol,
          isMuted: false,
          key: Date.now(),
        });
      } else {
        playerRef.current.mute?.();
        setIsMuted(true);
        setVolumeFeedback({
          volume: 0,
          isMuted: true,
          key: Date.now(),
        });
      }

      if (volumeTimerRef.current) {
        clearTimeout(volumeTimerRef.current);
      }
      volumeTimerRef.current = setTimeout(() => {
        setVolumeFeedback(null);
      }, 1200);
    } catch {}
  }, []);



  const handlersRef = React.useRef({
    start2xSpeed,
    stop2xSpeed,
    togglePlayPause,
    handleSeek,
    changeVolume,
    toggleMute,
    toggleTheaterMode,
    toggleFullscreen,
    isTheaterMode,
    isFullscreen,
  });

  React.useEffect(() => {
    handlersRef.current = {
      start2xSpeed,
      stop2xSpeed,
      togglePlayPause,
      handleSeek,
      changeVolume,
      toggleMute,
      toggleTheaterMode,
      toggleFullscreen,
      isTheaterMode,
      isFullscreen,
    };
  });

  // Global Keyboard Shortcuts: Spacebar (tap play/pause, hold 2x), Arrows (seek / volume), 'M' (mute), 'T' (Theater), 'F' (Fullscreen)
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

      const {
        start2xSpeed,
        handleSeek,
        changeVolume,
        toggleMute,
        toggleTheaterMode,
        toggleFullscreen,
        isTheaterMode,
        isFullscreen,
      } = handlersRef.current;

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

      // Escape key: Exit theater mode (when not in native fullscreen)
      if (e.key === "Escape" || e.code === "Escape") {
        const isFs = Boolean(
          isFullscreen ||
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement
        );
        if (isTheaterMode && !isFs) {
          e.preventDefault();
          e.stopPropagation();
          toggleTheaterMode();
          return;
        }
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

      // ArrowUp: Volume +5%
      if (e.key === "ArrowUp") {
        e.preventDefault();
        changeVolume(5);
        return;
      }

      // ArrowDown: Volume -5%
      if (e.key === "ArrowDown") {
        e.preventDefault();
        changeVolume(-5);
        return;
      }

      // 'M' or 'm': Toggle Mute
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMute();
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

      const { stop2xSpeed, togglePlayPause } = handlersRef.current;

      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();

        const wasHeld = is2xActiveFromSpaceRef.current;

        // Clear the hold timer immediately
        if (spaceHoldTimerRef.current) {
          clearTimeout(spaceHoldTimerRef.current);
          spaceHoldTimerRef.current = null;
        }

        is2xActiveFromSpaceRef.current = false;
        stop2xSpeed();

        if (!wasHeld) {
          // Released before hold threshold (quick tap) -> pure play/pause toggle without 2x ever triggering!
          togglePlayPause();
        }
      }
    };

    const handleSafetyBlur = () => {
      if (spaceHoldTimerRef.current) {
        clearTimeout(spaceHoldTimerRef.current);
        spaceHoldTimerRef.current = null;
      }
      is2xActiveFromSpaceRef.current = false;
      handlersRef.current.stop2xSpeed();
    };

    window.addEventListener("keydown", handleKeyDown, { passive: false });
    window.addEventListener("keyup", handleKeyUp, { passive: false });
    window.addEventListener("blur", handleSafetyBlur);
    document.addEventListener("visibilitychange", handleSafetyBlur);

    return () => {
      if (spaceHoldTimerRef.current) {
        clearTimeout(spaceHoldTimerRef.current);
      }
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleSafetyBlur);
      document.removeEventListener("visibilitychange", handleSafetyBlur);
    };
  }, []);

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

    // Capture current playback position to keep watch progress intact
    let currentSec: number | undefined = undefined;
    try {
      const current = playerRef.current?.getCurrentTime?.();
      if (typeof current === "number" && current >= 0) {
        currentSec = Math.floor(current);
        lastSyncedSecondsRef.current = currentSec;
      }
    } catch {}

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
      await toggleWatched(videoId, nextWatched, currentSec);
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

  // Heartbeat to update playback progress while playing
  const lastSyncedSecondsRef = React.useRef<number>(initialProgressSeconds || 0);

  const syncProgress = React.useCallback(() => {
    if (!playerRef.current) return;
    try {
      const current = playerRef.current.getCurrentTime?.();
      if (typeof current === "number" && current >= 0) {
        const floorSec = Math.floor(current);
        // Only update if changed by at least 5 seconds
        if (Math.abs(floorSec - lastSyncedSecondsRef.current) >= 5) {
          lastSyncedSecondsRef.current = floorSec;
          updatePlaybackProgress(videoId, floorSec, duration);
        }
      }
    } catch {}
  }, [videoId, duration]);

  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      // Sync every 60 seconds while playing (reduces database & Vercel compute by ~85% while keeping exact resume position)
      interval = setInterval(() => {
        syncProgress();
      }, 60000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, syncProgress]);

  // Sync on unmount & beforeunload
  React.useEffect(() => {
    const handleBeforeUnload = () => {
      syncProgress();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      syncProgress();
    };
  }, [syncProgress]);

  const handlePlayerStateChange = (event: any) => {
    const state = event.data;
    if (state === 1) {
      setIsPlaying(true);
      setTimeout(() => {
        containerRef.current?.focus();
      }, 50);
    } else if (state === 2) {
      setIsPlaying(false);
      syncProgress();
      setTimeout(() => {
        containerRef.current?.focus();
      }, 50);
    }
    if (state === 0) {
      handleVideoEnd();
    }
  };

  const isIntensive = moduleType === "intensive";
  const isSubjectHacks = moduleType === "subject-hacks";
  const isLive = moduleType === "live" || (!isIntensive && !isSubjectHacks);

  React.useEffect(() => {
    const currentModule = isIntensive
      ? "intensive"
      : isSubjectHacks
      ? "subject-hacks"
      : "live";
    window.dispatchEvent(new CustomEvent("app:module", { detail: currentModule }));
    document.documentElement.dataset.currentModule = currentModule;
    return () => {
      delete document.documentElement.dataset.currentModule;
    };
  }, [isIntensive, isSubjectHacks]);

  return (
    <div className="video-player-root space-y-5 sm:space-y-6">
      {/* ── Location / Navigation Breadcrumb ── */}
      <nav
        aria-label="Breadcrumb"
        className={cn(
          "flex items-center flex-wrap gap-1.5 sm:gap-2 text-xs text-muted-foreground",
          isTheaterMode && "md:hidden"
        )}
      >
        <Link
          href="/dashboard"
          className="group inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted/60 transition-colors text-foreground/80 hover:text-foreground dark:text-[#9AA7AE] dark:hover:text-white dark:hover:bg-[#141E28] font-medium"
        >
          <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground dark:text-[#9AA7AE] dark:group-hover:text-white transition-colors" />
          <span>Dashboard</span>
        </Link>

        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 dark:text-[#5C6A72] shrink-0" />

        <Link
          href={moduleHref}
          className="group inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted/60 transition-colors text-foreground/80 hover:text-foreground dark:text-[#9AA7AE] dark:hover:text-white dark:hover:bg-[#141E28] font-medium"
        >
          {isIntensive ? (
            <Flame className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          ) : isSubjectHacks ? (
            <Lightbulb className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          ) : (
            <Tv className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
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
      <div className={cn("space-y-2.5", isTheaterMode && "md:hidden")}>
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



      {/* ── Theater Mode: Full-screen dark backdrop (big screens only) ── */}
      {isTheaterMode && (
        <div
          onClick={toggleTheaterMode}
          title="Click to exit theater mode (Esc)"
          className="hidden md:block fixed inset-0 z-[60] bg-[#080b0e]/97 backdrop-blur-[2px] transition-opacity duration-300 cursor-pointer"
          aria-label="Exit theater mode"
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
        onClick={() => containerRef.current?.focus()}
        onMouseEnter={() => containerRef.current?.focus()}
        className={cn(
          "group relative bg-black outline-none select-none overflow-hidden",
          isFullscreen
            ? "!fixed !inset-0 !w-screen !h-screen !max-w-none !max-h-none !top-0 !left-0 !transform-none !rounded-none !border-0 !m-0 !p-0 z-[999999] flex items-center justify-center bg-black"
            : isTheaterMode
            ? "rounded-2xl border border-border/60 shadow-xl dark:border-[#1F2C34] md:border-0 md:fixed md:inset-0 md:m-auto md:z-[70] md:w-[min(95vw,calc((100dvh-2.5rem)*16/9))] md:h-[min(calc(95vw*9/16),calc(100dvh-2.5rem))] md:aspect-video md:shadow-[0_0_100px_rgba(0,0,0,0.95)] md:rounded-2xl md:ring-1 md:ring-white/10 md:transition-none"
            : "rounded-2xl border border-border/60 shadow-xl dark:border-[#1F2C34] transition-all duration-300"
        )}
      >


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

        {/* On-Screen Volume Indicator Overlay */}
        {volumeFeedback && (
          <div
            key={volumeFeedback.key}
            className="pointer-events-none absolute top-4 sm:top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-full bg-black/85 px-4 py-2 text-white shadow-2xl backdrop-blur-md border border-white/15 animate-in fade-in zoom-in-90 duration-150 select-none"
          >
            {volumeFeedback.isMuted ? (
              <VolumeX className="h-4 w-4 text-red-400 shrink-0" />
            ) : volumeFeedback.volume <= 50 ? (
              <Volume1 className="h-4 w-4 text-white shrink-0" />
            ) : (
              <Volume2 className="h-4 w-4 text-white shrink-0" />
            )}
            <div className="w-16 sm:w-20 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-100",
                  volumeFeedback.isMuted
                    ? "bg-red-400"
                    : isIntensive
                    ? "bg-amber-500"
                    : isSubjectHacks
                    ? "bg-blue-500"
                    : "bg-emerald-400"
                )}
                style={{ width: `${volumeFeedback.isMuted ? 0 : volumeFeedback.volume}%` }}
              />
            </div>
            <span className="font-mono text-xs font-bold tracking-wider">
              {volumeFeedback.isMuted ? "Muted" : `${volumeFeedback.volume}%`}
            </span>
          </div>
        )}

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
        <div
          className={cn(
            "relative select-none overflow-hidden aspect-video bg-black",
            isFullscreen
              ? "w-full h-full max-w-[calc(100vh*16/9)] max-h-screen"
              : "w-full"
          )}
        >
          {/* Instant HD Thumbnail & Ambient Poster until YouTube Player is ready */}
          {!isPlayerReady && (
            <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden bg-[#0A0F12] select-none pointer-events-none transition-opacity duration-300">
              {/* Background Poster Thumbnail */}
              <img
                src={`https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`}
                alt={title}
                className="absolute inset-0 h-full w-full object-cover opacity-60 scale-[1.03] blur-[1px]"
                loading="eager"
              />
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

              {/* Center Status Indicator */}
              <div className="relative z-20 flex flex-col items-center gap-2.5">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/70 text-white shadow-2xl backdrop-blur-md border border-white/20 animate-pulse">
                  <Play className="h-6 w-6 ml-0.5 fill-white text-white" />
                </div>
                <div className="flex items-center gap-2 rounded-full bg-black/80 px-3.5 py-1 text-xs font-medium text-white/90 shadow-md backdrop-blur-md border border-white/10">
                  <Loader2 className={cn("h-3.5 w-3.5 animate-spin", isIntensive ? "text-amber-500" : isSubjectHacks ? "text-blue-500" : "text-emerald-400")} />
                  <span>Preparing player…</span>
                </div>
              </div>
            </div>
          )}

          {/* Native YouTube Player with Native 60fps Controls */}
          <YouTube
            videoId={youtubeVideoId}
            onReady={handlePlayerReady}
            onEnd={handleVideoEnd}
            onStateChange={handlePlayerStateChange}
            opts={playerOpts}
            className="w-full h-full [&>div]:!h-full [&>div]:!w-full [&_iframe]:!h-full [&_iframe]:!w-full pointer-events-auto"
          />

          {/* ── Invisible Click Shields: Blocks YouTube & Channel Navigation ── */}
          {/* 1. Top Header Shield: Covers channel avatar, channel name, and title on the left; leaves CC & Settings on the right 100% accessible */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              togglePlayPause();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
              togglePlayPause();
            }}
            title="Channel details"
            className="absolute top-0 left-0 right-48 sm:right-56 h-16 sm:h-20 z-20 cursor-pointer pointer-events-auto bg-transparent"
            aria-hidden="true"
          />

          {/* 2. Bottom Right Shield: Covers 'Watch on YouTube' pill or 'YouTube' logo firmly at bottom-0 */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              togglePlayPause();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
              togglePlayPause();
            }}
            title="Toggle playback"
            className={cn(
              "absolute bottom-0 right-0 z-30 cursor-pointer pointer-events-auto bg-transparent transition-all",
              isPlaying
                ? "w-44 h-14"
                : "w-72 sm:w-84 h-20 sm:h-24"
            )}
            aria-hidden="true"
          />

          {/* 3. Bottom Left Shield: Covers 'Copy link' button when paused/stopped */}
          {!isPlaying && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                togglePlayPause();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                e.preventDefault();
                togglePlayPause();
              }}
              title="Toggle playback"
              className="absolute bottom-0 left-0 w-28 sm:w-32 h-20 sm:h-24 z-30 cursor-pointer pointer-events-auto bg-transparent"
              aria-hidden="true"
            />
          )}

          {/* ── Theater & Fullscreen Toggle Buttons on Video Frame Bottom-Right (Idea B - Classic Spot) ── */}
          <div className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 z-40 flex items-center gap-1.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 pointer-events-auto">
            {/* Theater Mode Button (desktop / tablet only) */}
            {!isFullscreen && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTheaterMode();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  toggleTheaterMode();
                }}
                title={isTheaterMode ? "Default view (t)" : "Theater mode (t)"}
                className="hidden md:flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-black/80 text-white/90 hover:text-white hover:bg-black/95 backdrop-blur-md border border-white/20 transition-all active:scale-95 cursor-pointer shadow-lg"
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

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleFullscreen();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => {
                e.stopPropagation();
                toggleFullscreen();
              }}
              title={isFullscreen ? "Exit Fullscreen (f / Esc)" : "Fullscreen (f)"}
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-black/80 text-white/90 hover:text-white hover:bg-black/95 backdrop-blur-md border border-white/20 transition-all active:scale-95 cursor-pointer shadow-lg"
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Action Control Bar (hidden in theater mode on big screens) ── */}
      <div className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/90 p-3 sm:p-4 shadow-sm backdrop-blur-md dark:border-[#1F2C34] dark:bg-[#111820]",
        isTheaterMode && "md:hidden"
      )}>
        {/* Top: Back to Module & Speed Presets */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <Link
            href={moduleHref}
            className="group inline-flex items-center justify-center sm:justify-start h-10 sm:h-11 w-full sm:w-auto rounded-xl gap-2 px-4 text-xs font-semibold border border-border/80 bg-card text-foreground/90 hover:bg-muted/80 hover:text-foreground dark:border-[#1F2C34] dark:bg-[#141E28] dark:text-[#E8EDF0] dark:hover:bg-[#1F2C34] dark:hover:text-white active:scale-[0.98] transition-all shadow-xs cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground group-hover:-translate-x-0.5 dark:text-[#9AA7AE] dark:group-hover:text-white transition-all" />
            <span className="truncate">Back to {moduleName}</span>
          </Link>

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
                        : isLive
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-[#25A8A2] text-white shadow-sm"
                      : is2xSpeed && speed === 2
                      ? "bg-amber-500 text-white shadow-sm ring-1 ring-amber-400"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/80 dark:text-[#9AA7AE] dark:hover:text-white dark:hover:bg-[#1F2C34]"
                  )}
                >
                  {speed}x
                </button>
              ))}
            </div>

            {/* Mobile Admin YouTube Privacy Toggle Button (Sits right beside speed control on small screens) */}
            {isAdmin && (
              <button
                type="button"
                onClick={handleTogglePrivacy}
                disabled={isTogglingPrivacy}
                title={
                  optimisticPrivacy === "public"
                    ? "Privacy: Public (searchable on YouTube). Click to switch to Unlisted"
                    : "Privacy: Unlisted (accessible via link only). Click to switch to Public"
                }
                className={cn(
                  "sm:hidden inline-flex items-center justify-center h-10 rounded-xl gap-1.5 px-3 font-semibold shadow-xs transition-all duration-150 active:scale-[0.98] text-xs border shrink-0 cursor-pointer disabled:opacity-50 disabled:pointer-events-none group",
                  optimisticPrivacy === "public"
                    ? "border-emerald-500/40 text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100/90 hover:border-emerald-500/60 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25 dark:hover:border-emerald-500/60 dark:hover:text-emerald-200"
                    : cn(
                        "border-border/80 text-foreground/80 bg-card hover:bg-muted/80 hover:text-foreground hover:border-border dark:border-[#1F2C34] dark:bg-[#141E28] dark:text-[#E8EDF0] dark:hover:bg-[#1F2C34] dark:hover:text-white",
                        isLive ? "dark:hover:border-emerald-500/40" : "dark:hover:border-[#25A8A2]/40"
                      )
                )}
              >
                {isTogglingPrivacy ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-current" />
                    <span>Updating…</span>
                  </>
                ) : optimisticPrivacy === "public" ? (
                  <>
                    <Globe className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Public</span>
                  </>
                ) : (
                  <>
                    <Link2 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground dark:text-[#9AA7AE] dark:group-hover:text-white transition-colors shrink-0" />
                    <span>Unlisted</span>
                  </>
                )}
              </button>
            )}

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
                "group hidden md:inline-flex h-11 items-center gap-1.5 rounded-xl border px-3 text-xs font-mono font-bold transition-all select-none cursor-pointer active:scale-95",
                is2xSpeed
                  ? "bg-amber-500 text-white border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                  : "border-border/60 bg-muted/40 text-muted-foreground hover:border-amber-500/40 hover:text-amber-600 hover:bg-amber-500/10 dark:border-[#1F2C34] dark:bg-[#141E28] dark:text-[#9AA7AE] dark:hover:border-amber-500/50 dark:hover:text-amber-400 dark:hover:bg-amber-500/15"
              )}
            >
              <Zap className={cn("h-3.5 w-3.5 transition-colors", is2xSpeed ? "fill-white text-white" : "text-muted-foreground group-hover:text-amber-500 dark:text-[#9AA7AE] dark:group-hover:text-amber-400")} />
              <span>Hold 2x</span>
            </button>
          </div>
        </div>

        {/* Bottom: Action Buttons (Admin Privacy Toggle, Mark as Watched, Next Video) */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full pt-1 sm:pt-0 sm:justify-end">
          {/* Admin YouTube Privacy Toggle Button (Desktop / Tablet only) */}
          {isAdmin && (
            <button
              type="button"
              onClick={handleTogglePrivacy}
              disabled={isTogglingPrivacy}
              title={
                optimisticPrivacy === "public"
                  ? "Privacy: Public (searchable on YouTube). Click to switch to Unlisted"
                  : "Privacy: Unlisted (accessible via link only). Click to switch to Public"
              }
              className={cn(
                "hidden sm:inline-flex items-center justify-center h-10 sm:h-11 rounded-xl gap-2 font-semibold shadow-xs transition-all duration-150 active:scale-[0.98] text-xs sm:flex-initial min-w-0 border px-4 cursor-pointer disabled:opacity-50 disabled:pointer-events-none group",
                optimisticPrivacy === "public"
                  ? "border-emerald-500/40 text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100/90 hover:border-emerald-500/60 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25 dark:hover:border-emerald-500/60 dark:hover:text-emerald-200"
                  : cn(
                      "border-border/80 text-foreground/80 bg-card hover:bg-muted/80 hover:text-foreground hover:border-border dark:border-[#1F2C34] dark:bg-[#141E28] dark:text-[#E8EDF0] dark:hover:bg-[#1F2C34] dark:hover:text-white",
                      isLive ? "dark:hover:border-emerald-500/40" : "dark:hover:border-[#25A8A2]/40"
                    )
              )}
            >
              {isTogglingPrivacy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin shrink-0 text-current" />
                  <span className="truncate">Updating…</span>
                </>
              ) : optimisticPrivacy === "public" ? (
                <>
                  <Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate">Public</span>
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 text-muted-foreground group-hover:text-foreground dark:text-[#9AA7AE] dark:group-hover:text-white transition-colors shrink-0" />
                  <span className="truncate">Unlisted</span>
                </>
              )}
            </button>
          )}

          {/* Watched Toggle Button */}
          <button
            type="button"
            onClick={handleToggle}
            disabled={isPending}
            className={cn(
              "flex-1 sm:flex-initial inline-flex items-center justify-center h-10 sm:h-11 rounded-xl gap-2 font-semibold shadow-sm transition-all duration-150 active:scale-[0.98] text-xs min-w-0 px-4 cursor-pointer disabled:opacity-50 disabled:pointer-events-none border",
              optimisticWatched
                ? isIntensive
                  ? "border-amber-500/40 text-amber-700 bg-amber-500/10 hover:bg-amber-500/20 hover:text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-400 dark:hover:bg-amber-500/25 dark:hover:text-amber-300"
                  : isSubjectHacks
                  ? "border-blue-500/40 text-blue-700 bg-blue-500/10 hover:bg-blue-500/20 hover:text-blue-800 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-400 dark:hover:bg-blue-500/25 dark:hover:text-blue-300"
                  : "border-emerald-500/40 text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 hover:text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-400 dark:hover:bg-emerald-500/25 dark:hover:text-white"
                : isIntensive
                ? "bg-amber-500 text-white border-transparent hover:bg-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                : isSubjectHacks
                ? "bg-blue-600 text-white border-transparent hover:bg-blue-700 shadow-[0_0_10px_rgba(37,99,235,0.3)]"
                : "bg-emerald-600 text-white border-transparent hover:bg-emerald-700 shadow-[0_0_10px_rgba(16,185,129,0.3)] dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-500"
            )}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin shrink-0 text-current" />
            ) : optimisticWatched ? (
              <Check className="h-4 w-4 stroke-[3] shrink-0 text-current" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-current" />
            )}
            <span className="truncate">
              {optimisticWatched ? "Watched" : "Mark as Watched"}
            </span>
          </button>

          {/* Next Video Button (if available) */}
          {nextVideoId && (
            <Link
              href={`/watch/${nextVideoId}`}
              className={cn(
                "group flex-1 sm:flex-initial inline-flex items-center justify-center h-10 sm:h-11 rounded-xl gap-2 font-semibold shadow-sm text-xs active:scale-[0.98] transition-all min-w-0 px-4 cursor-pointer",
                isIntensive
                  ? "bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-500 dark:text-white dark:hover:bg-amber-600"
                  : isSubjectHacks
                  ? "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700"
                  : "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-500"
              )}
            >
              <span className="truncate">Next</span>
              <SkipForward className="h-4 w-4 shrink-0 text-white transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
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
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            />
            <span>Description</span>
          </div>
          <p className="whitespace-pre-line text-xs sm:text-sm leading-relaxed text-muted-foreground dark:text-[#9AA7AE]">
            {description}
          </p>
        </div>
      )}

      {/* ── Connected Daily Live Exam (Right after Description) ── */}
      {connectedExam && (
        <div className={cn(isTheaterMode && "md:hidden")}>
          <ConnectedExamCard
            exam={connectedExam}
            initialAttempt={initialExamAttempt}
          />
        </div>
      )}
    </div>
  );
}
