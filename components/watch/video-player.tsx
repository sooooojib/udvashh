"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useOptimistic, useTransition } from "react";
import {
  saveVideoDuration,
  toggleWatched,
  updatePlaybackProgress,
} from "@/app/actions/progress";
import { toggleVideoPrivacy } from "@/app/actions/toggle-privacy";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDuration } from "@/lib/utils/format";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
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
  Settings,
  SkipForward,
  SlidersHorizontal,
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

const PLAYBACK_SPEEDS = [1, 1.25, 1.5, 1.75, 2] as const;

const QUALITY_LABELS: Record<string, string> = {
  highres: "4K+ Ultra HD",
  hd2160: "2160p (4K)",
  hd1440: "1440p (2K)",
  hd1080: "1080p HD",
  hd720: "720p HD",
  large: "480p",
  medium: "360p",
  small: "240p",
  tiny: "144p",
  auto: "Auto",
  default: "Auto",
};

const DEFAULT_QUALITIES = [
  "auto",
  "hd1080",
  "hd720",
  "large",
  "medium",
  "small",
  "tiny",
];

// ── ClickSurface: Debounced single/double-click to prevent race condition ──
// Without this, double-clicking fires onClick TWICE before onDoubleClick.
// This 200ms debounce cancels the single-click if a double-click arrives.
function ClickSurface({
  onSingleClick,
  onDoubleClick,
  className,
}: {
  onSingleClick: () => void;
  onDoubleClick: (e: React.MouseEvent) => void;
  className?: string;
}) {
  const clickTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastClickEventRef = React.useRef<React.MouseEvent | null>(null);

  const handleClick = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      lastClickEventRef.current = e;
      if (clickTimerRef.current) {
        // Second click within 200ms → double-click
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
        onDoubleClick(e);
      } else {
        // First click → wait 200ms to see if it's a double
        clickTimerRef.current = setTimeout(() => {
          clickTimerRef.current = null;
          onSingleClick();
        }, 200);
      }
    },
    [onSingleClick, onDoubleClick]
  );

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    };
  }, []);

  return <div onClick={handleClick} className={className} />;
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
  const [isBuffering, setIsBuffering] = React.useState(false);
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
  const [speedFeedback, setSpeedFeedback] = React.useState<{
    speed: number;
    key: number;
  } | null>(null);

  // ── Custom Control Bar State ──
  const [currentTime, setCurrentTime] = React.useState(0);
  const [videoDuration, setVideoDuration] = React.useState(duration || 0);
  const [bufferedFraction, setBufferedFraction] = React.useState(0);
  const [isSeeking, setIsSeeking] = React.useState(false);
  const [seekPreview, setSeekPreview] = React.useState(0);
  const [showControls, setShowControls] = React.useState(true);
  const [showVolumeSlider, setShowVolumeSlider] = React.useState(false);
  const [seekHoverFraction, setSeekHoverFraction] = React.useState<number | null>(null);
  const [showSettingsMenu, setShowSettingsMenu] = React.useState(false);
  const [settingsView, setSettingsView] = React.useState<"main" | "speed" | "quality">("main");
  const [currentQuality, setCurrentQuality] = React.useState<string>("auto");
  const [availableQualities, setAvailableQualities] = React.useState<string[]>(DEFAULT_QUALITIES);
  const hideControlsTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const seekBarRef = React.useRef<HTMLDivElement>(null);
  const volumeSliderRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!showSettingsMenu) return;
    const handleOutsideClick = () => {
      setShowSettingsMenu(false);
      setSettingsView("main");
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [showSettingsMenu]);

  // Sync available quality levels from YouTube player.
  // Accepts an optional event target for synchronous access (youtube-player
  // promisifies all methods on playerRef, but event.target is synchronous).
  const syncQualities = React.useCallback((target?: any) => {
    const p = target || playerRef.current;
    if (!p) return;
    try {
      const levels = p.getAvailableQualityLevels?.();
      if (Array.isArray(levels) && levels.length > 0) {
        const fullLevels = levels.includes("auto") ? levels : ["auto", ...levels];
        setAvailableQualities(fullLevels);
      }
      const q = p.getPlaybackQuality?.();
      if (q && q !== "unknown") {
        setCurrentQuality(q);
      }
    } catch {}
  }, []);

  // Dedicated quality changer with feedback toast
  const setPlayerQuality = React.useCallback((quality: string) => {
    if (!playerRef.current) return;
    try {
      playerRef.current.setPlaybackQuality?.(quality);
      setCurrentQuality(quality);
      toast.success(`Quality set to ${QUALITY_LABELS[quality] || quality}`, {
        id: "player-quality-change",
        duration: 2000,
      });
    } catch {}
  }, []);

  const seekTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const volumeTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const speedTimerRef = React.useRef<NodeJS.Timeout | null>(null);

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

  // Sync document root attribute and body classes when Fullscreen is active
  React.useEffect(() => {
    if (isFullscreen) {
      document.documentElement.dataset.playerFullscreen = "true";
      document.body.classList.add("player-fullscreen-active");
      const originalHtmlOverflow = document.documentElement.style.overflow;
      const originalHtmlOverscroll = document.documentElement.style.overscrollBehavior;
      const originalBodyOverflow = document.body.style.overflow;
      const originalBodyOverscroll = document.body.style.overscrollBehavior;

      document.documentElement.style.overflow = "hidden";
      document.documentElement.style.overscrollBehavior = "none";
      document.body.style.overflow = "hidden";
      document.body.style.overscrollBehavior = "none";

      return () => {
        delete document.documentElement.dataset.playerFullscreen;
        document.body.classList.remove("player-fullscreen-active");
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.documentElement.style.overscrollBehavior = originalHtmlOverscroll;
        document.body.style.overflow = originalBodyOverflow;
        document.body.style.overscrollBehavior = originalBodyOverscroll;
      };
    }
  }, [isFullscreen]);

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
  // ── isPlayingRef: synchronous mirror of isPlaying state ──
  // youtube-player promisifies ALL API methods including getPlayerState().
  // That means playerRef.current.getPlayerState?.() returns a Promise, not a
  // number — so comparing it to === 1 is always false and the toggle always
  // went to the wrong branch. We solve this by maintaining a plain ref that is
  // updated synchronously inside handlePlayerStateChange (the reliable event).
  const isPlayingRef = React.useRef<boolean>(false);
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
        controls: 0,
        disablekb: 1,
        modestbranding: 1,
        rel: 0,
        fs: 0,
        enablejsapi: 1,
        playsinline: 1,
        iv_load_policy: 3,
        showinfo: 0,
      },
    }),
    [youtubeVideoId, isNearEnd]
  );

  // ── Progress Polling: Update currentTime & buffered every 100ms while playing ──
  React.useEffect(() => {
    if (!isPlaying || !playerRef.current) return;
    const poll = setInterval(() => {
      if (isSeeking) return;
      try {
        const t = playerRef.current?.getCurrentTime?.();
        if (typeof t === "number") setCurrentTime(t);
        const b = playerRef.current?.getVideoLoadedFraction?.();
        if (typeof b === "number") setBufferedFraction(b);
        const d = playerRef.current?.getDuration?.();
        if (typeof d === "number" && d > 0) handleDurationDetected(d);
      } catch {}
    }, 100);
    return () => clearInterval(poll);
  }, [isPlaying, isSeeking]);

  // ── Auto-hide Controls: Show on mouse activity, hide after 2.5s of idle ONLY when playing ──
  const resetControlsTimer = React.useCallback(() => {
    setShowControls((prev) => { if (!prev) return true; return prev; });
    if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    if (isPlaying) {
      hideControlsTimerRef.current = setTimeout(() => {
        if (!isSeeking && !showVolumeSlider && !showSettingsMenu) setShowControls(false);
      }, 2500);
    }
  }, [isPlaying, isSeeking, showVolumeSlider, showSettingsMenu]);

  // Controls stay visible 100% of the time when paused
  React.useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    } else {
      resetControlsTimer();
    }
  }, [isPlaying, resetControlsTimer]);

  // ── Seek Bar Interaction Handlers ──
  const getSeekFraction = React.useCallback((e: React.MouseEvent | MouseEvent | React.TouchEvent | TouchEvent) => {
    if (!seekBarRef.current) return 0;
    const rect = seekBarRef.current.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0]?.clientX ?? (e as TouchEvent).changedTouches?.[0]?.clientX ?? 0 : (e as MouseEvent).clientX;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const handleSeekStart = React.useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsSeeking(true);
    const frac = getSeekFraction(e);
    setSeekPreview(frac);
    const seekTime = frac * videoDuration;
    setCurrentTime(seekTime);
    try {
      playerRef.current?.seekTo?.(seekTime, true);
    } catch {}
  }, [getSeekFraction, videoDuration]);

  React.useEffect(() => {
    if (!isSeeking) return;
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const frac = getSeekFraction(e);
      setSeekPreview(frac);
      const seekTime = frac * videoDuration;
      setCurrentTime(seekTime);
      try {
        playerRef.current?.seekTo?.(seekTime, true);
      } catch {}
    };
    const handleUp = (e: MouseEvent | TouchEvent) => {
      const frac = getSeekFraction(e);
      const seekTime = frac * videoDuration;
      try {
        playerRef.current?.seekTo?.(seekTime, true);
      } catch {}
      setCurrentTime(seekTime);
      setIsSeeking(false);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleUp);
    };
  }, [isSeeking, getSeekFraction, videoDuration]);

  // ── Volume Slider Interaction ──
  const getVolumeFraction = React.useCallback((e: React.MouseEvent | MouseEvent | React.TouchEvent | TouchEvent) => {
    if (!volumeSliderRef.current) return 0;
    const rect = volumeSliderRef.current.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0]?.clientX ?? 0 : (e as MouseEvent).clientX;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const [isVolumeDragging, setIsVolumeDragging] = React.useState(false);

  const handleVolumeStart = React.useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsVolumeDragging(true);
    const frac = getVolumeFraction(e);
    const vol = Math.round(frac * 100);
    try {
      playerRef.current?.setVolume?.(vol);
      if (vol > 0) playerRef.current?.unMute?.();
    } catch {}
    setCurrentVolume(vol);
    setIsMuted(vol === 0);
  }, [getVolumeFraction]);

  React.useEffect(() => {
    if (!isVolumeDragging) return;
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const frac = getVolumeFraction(e);
      const vol = Math.round(frac * 100);
      try {
        playerRef.current?.setVolume?.(vol);
        if (vol > 0) playerRef.current?.unMute?.();
      } catch {}
      setCurrentVolume(vol);
      setIsMuted(vol === 0);
    };
    const handleUp = () => setIsVolumeDragging(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleUp);
    };
  }, [isVolumeDragging, getVolumeFraction]);

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

  const hasSavedDurationRef = React.useRef(duration > 0);
  const handleDurationDetected = React.useCallback(
    (d: number) => {
      if (typeof d === "number" && d > 0) {
        setVideoDuration(d);
        if (!hasSavedDurationRef.current && (!duration || duration <= 0)) {
          hasSavedDurationRef.current = true;
          saveVideoDuration(videoId, Math.round(d));
        }
      }
    },
    [duration, videoId]
  );

  // Initialize YouTube player instance and enforce proper iframe attributes
  const handlePlayerReady = (event: any) => {
    playerRef.current = event.target;
    setIsPlayerReady(true);
    setTimeout(() => {
      containerRef.current?.focus({ preventScroll: true });
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
      const d = event.target.getDuration?.();
      if (typeof d === "number" && d > 0) {
        handleDurationDetected(d);
      }
      syncQualities();

      // Show resume notification if resuming from previous progress (deduplicated: exactly once per video)
      if (initialProgressSeconds > 5 && !isNearEnd && !hasResumedRef.current) {
        hasResumedRef.current = true;
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
    const clampedSpeed = Math.min(2, Math.max(1, speed));
    try {
      playerRef.current.setPlaybackRate?.(clampedSpeed);
      setCurrentRate(clampedSpeed);
      previousRateRef.current = clampedSpeed;
    } catch {}
  }, []);

  // Incremental speed changer via keyboard ('s' / '>' for faster, 'a' / '<' for slower)
  const stepPlaybackSpeed = React.useCallback(
    (delta: number) => {
      if (!playerRef.current) return;
      // Do not interrupt active 2x spacebar hold
      if (isHoldingSpaceRef.current || is2xActiveFromSpaceRef.current) return;

      try {
        const current = getPlayerRate();
        let newSpeed: number;

        if (delta > 0) {
          const next = PLAYBACK_SPEEDS.find((s) => s > current + 0.05);
          newSpeed = next !== undefined ? next : 2;
        } else {
          const prevList = PLAYBACK_SPEEDS.filter((s) => s < current - 0.05);
          newSpeed = prevList.length > 0 ? prevList[prevList.length - 1] : 1;
        }

        newSpeed = Math.min(2, Math.max(1, newSpeed));

        playerRef.current.setPlaybackRate?.(newSpeed);
        setCurrentRate(newSpeed);
        previousRateRef.current = newSpeed;

        setSpeedFeedback({
          speed: newSpeed,
          key: Date.now(),
        });

        if (speedTimerRef.current) {
          clearTimeout(speedTimerRef.current);
        }
        speedTimerRef.current = setTimeout(() => {
          setSpeedFeedback(null);
        }, 1200);
      } catch {}
    },
    [getPlayerRate]
  );

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

  // ── Play/Pause Toggle ──
  // Uses isPlayingRef (synchronous) rather than getPlayerState() (async Promise)
  // so the toggle decision is always correct. UI updates optimistically for
  // instant snappy feel; handlePlayerStateChange will confirm/correct afterward.
  const togglePlayPause = React.useCallback(() => {
    if (!playerRef.current) return;
    const currentlyPlaying = isPlayingRef.current;
    if (currentlyPlaying) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      try { playerRef.current.pauseVideo?.(); } catch {}
    } else {
      isPlayingRef.current = true;
      setIsPlaying(true);
      try { playerRef.current.playVideo?.(); } catch {}
    }
  }, []);

  // Safe seek — uses currentTime from React state (synchronous) instead of
  // playerRef.getCurrentTime() which returns a Promise via youtube-player.
  const currentTimeRef = React.useRef(0);
  React.useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);

  const seekPlayer = React.useCallback((deltaSeconds: number) => {
    if (!playerRef.current) return;
    const now = currentTimeRef.current;
    const nextTime = Math.max(0, Math.min(videoDuration || Infinity, now + deltaSeconds));
    try { playerRef.current.seekTo?.(nextTime, true); } catch {}
    setCurrentTime(nextTime);
  }, [videoDuration]);

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

  // toggleMute — uses isMuted state instead of playerRef.isMuted() (which
  // returns a Promise via youtube-player, always truthy).
  const toggleMute = React.useCallback(() => {
    if (!playerRef.current) return;
    try {
      if (isMuted) {
        playerRef.current.unMute?.();
        setIsMuted(false);
        setCurrentVolume((prev) => {
          const vol = prev > 0 ? prev : 100;
          setVolumeFeedback({ volume: vol, isMuted: false, key: Date.now() });
          return vol;
        });
      } else {
        playerRef.current.mute?.();
        setIsMuted(true);
        setVolumeFeedback({ volume: 0, isMuted: true, key: Date.now() });
      }
      if (volumeTimerRef.current) clearTimeout(volumeTimerRef.current);
      volumeTimerRef.current = setTimeout(() => setVolumeFeedback(null), 1200);
    } catch {}
  }, [isMuted]);



  const handlersRef = React.useRef({
    start2xSpeed,
    stop2xSpeed,
    togglePlayPause,
    handleSeek,
    changeVolume,
    toggleMute,
    stepPlaybackSpeed,
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
      stepPlaybackSpeed,
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
        stepPlaybackSpeed,
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

      // Escape key: Exit fullscreen if in pseudo-fullscreen, or exit theater mode
      if (e.key === "Escape" || e.code === "Escape") {
        const hasNativeFs = Boolean(
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement
        );
        if (isFullscreen && !hasNativeFs) {
          e.preventDefault();
          e.stopPropagation();
          toggleFullscreen();
          return;
        }
        if (isTheaterMode && !hasNativeFs) {
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

      // 'K' key: Play/Pause (YouTube standard)
      if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        handlersRef.current.togglePlayPause();
        return;
      }

      // 'J' key: Rewind 10s (YouTube standard)
      if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        handleSeek(-10);
        return;
      }

      // 'L' key: Forward 10s (YouTube standard)
      if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        handleSeek(10);
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

      // Increase playback speed (max 2.0x): 's' or '>' (Shift + .)
      if (
        (e.key === "s" && !e.ctrlKey && !e.metaKey && !e.altKey) ||
        e.key === ">" ||
        (e.shiftKey && (e.key === "." || e.code === "Period"))
      ) {
        e.preventDefault();
        stepPlaybackSpeed(1);
        return;
      }

      // Decrease playback speed (min 1.0x): 'a' or '<' (Shift + ,)
      if (
        (e.key === "a" && !e.ctrlKey && !e.metaKey && !e.altKey) ||
        e.key === "<" ||
        (e.shiftKey && (e.key === "," || e.code === "Comma"))
      ) {
        e.preventDefault();
        stepPlaybackSpeed(-1);
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
      if (speedTimerRef.current) {
        clearTimeout(speedTimerRef.current);
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
      const realDur = playerRef.current.getDuration?.();
      if (typeof realDur === "number" && realDur > 0) {
        handleDurationDetected(realDur);
      }
      const effectiveDuration =
        typeof realDur === "number" && realDur > 0
          ? realDur
          : videoDuration > 0
          ? videoDuration
          : duration;

      if (typeof current === "number" && current >= 0) {
        const floorSec = Math.floor(current);
        // Only update if changed by at least 5 seconds
        if (Math.abs(floorSec - lastSyncedSecondsRef.current) >= 5) {
          lastSyncedSecondsRef.current = floorSec;
          updatePlaybackProgress(videoId, floorSec, effectiveDuration);
        }
      }
    } catch {}
  }, [videoId, duration, videoDuration]);

  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      // Rare 15-minute fallback heartbeat during long uninterrupted playback.
      // High-accuracy syncs already fire on Pause (state 2), Video End (state 0),
      // and Tab Close/Navigation (beforeunload & unmount).
      // This saves massive Neon compute hours by allowing Postgres to auto-suspend.
      interval = setInterval(() => {
        syncProgress();
      }, 900000); // 15 minutes
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
      // YouTube confirmed: PLAYING
      isPlayingRef.current = true;
      setIsPlaying(true);
      setIsBuffering(false);
      try {
        const d = event.target?.getDuration?.();
        if (typeof d === "number" && d > 0) handleDurationDetected(d);
      } catch {}
      syncQualities(event.target);
      setTimeout(() => { containerRef.current?.focus(); }, 50);
    } else if (state === 2) {
      // YouTube confirmed: PAUSED
      isPlayingRef.current = false;
      setIsPlaying(false);
      setIsBuffering(false);
      syncProgress();
      setTimeout(() => { containerRef.current?.focus(); }, 50);
    } else if (state === 3) {
      // BUFFERING
      setIsBuffering(true);
    } else if (state === 0) {
      // ENDED
      isPlayingRef.current = false;
      setIsPlaying(false);
      setIsBuffering(false);
      handleVideoEnd();
    } else if (state === -1) {
      // UNSTARTED
      isPlayingRef.current = false;
      setIsBuffering(false);
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

  const currentProgressFrac = isSeeking
    ? seekPreview
    : videoDuration > 0
    ? currentTime / videoDuration
    : 0;
  const currentProgressPercent = Math.min(100, Math.max(0, currentProgressFrac * 100));

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
          {(duration > 0 || videoDuration > 0) && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/80 px-2.5 py-1 font-mono font-medium shadow-2xs dark:border-[#1F2C34] dark:bg-[#111820]">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{formatDuration(duration > 0 ? duration : videoDuration)}</span>
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

          {/* YouTube link copy — admin only, zero DB cost */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                const url = `https://www.youtube.com/watch?v=${youtubeVideoId}`;
                navigator.clipboard.writeText(url).then(() => {
                  toast.success("YouTube link copied", {
                    description: url,
                    duration: 2500,
                    id: "yt-link-copy",
                  });
                }).catch(() => {
                  toast.error("Failed to copy link");
                });
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/80 px-2.5 py-1 font-medium text-muted-foreground shadow-2xs transition-colors cursor-pointer hover:border-border hover:bg-muted/60 hover:text-foreground dark:border-[#1F2C34] dark:bg-[#111820] dark:hover:border-[#2A3A47] dark:hover:bg-[#141E28] dark:hover:text-[#E8EDF0]"
            >
              <Link2 className="h-3.5 w-3.5 shrink-0" />
              <span>Copy link</span>
            </button>
          )}
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
        role="region"
        aria-label={`Video player: ${title}`}
        onClick={() => containerRef.current?.focus()}
        onMouseEnter={() => containerRef.current?.focus()}
        className={cn(
          "group relative bg-black outline-none select-none overflow-hidden",
          isFullscreen
            ? "!fixed !inset-0 !w-screen !h-[100dvh] !max-w-none !max-h-none !top-0 !left-0 !transform-none !rounded-none !border-0 !m-0 !p-0 z-[999999] flex items-center justify-center bg-black"
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

        {/* On-Screen Speed Indicator Overlay */}
        {speedFeedback && !is2xSpeed && (
          <div
            key={speedFeedback.key}
            className="pointer-events-none absolute top-4 sm:top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-black/85 px-4 py-2 text-white shadow-2xl backdrop-blur-md border border-white/15 animate-in fade-in zoom-in-90 duration-150 select-none"
          >
            <Gauge className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="font-mono text-xs font-bold tracking-wider">
              {speedFeedback.speed}x Speed
            </span>
          </div>
        )}

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
            "relative select-none overflow-hidden aspect-video bg-black group/video",
            isFullscreen
              ? "w-full h-full max-w-[calc(100dvh*16/9)] max-h-[100dvh]"
              : "w-full"
          )}
          onMouseMove={resetControlsTimer}
          onMouseLeave={() => {
            if (isPlaying && !isSeeking && !showVolumeSlider && !showSettingsMenu) {
              setShowControls(false);
            }
          }}
          onTouchStart={resetControlsTimer}
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

          {/* YouTube Player - pointer-events-none completely disables YouTube clicks, links, and branding */}
          <YouTube
            videoId={youtubeVideoId}
            onReady={handlePlayerReady}
            onEnd={handleVideoEnd}
            onStateChange={handlePlayerStateChange}
            opts={playerOpts}
            className="w-full h-full [&>div]:!h-full [&>div]:!w-full [&_iframe]:!h-full [&_iframe]:!w-full pointer-events-none select-none"
          />

          {/* ── Transparent Click Surface with debounced single/double-click ── */}
          <ClickSurface
            onSingleClick={togglePlayPause}
            onDoubleClick={(e) => {
              const rect = (e.target as HTMLElement).getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              if (ratio < 0.3) {
                handleSeek(-10);
              } else if (ratio > 0.7) {
                handleSeek(10);
              } else {
                toggleFullscreen();
              }
            }}
            className={cn(
              "absolute inset-0 z-20 select-none",
              !showControls && isPlaying ? "cursor-none" : "cursor-pointer"
            )}
          />




          {/* Buffering spinner overlay */}
          {isBuffering && (
            <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
              <Loader2 className={cn("h-10 w-10 animate-spin text-white/80")} />
            </div>
          )}


          {/* ── Custom Control Bar (Overlay at bottom of video frame - YouTube 1:1) ── */}
          <div
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className={cn(
              "absolute inset-x-0 bottom-0 z-30 flex flex-col justify-end pt-10 pb-1.5 px-3 sm:pb-2 sm:px-4 bg-gradient-to-t from-black/85 via-black/40 to-transparent transition-opacity duration-200 pointer-events-auto select-none",
              showControls || !isPlaying || isSeeking || showSettingsMenu
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none"
            )}
          >
            {/* 1. YouTube-style Timeline / Seekbar */}
            <div
              ref={seekBarRef}
              onMouseDown={handleSeekStart}
              onTouchStart={handleSeekStart}
              onMouseMove={(e) => {
                const frac = getSeekFraction(e);
                setSeekHoverFraction(frac);
              }}
              onMouseLeave={() => setSeekHoverFraction(null)}
              className="group/seek relative w-full h-4 sm:h-5 flex items-center cursor-pointer select-none py-1"
            >
              {/* Hover Tooltip Timestamp */}
              {seekHoverFraction !== null && videoDuration > 0 && (
                <div
                  className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded bg-[#1c1c1c]/95 text-white font-sans text-xs font-normal shadow-lg pointer-events-none select-none border border-white/10"
                  style={{ left: `${Math.max(0.04, Math.min(0.96, seekHoverFraction)) * 100}%` }}
                >
                  {formatDuration(seekHoverFraction * videoDuration)}
                </div>
              )}

              {/* Visual Track Bar */}
              <div className="relative w-full h-[3px] group-hover/seek:h-[5px] transition-[height] duration-100 bg-white/20 overflow-hidden">
                {/* Buffer Bar */}
                <div
                  className="absolute left-0 top-0 bottom-0 bg-white/40 transition-[width] duration-150"
                  style={{ width: `${Math.min(100, Math.max(0, bufferedFraction * 100))}%` }}
                />
                {/* Hover Ghost Bar */}
                {seekHoverFraction !== null && (
                  <div
                    className="absolute left-0 top-0 bottom-0 bg-white/25 pointer-events-none"
                    style={{ width: `${Math.min(100, Math.max(0, seekHoverFraction * 100))}%` }}
                  />
                )}
                {/* Played Bar (YouTube Red) */}
                <div
                  className="absolute left-0 top-0 bottom-0 bg-[#FF0000]"
                  style={{ width: `${currentProgressPercent}%` }}
                />
              </div>

              {/* Scrubber Thumb (YouTube Red Circle) */}
              <div
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-[#FF0000] shadow-md pointer-events-none transition-transform duration-100",
                  isSeeking ? "scale-125" : "scale-0 group-hover/seek:scale-100"
                )}
                style={{ left: `${currentProgressPercent}%` }}
              />
            </div>

            {/* 2. Controls Buttons Row */}
            <div className="flex items-center justify-between pt-1 text-white select-none">
              {/* Left Controls */}
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Play / Pause Button */}
                <button
                  type="button"
                  onClick={togglePlayPause}
                  aria-label={isPlaying ? "Pause" : "Play"}
                  title={isPlaying ? "Pause (k)" : "Play (k)"}
                  className="h-9 w-9 flex items-center justify-center rounded text-white/90 hover:text-white transition-opacity cursor-pointer focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black"
                >
                  {isPlaying ? (
                    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                {/* Rewind 10s */}
                <button
                  type="button"
                  onClick={() => handleSeek(-10)}
                  aria-label="Rewind 10 seconds"
                  title="Rewind 10 seconds (j / ←)"
                  className="h-9 w-9 flex items-center justify-center rounded text-white/90 hover:text-white transition-opacity cursor-pointer focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black"
                >
                  <RotateCcw className="h-4.5 w-4.5" />
                </button>

                {/* Forward 10s */}
                <button
                  type="button"
                  onClick={() => handleSeek(10)}
                  aria-label="Fast forward 10 seconds"
                  title="Fast forward 10 seconds (l / →)"
                  className="h-9 w-9 flex items-center justify-center rounded text-white/90 hover:text-white transition-opacity cursor-pointer focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black"
                >
                  <RotateCw className="h-4.5 w-4.5" />
                </button>

                {/* Volume Button & Expandable Slider */}
                <div
                  className="group/vol relative flex items-center"
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => {
                    if (!isVolumeDragging) setShowVolumeSlider(false);
                  }}
                >
                  <button
                    type="button"
                    onClick={toggleMute}
                    aria-label={isMuted ? "Unmute" : "Mute"}
                    title={isMuted ? "Unmute (m)" : "Mute (m)"}
                    className="h-9 w-9 flex items-center justify-center rounded text-white/90 hover:text-white transition-opacity cursor-pointer"
                  >
                    {isMuted || currentVolume === 0 ? (
                      <VolumeX className="h-5 w-5 text-red-400" />
                    ) : currentVolume < 50 ? (
                      <Volume1 className="h-5 w-5" />
                    ) : (
                      <Volume2 className="h-5 w-5" />
                    )}
                  </button>

                  {/* Volume Slider Bar (YouTube style) */}
                  <div
                    ref={volumeSliderRef}
                    onMouseDown={handleVolumeStart}
                    onTouchStart={handleVolumeStart}
                    className={cn(
                      "overflow-hidden transition-all duration-200 h-8 flex items-center cursor-pointer select-none",
                      showVolumeSlider || isVolumeDragging ? "w-14 sm:w-16 px-1 opacity-100" : "w-0 px-0 opacity-0"
                    )}
                  >
                    <div className="w-full h-[3px] rounded-full bg-white/30 relative">
                      <div
                        className="absolute left-0 top-0 bottom-0 bg-white rounded-full"
                        style={{ width: `${isMuted ? 0 : currentVolume}%` }}
                      />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-white shadow pointer-events-none"
                        style={{ left: `${isMuted ? 0 : currentVolume}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Time Display (YouTube font-sans style) */}
                <div aria-live="off" aria-atomic="true" className="flex items-center gap-1 font-sans text-xs sm:text-[13px] text-[#eee] select-none pl-1">
                  <span>{formatDuration(currentTime)}</span>
                  <span className="text-white/50">/</span>
                  <span className="text-white/70">{formatDuration(videoDuration)}</span>
                </div>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Settings (Speed & Quality) Menu */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSettingsMenu((prev) => !prev);
                      setSettingsView("main");
                    }}
                    title="Settings (Quality & Speed)"
                    className={cn(
                      "relative h-9 w-9 flex items-center justify-center rounded text-white/80 hover:text-white transition-opacity cursor-pointer",
                      showSettingsMenu && "text-white"
                    )}
                  >
                    <Settings className={cn("h-5 w-5 transition-transform duration-200", showSettingsMenu && "rotate-45")} />
                    {/* HD Badge indicator on settings icon */}
                    {(currentQuality.includes("hd") || currentQuality === "highres") && (
                      <span className="absolute top-1.5 right-1 px-1 py-[0.5px] rounded bg-[#ff0000] text-[8px] font-bold text-white leading-none pointer-events-none">
                        HD
                      </span>
                    )}
                  </button>

                  {/* Settings Popup Menu (YouTube 1:1) */}
                  {showSettingsMenu && (
                    <div
                      className="absolute bottom-full mb-3 right-0 bg-[#1f1f1f]/95 backdrop-blur-md border border-white/10 rounded-xl py-1 shadow-2xl z-50 min-w-[210px] animate-in fade-in zoom-in-95 duration-100 overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {settingsView === "main" && (
                        <div className="flex flex-col py-1">
                          {/* Quality Option */}
                          <button
                            type="button"
                            onClick={() => setSettingsView("quality")}
                            className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-sans text-white/90 hover:bg-white/10 transition-colors cursor-pointer text-left"
                          >
                            <span className="flex items-center gap-2.5 text-white/85">
                              <SlidersHorizontal className="h-4 w-4 text-white/60" />
                              <span>Quality</span>
                            </span>
                            <span className="flex items-center gap-1 text-[11px] text-white/60">
                              <span>{QUALITY_LABELS[currentQuality] || currentQuality}</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </span>
                          </button>

                          {/* Speed Option */}
                          <button
                            type="button"
                            onClick={() => setSettingsView("speed")}
                            className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-sans text-white/90 hover:bg-white/10 transition-colors cursor-pointer text-left"
                          >
                            <span className="flex items-center gap-2.5 text-white/85">
                              <Gauge className="h-4 w-4 text-white/60" />
                              <span>Playback speed</span>
                            </span>
                            <span className="flex items-center gap-1 text-[11px] text-white/60">
                              <span>{currentRate === 1 ? "Normal" : `${currentRate}x`}</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </span>
                          </button>
                        </div>
                      )}

                      {settingsView === "quality" && (
                        <div className="flex flex-col py-1 max-h-64 overflow-y-auto">
                          {/* Back header */}
                          <button
                            type="button"
                            onClick={() => setSettingsView("main")}
                            className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-medium text-white/75 hover:text-white hover:bg-white/10 border-b border-white/10 mb-1 transition-colors cursor-pointer text-left"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            <span>Quality</span>
                          </button>

                          {availableQualities.map((q) => {
                            const label = QUALITY_LABELS[q] || q;
                            const isSelected = currentQuality === q;
                            return (
                              <button
                                key={q}
                                type="button"
                                onClick={() => {
                                  setPlayerQuality(q);
                                  setShowSettingsMenu(false);
                                  setSettingsView("main");
                                }}
                                className={cn(
                                  "w-full flex items-center justify-between px-3 py-1.5 text-xs font-sans transition-colors cursor-pointer text-left",
                                  isSelected
                                    ? "bg-white/15 text-white font-semibold"
                                    : "text-white/75 hover:text-white hover:bg-white/10"
                                )}
                              >
                                <span>{label}</span>
                                {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-white" />}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {settingsView === "speed" && (
                        <div className="flex flex-col py-1 max-h-64 overflow-y-auto">
                          {/* Back header */}
                          <button
                            type="button"
                            onClick={() => setSettingsView("main")}
                            className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-medium text-white/75 hover:text-white hover:bg-white/10 border-b border-white/10 mb-1 transition-colors cursor-pointer text-left"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            <span>Playback speed</span>
                          </button>

                          {PLAYBACK_SPEEDS.map((speed) => (
                            <button
                              key={speed}
                              type="button"
                              onClick={() => {
                                setPlayerSpeed(speed);
                                setShowSettingsMenu(false);
                                setSettingsView("main");
                              }}
                              className={cn(
                                "w-full flex items-center justify-between px-3 py-1.5 text-xs font-sans transition-colors cursor-pointer text-left",
                                currentRate === speed && !is2xSpeed
                                  ? "bg-white/15 text-white font-semibold"
                                  : "text-white/75 hover:text-white hover:bg-white/10"
                              )}
                            >
                              <span>{speed === 1 ? "Normal" : `${speed}x`}</span>
                              {currentRate === speed && !is2xSpeed && (
                                <Check className="h-3.5 w-3.5 shrink-0 text-white" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Theater Mode Button */}
                {!isFullscreen && (
                  <button
                    type="button"
                    onClick={toggleTheaterMode}
                    title={isTheaterMode ? "Default view (t)" : "Theater mode (t)"}
                    className="hidden md:flex h-9 w-9 items-center justify-center rounded text-white/80 hover:text-white transition-opacity cursor-pointer"
                  >
                    {isTheaterMode ? (
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <rect x="6" y="7" width="12" height="10" rx="1" fill="currentColor" opacity="0.6" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <rect x="4" y="6" width="16" height="12" rx="1" fill="currentColor" opacity="0.6" />
                      </svg>
                    )}
                  </button>
                )}

                {/* Fullscreen Button */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  title={isFullscreen ? "Exit Fullscreen (f)" : "Fullscreen (f)"}
                  className="flex h-9 w-9 items-center justify-center rounded text-white/80 hover:text-white transition-opacity cursor-pointer"
                >
                  {isFullscreen ? (
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                      <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
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
              {PLAYBACK_SPEEDS.map((speed) => (
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
