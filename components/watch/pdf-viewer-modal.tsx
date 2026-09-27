"use client";

import * as React from "react";
import {
  FileText,
  ExternalLink,
  Download,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Hand,
  MousePointerClick,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/utils/format";
import type { VideoPdfItem } from "@/app/actions/pdf";
import {
  getDrivePreviewUrl,
  getDriveDownloadUrl,
} from "@/lib/utils/google-drive";

interface PdfViewerModalProps {
  pdf: VideoPdfItem;
  onClose: () => void;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.5;
const ZOOM_STEP = 0.25;

export function PdfViewerModal({ pdf, onClose }: PdfViewerModalProps) {
  const [zoom, setZoom] = React.useState<number>(1);
  const [pan, setPan] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanMode, setIsPanMode] = React.useState<boolean>(false);
  const [isSpacePressed, setIsSpacePressed] = React.useState<boolean>(false);
  const [isDragging, setIsDragging] = React.useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = React.useState<boolean>(false);
  const [directIframeMode, setDirectIframeMode] = React.useState<boolean>(false);
  const [showTip, setShowTip] = React.useState<boolean>(true);

  const viewportRef = React.useRef<HTMLDivElement>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);

  // Mutable refs for high-frequency gesture/drag calculations
  const zoomRef = React.useRef<number>(zoom);
  const panRef = React.useRef<{ x: number; y: number }>(pan);
  zoomRef.current = zoom;
  panRef.current = pan;

  const dragStartRef = React.useRef<{
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
  }>({ startX: 0, startY: 0, startPanX: 0, startPanY: 0 });

  const gestureStartZoomRef = React.useRef<number>(1);

  // Auto-hide the gesture helper tip after 4 seconds
  React.useEffect(() => {
    const timer = setTimeout(() => setShowTip(false), 4200);
    return () => clearTimeout(timer);
  }, []);

  const isDrive = pdf.source_type === "drive" && !!pdf.file_id;
  const previewSrc = isDrive
    ? getDrivePreviewUrl(pdf.file_id!)
    : `${pdf.file_url}#toolbar=1`;
  const downloadUrl = isDrive
    ? getDriveDownloadUrl(pdf.file_id!)
    : pdf.file_url;

  // Zoom towards a specific focal point (e.g. cursor / pinch center)
  const applyZoom = React.useCallback(
    (targetZoom: number, focalPoint?: { x: number; y: number }) => {
      const clampedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, targetZoom));
      const currentZoom = zoomRef.current;
      const currentPan = panRef.current;

      if (!viewportRef.current || !focalPoint) {
        // Center zoom
        const scaleRatio = clampedZoom / currentZoom;
        const newPan = {
          x: currentPan.x * scaleRatio,
          y: currentPan.y * scaleRatio,
        };
        setZoom(clampedZoom);
        setPan(newPan);
        return;
      }

      const rect = viewportRef.current.getBoundingClientRect();
      const focalX = focalPoint.x - (rect.left + rect.width / 2);
      const focalY = focalPoint.y - (rect.top + rect.height / 2);

      const scaleRatio = clampedZoom / currentZoom;
      const newPanX = focalX - (focalX - currentPan.x) * scaleRatio;
      const newPanY = focalY - (focalY - currentPan.y) * scaleRatio;

      setZoom(clampedZoom);
      setPan({ x: newPanX, y: newPanY });
    },
    []
  );

  const resetZoom = React.useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const zoomIn = React.useCallback(() => {
    applyZoom(zoomRef.current + ZOOM_STEP);
  }, [applyZoom]);

  const zoomOut = React.useCallback(() => {
    applyZoom(zoomRef.current - ZOOM_STEP);
  }, [applyZoom]);

  // Mac Trackpad Pinch Zoom & Two-Finger Pan Listener
  React.useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleWheel = (e: WheelEvent) => {
      // Direct iframe mode bypasses custom parent wheel handling
      if (directIframeMode) return;

      // Trackpad pinch-to-zoom (macOS Chrome/Firefox fires wheel with ctrlKey = true)
      if (e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();

        // Calculate smooth zoom factor based on pinch delta
        const zoomDelta = -e.deltaY * 0.008;
        const targetZoom = zoomRef.current * (1 + zoomDelta);
        applyZoom(targetZoom, { x: e.clientX, y: e.clientY });
        return;
      }

      // Two-finger scroll / wheel pan when zoomed in or pan mode active
      if (zoomRef.current > 1.02 || isPanMode) {
        e.preventDefault();
        e.stopPropagation();

        const newPanX = panRef.current.x - e.deltaX;
        const newPanY = panRef.current.y - e.deltaY;
        const newPan = { x: newPanX, y: newPanY };
        panRef.current = newPan;
        setPan(newPan);
      }
    };

    // Safari Gesture Event Listeners
    const handleGestureStart = (e: any) => {
      if (directIframeMode) return;
      e.preventDefault();
      gestureStartZoomRef.current = zoomRef.current;
    };

    const handleGestureChange = (e: any) => {
      if (directIframeMode) return;
      e.preventDefault();
      const targetZoom = gestureStartZoomRef.current * e.scale;
      applyZoom(targetZoom, { x: e.clientX, y: e.clientY });
    };

    viewport.addEventListener("wheel", handleWheel, { passive: false });
    viewport.addEventListener("gesturestart", handleGestureStart as any, {
      passive: false,
    });
    viewport.addEventListener("gesturechange", handleGestureChange as any, {
      passive: false,
    });

    return () => {
      viewport.removeEventListener("wheel", handleWheel);
      viewport.removeEventListener(
        "gesturestart",
        handleGestureStart as any
      );
      viewport.removeEventListener(
        "gesturechange",
        handleGestureChange as any
      );
    };
  }, [applyZoom, directIframeMode, isPanMode]);

  // Mouse Drag / Pointer Panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (directIframeMode) return;

    // Allow drag if pan mode is active, holding space, middle click, or zoomed in
    const canDrag =
      isPanMode ||
      isSpacePressed ||
      e.button === 1 ||
      zoomRef.current > 1.05;

    if (canDrag && (e.button === 0 || e.button === 1)) {
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startPanX: panRef.current.x,
        startPanY: panRef.current.y,
      };
    }
  };

  // Window-level mouse move and mouse up for flawless dragging across iframes
  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;
      const nextPan = {
        x: dragStartRef.current.startPanX + dx,
        y: dragStartRef.current.startPanY + dy,
      };
      panRef.current = nextPan;
      setPan(nextPan);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Keyboard Shortcuts (+, -, 0, Space, H, Esc)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomIn();
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        zoomOut();
      } else if (e.key === "0") {
        e.preventDefault();
        resetZoom();
      } else if (e.key === "h" || e.key === "H") {
        e.preventDefault();
        setIsPanMode((prev) => !prev);
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [onClose, resetZoom, zoomIn, zoomOut]);

  // Double Click: Zoom to 1.75x or reset
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (directIframeMode) return;
    if (zoom > 1.05) {
      resetZoom();
    } else {
      applyZoom(1.75, { x: e.clientX, y: e.clientY });
    }
  };

  const isInteractiveLayerActive =
    !directIframeMode || isDragging || isSpacePressed;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={cardRef}
        className={cn(
          "relative flex flex-col w-full bg-[#0D1318] text-[#E8EDF0] border border-white/10 shadow-2xl overflow-hidden transition-all duration-200",
          isFullscreen
            ? "fixed inset-0 w-screen h-screen rounded-none z-50 border-none"
            : "max-w-6xl h-[90vh] rounded-2xl"
        )}
      >
        {/* ── Top Bar ── */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-[#111820]/95 backdrop-blur-md select-none shrink-0 z-20">
          <div className="flex items-center gap-2.5 min-w-0 pr-3">
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-medium text-xs sm:text-sm text-white truncate">
                {pdf.title}
              </h3>
              <div className="flex items-center gap-2 text-[10px] text-white/50">
                <span className="uppercase font-mono">
                  {pdf.source_type === "drive" ? "Google Drive" : "Storage"}
                </span>
                {pdf.file_size && (
                  <>
                    <span>•</span>
                    <span className="font-mono">{formatFileSize(pdf.file_size)}</span>
                  </>
                )}
                {zoom !== 1 && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-400 font-mono font-medium">
                      {Math.round(zoom * 100)}%
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Direct Iframe Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setDirectIframeMode((prev) => !prev);
                setShowTip(false);
              }}
              title={
                directIframeMode
                  ? "Switch to Pinch & Pan Zoom Layer"
                  : "Allow Direct Clicks inside Iframe"
              }
              className={cn(
                "hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                directIframeMode
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              )}
            >
              <MousePointerClick className="h-3.5 w-3.5" />
              <span>{directIframeMode ? "Direct Frame" : "Zoom Layer"}</span>
            </button>

            {/* Open in new tab */}
            <a
              href={pdf.file_url}
              target="_blank"
              rel="noopener noreferrer"
              title="Open in new tab"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Open</span>
            </a>

            {/* Download */}
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={!isDrive}
              title="Download PDF"
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Download className="h-4 w-4" />
            </a>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              title="Close (Esc)"
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Viewport Canvas ── */}
        <div
          ref={viewportRef}
          className="relative flex-1 w-full h-full bg-[#0A0D12] overflow-hidden select-none"
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
        >
          {/* Scaled & Translated Document Container */}
          <div
            className="w-full h-full origin-center will-change-transform"
            style={{
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
              transition: isDragging
                ? "none"
                : "transform 0.08s cubic-bezier(0.2, 0, 0, 1)",
            }}
          >
            <iframe
              src={previewSrc}
              title={pdf.title}
              className="w-full h-full border-none bg-[#0A0D12]"
              allow="autoplay"
            />
          </div>

          {/* 
            Transparent Gesture & Drag Shield:
            Prevents iframe from swallowing mousemove/trackpad events, enabling
            flawless pinch-to-zoom and drag-to-pan everywhere over Google Drive!
          */}
          {isInteractiveLayerActive && (
            <div
              className={cn(
                "absolute inset-0 z-10 transition-colors",
                isPanMode || isSpacePressed || zoom > 1.05
                  ? isDragging
                    ? "cursor-grabbing"
                    : "cursor-grab"
                  : "cursor-default"
              )}
              title={
                isPanMode || isSpacePressed
                  ? "Click and drag to pan"
                  : "Pinch trackpad to zoom • Double-click to magnify"
              }
            />
          )}

          {/* ── Quick Toast / Hint (auto-fades after 4s) ── */}
          {showTip && !directIframeMode && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/80 backdrop-blur-xl border border-white/15 text-white/90 text-xs shadow-xl">
                <span>🤏 Pinch trackpad to zoom</span>
                <span className="text-white/30">•</span>
                <span>Two-finger swipe / drag to pan</span>
              </div>
            </div>
          )}

          {/* ── Direct Iframe Active Banner (if user enabled it) ── */}
          {directIframeMode && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 animate-in fade-in slide-in-from-top-2 duration-200">
              <div
                onClick={() => setDirectIframeMode(false)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/90 text-black text-xs font-medium shadow-xl cursor-pointer hover:bg-amber-400 transition-colors"
              >
                <span>Direct Frame Mode Active</span>
                <span className="text-black/60">•</span>
                <span className="underline">Click to enable Zoom & Pan layer</span>
              </div>
            </div>
          )}

          {/* ── Floating Glass Zoom Toolbar (bottom center) ── */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 select-none animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="flex items-center gap-1 sm:gap-1.5 px-3 py-1.5 rounded-full bg-black/80 dark:bg-[#141C24]/90 backdrop-blur-2xl border border-white/15 shadow-2xl text-white">
              {/* Zoom Out Button */}
              <button
                type="button"
                onClick={zoomOut}
                disabled={zoom <= MIN_ZOOM}
                title="Zoom Out (-)"
                className="p-1.5 rounded-full hover:bg-white/15 active:scale-95 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
              >
                <ZoomOut className="h-4 w-4" />
              </button>

              {/* Zoom Level Indicator / Reset Button */}
              <button
                type="button"
                onClick={resetZoom}
                title="Click to reset (0)"
                className="px-2 py-0.5 min-w-[54px] text-center text-xs font-mono font-medium rounded-md hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              >
                {Math.round(zoom * 100)}%
              </button>

              {/* Zoom In Button */}
              <button
                type="button"
                onClick={zoomIn}
                disabled={zoom >= MAX_ZOOM}
                title="Zoom In (+)"
                className="p-1.5 rounded-full hover:bg-white/15 active:scale-95 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
              >
                <ZoomIn className="h-4 w-4" />
              </button>

              <div className="h-4 w-px bg-white/20 mx-0.5" />

              {/* Pan / Drag Mode Toggle */}
              <button
                type="button"
                onClick={() => setIsPanMode((prev) => !prev)}
                title={
                  isPanMode
                    ? "Pan Mode Active (H or Space)"
                    : "Toggle Pan Tool (H)"
                }
                className={cn(
                  "p-1.5 rounded-full transition-all cursor-pointer active:scale-95",
                  isPanMode
                    ? "bg-emerald-500/25 text-emerald-400 ring-1 ring-emerald-500/50"
                    : "text-white/70 hover:text-white hover:bg-white/15"
                )}
              >
                <Hand className="h-4 w-4" />
              </button>

              {/* Reset View Button */}
              <button
                type="button"
                onClick={resetZoom}
                title="Reset View (0)"
                className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/15 active:scale-95 transition-all cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
