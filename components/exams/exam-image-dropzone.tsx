"use client";

import * as React from "react";
import {
  UploadCloud,
  ImageIcon,
  Trash2,
  Loader2,
  Maximize2,
  X,
  Plus,
  RotateCcw,
  GripVertical,
  ChevronUp,
  ChevronDown,
  ArrowDownUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { parseImageMeta, buildImageUrlWithMeta } from "@/lib/exam-image-meta";

export type DropzoneTarget =
  | "question"
  | "solution"
  | "option-A"
  | "option-B"
  | "option-C"
  | "option-D"
  | string;

interface ExamImageDropzoneProps {
  examId: string;
  questionNumber: number;
  target: DropzoneTarget;
  images?: string[];
  isAdmin?: boolean;
  compact?: boolean;
  label?: string;
  onImageAdded?: (imageUrl: string) => void;
  onImageDeleted?: (imageUrl: string) => void;
  onImageUpdated?: (oldUrl: string, newUrl: string) => void;
}

/**
 * Compresses an image in the browser to clean, lightweight WebP before uploading.
 * Reduces raw 4K screenshots or heavy PNGs down to ~20-50 KB without quality loss.
 */
export async function compressImageToWebP(file: File): Promise<Blob> {
  if (file.type === "image/webp" && file.size < 80 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      const maxDim = 1400;
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        // Crisp white backing for line-art/diagrams so transparent PNGs stay legible in dark mode
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            resolve(blob || file);
          },
          "image/webp",
          0.88
        );
      } else {
        resolve(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Resizable Image Card with OS-window style corner/border drag handles,
 * live dimension tooltips, quick scale presets, double-click reset,
 * and optional inter-line positioning drag handle and step controls.
 */
export interface ResizableExamImageProps {
  src: string;
  alt: string;
  examId: string;
  questionNumber: number;
  target: DropzoneTarget;
  isAdmin: boolean;
  isDeleting: boolean;
  onExpand: () => void;
  onDelete: () => void;
  onAddAnother?: () => void;
  onImageUpdated?: (oldUrl: string, newUrl: string) => void;
  // Inter-line placement props
  lineIndex?: number;
  totalLines?: number;
  onMoveLine?: (newSlot: number) => void;
}

export function ResizableExamImage({
  src,
  alt,
  examId,
  questionNumber,
  target,
  isAdmin,
  isDeleting,
  onExpand,
  onDelete,
  onAddAnother,
  onImageUpdated,
  lineIndex,
  totalLines,
  onMoveLine,
}: ResizableExamImageProps) {
  // Read initial width from URL hash or localStorage
  const [width, setWidth] = React.useState<number | undefined>(() => {
    const meta = parseImageMeta(src);
    return meta.width;
  });

  const [isResizing, setIsResizing] = React.useState(false);
  const [liveWidth, setLiveWidth] = React.useState<number | null>(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const imgRef = React.useRef<HTMLImageElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close context menu on click outside
  React.useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  // Sync width if src changes
  React.useEffect(() => {
    const meta = parseImageMeta(src);
    if (meta.width) {
      setWidth(meta.width);
    }
  }, [src]);

  // Persist resized width to server & localStorage while preserving line position
  const persistWidth = React.useCallback(
    async (newWidth: number | undefined) => {
      const cleanUrl = src.split("#")[0];
      if (typeof window !== "undefined") {
        if (newWidth) {
          localStorage.setItem(`exam_img_w_${cleanUrl}`, String(newWidth));
        } else {
          localStorage.removeItem(`exam_img_w_${cleanUrl}`);
        }
      }

      if (!isAdmin) return;

      const meta = parseImageMeta(src);
      const newUrl = buildImageUrlWithMeta(src, { width: newWidth, line: meta.line });
      if (newUrl === src) return;

      try {
        const res = await fetch("/api/exams/upload-image", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            examId,
            questionNumber,
            target,
            oldUrl: src,
            newUrl,
          }),
        });
        if (res.ok) {
          onImageUpdated?.(src, newUrl);
        }
      } catch (err) {
        console.warn("[Resize API] Failed to save width:", err);
      }
    },
    [src, examId, questionNumber, target, isAdmin, onImageUpdated]
  );

  // OS Window Resizing handler (supports corner South-East or right East edge)
  const startResize = (
    e: React.MouseEvent | React.TouchEvent,
    direction: "se" | "e"
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const startWidth = rect.width;
    setIsResizing(true);
    document.body.style.userSelect = "none";
    document.body.style.cursor = direction === "se" ? "se-resize" : "ew-resize";

    let currentW = startWidth;
    let rafId: number | null = null;

    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      const curX =
        "touches" in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const deltaX = curX - clientX;
      const maxWidth = Math.min(window.innerWidth - 60, 950);
      const calculated = Math.round(
        Math.max(60, Math.min(maxWidth, startWidth + deltaX))
      );

      currentW = calculated;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setWidth(calculated);
        setLiveWidth(calculated);
      });
    };

    const onEnd = () => {
      if (rafId) cancelAnimationFrame(rafId);
      setIsResizing(false);
      setLiveWidth(null);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";

      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);

      persistWidth(currentW);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
  };

  // Double-click resets back to natural/auto dimensions
  const handleReset = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setWidth(undefined);
    persistWidth(undefined);
    toast.success("Image size reset to default", { duration: 1200 });
  };

  const currentLine = lineIndex ?? totalLines ?? 0;
  const isAtTop = currentLine === 0;
  const isAtBottom = totalLines !== undefined && currentLine >= totalLines;

  // Sensible, balanced default sizes when no custom resize width is set
  const isOption = typeof target === "string" && target.startsWith("option-");
  const isQuestion = target === "question";

  // Target-specific smart defaults:
  // - Options: max ~190px - 220px (compact multiple choice options, e.g. clocks, mirror text)
  // - Question: max ~360px - 420px (crisp, readable, fits comfortably beside/under text without being giant)
  // - Solution: max ~340px - 400px (clean textbook sizing)
  const defaultContainerSizeClass = React.useMemo(() => {
    if (width) return ""; // Explicit user resize takes priority
    if (isOption) {
      return "w-auto max-w-[190px] sm:max-w-[220px]";
    }
    if (isQuestion) {
      return "w-auto max-w-[360px] sm:max-w-[420px]";
    }
    return "w-auto max-w-[340px] sm:max-w-[400px]";
  }, [width, isOption, isQuestion]);

  const defaultImgMaxHeightClass = React.useMemo(() => {
    if (isOption) {
      return "max-h-[105px] sm:max-h-[130px]";
    }
    if (isQuestion) {
      return "max-h-[220px] sm:max-h-[270px]";
    }
    return "max-h-[240px] sm:max-h-[300px]";
  }, [isOption, isQuestion]);

  const hasControls = isAdmin && totalLines !== undefined && onMoveLine;

  const content = (
    <div
      ref={containerRef}
      style={width ? { width: `${width}px` } : undefined}
      className={cn(
        "group relative inline-block max-w-full rounded-xl border border-border/80 bg-white dark:bg-zinc-900/90 p-1.5 shadow-xs transition-all",
        defaultContainerSizeClass,
        "hover:shadow-md hover:border-[#881337]/50",
        isResizing && "ring-2 ring-[#881337] shadow-lg border-[#881337]"
      )}
    >

      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={cn(
          "w-full h-auto rounded-lg object-contain",
          width ? "max-h-[85vh]" : defaultImgMaxHeightClass,
          isAdmin ? "cursor-pointer" : "cursor-zoom-in"
        )}
        loading="lazy"
        onClick={(e) => {
          e.stopPropagation();
          if (isAdmin) {
            setMenuOpen((prev) => !prev);
          } else {
            onExpand();
          }
        }}
        title={isAdmin ? "Left-click image for options (Add another photo, Fullscreen, Delete)" : "Click to view full size"}
      />

      {/* ── Left-Click Context Popover Menu (Admin) ── */}
      {menuOpen && isAdmin && (
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2 left-2 z-40 flex flex-col gap-1 rounded-2xl border border-border/80 bg-white/95 dark:bg-[#111820]/95 backdrop-blur-xl p-1.5 shadow-2xl text-xs min-w-[195px] animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 mb-0.5">
            Diagram Options
          </div>

          {/* Quick Inter-line positioning inside popover: exactly 1 line per click */}
          {totalLines !== undefined && onMoveLine && (
            <>
              {!isAtTop && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onMoveLine(Math.max(0, currentLine - 1));
                  }}
                  className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 font-medium text-foreground hover:bg-muted transition-colors text-left cursor-pointer"
                >
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Move up one line</span>
                </button>
              )}

              {!isAtBottom && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onMoveLine(Math.min(totalLines, currentLine + 1));
                  }}
                  className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 font-medium text-foreground hover:bg-muted transition-colors text-left cursor-pointer"
                >
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Move down one line</span>
                </button>
              )}

              <div className="h-px bg-border/40 my-0.5" />
            </>
          )}

          {/* Add another photo */}
          {onAddAnother && (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onAddAnother();
              }}
              className="flex items-center gap-2 rounded-xl px-2.5 py-2 font-medium text-foreground hover:bg-[#881337]/10 hover:text-[#881337] dark:hover:text-[#FDA4AF] transition-colors text-left cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-[#881337] dark:text-[#FDA4AF]" />
              <span>Add another photo</span>
            </button>
          )}

          {/* View fullscreen */}
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onExpand();
            }}
            className="flex items-center gap-2 rounded-xl px-2.5 py-2 font-medium text-foreground hover:bg-muted transition-colors text-left cursor-pointer"
          >
            <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span>View fullscreen</span>
          </button>

          {/* Reset to natural size (if resized) */}
          {width && (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                handleReset();
              }}
              className="flex items-center gap-2 rounded-xl px-2.5 py-2 font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 transition-colors text-left cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>Reset original size</span>
            </button>
          )}

          <div className="h-px bg-border/60 my-0.5" />

          {/* Delete photo */}
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onDelete();
            }}
            disabled={isDeleting}
            className="flex items-center gap-2 rounded-xl px-2.5 py-2 font-medium text-rose-600 hover:bg-rose-500/10 transition-colors text-left cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-500" />
            ) : (
              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
            )}
            <span>Delete photo</span>
          </button>
        </div>
      )}

      {/* ── OS Window Resizer: Bottom-Right Diagonal Handle ── */}
      <div
        onMouseDown={(e) => startResize(e, "se")}
        onTouchStart={(e) => startResize(e, "se")}
        onDoubleClick={handleReset}
        title="OS Resizer: Drag to resize • Double-click to reset"
        className={cn(
          "absolute -bottom-1 -right-1 z-30 flex h-6 w-6 cursor-se-resize items-end justify-end p-1 transition-transform",
          "text-muted-foreground/60 hover:text-[#881337] dark:hover:text-[#FDA4AF]",
          isResizing && "text-[#881337] scale-125"
        )}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 13 13"
          fill="none"
          className="drop-shadow-xs"
        >
          <path
            d="M11 2L2 11M11 6L6 11M11 9L9 11"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* ── OS Window Resizer: Right Border Strip ── */}
      <div
        onMouseDown={(e) => startResize(e, "e")}
        onTouchStart={(e) => startResize(e, "e")}
        title="Drag border to resize width"
        className="absolute top-4 bottom-4 -right-1 z-20 w-2 cursor-ew-resize hover:bg-[#881337]/40 rounded-full transition-colors"
      />

      {/* ── Floating Dimension Pill While Resizing ── */}
      {isResizing && (
        <div className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 rounded-full bg-black/90 px-3 py-1 text-xs font-mono font-medium text-white shadow-xl backdrop-blur-md border border-white/20">
          <span>📏 {liveWidth || width}px</span>
          <span className="text-white/60 text-[10px]">• release to save</span>
        </div>
      )}
    </div>
  );

  if (!hasControls) {
    return content;
  }

  return (
    <div className="inline-flex items-center gap-2 max-w-full flex-nowrap align-middle">
      {content}
      <div className="flex flex-col gap-1 shrink-0 select-none">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMoveLine(Math.max(0, currentLine - 1));
          }}
          disabled={isAtTop}
          title="Move up one line"
          className="h-7 w-7 rounded-lg flex items-center justify-center bg-zinc-900/90 dark:bg-zinc-800/90 hover:bg-[#881337] active:scale-95 text-zinc-200 hover:text-white border border-zinc-700/60 dark:border-zinc-700 shadow-xs disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMoveLine(Math.min(totalLines, currentLine + 1));
          }}
          disabled={isAtBottom}
          title="Move down one line"
          className="h-7 w-7 rounded-lg flex items-center justify-center bg-zinc-900/90 dark:bg-zinc-800/90 hover:bg-[#881337] active:scale-95 text-zinc-200 hover:text-white border border-zinc-700/60 dark:border-zinc-700 shadow-xs disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function ExamImageDropzone({
  examId,
  questionNumber,
  target,
  images = [],
  isAdmin = false,
  compact = false,
  label,
  onImageAdded,
  onImageDeleted,
  onImageUpdated,
}: ExamImageDropzoneProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [deletingUrl, setDeletingUrl] = React.useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Close lightbox on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxSrc(null);
    };
    if (lightboxSrc) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [lightboxSrc]);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, WebP).");
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading("Compressing & uploading to Supabase...");

    try {
      const compressedBlob = await compressImageToWebP(file);
      const compressedFile = new File(
        [compressedBlob],
        `diagram-${Date.now()}.webp`,
        { type: "image/webp" }
      );

      const formData = new FormData();
      formData.append("file", compressedFile);
      formData.append("examId", examId);
      formData.append("questionNumber", String(questionNumber));
      formData.append("target", target);

      const res = await fetch("/api/exams/upload-image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to upload image.");
      }

      toast.success("Image uploaded & saved successfully!", { id: toastId });
      onImageAdded?.(data.imageUrl);
    } catch (err: any) {
      console.error("[Upload] Error:", err);
      toast.error(err?.message || "Failed to upload image", { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (imageUrl: string) => {
    if (!confirm("Are you sure you want to delete this image?")) return;

    setDeletingUrl(imageUrl);
    const toastId = toast.loading("Deleting image...");

    try {
      const res = await fetch("/api/exams/upload-image", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId,
          questionNumber,
          target,
          imageUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to delete image.");
      }

      toast.success("Image removed", { id: toastId });
      onImageDeleted?.(imageUrl);
    } catch (err: any) {
      console.error("[Delete] Error:", err);
      toast.error(err?.message || "Failed to delete image", { id: toastId });
    } finally {
      setDeletingUrl(null);
    }
  };

  // Clipboard Paste handler
  const handlePaste = (e: React.ClipboardEvent) => {
    if (!isAdmin || isUploading) return;
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          e.stopPropagation();
          handleUpload(file);
          break;
        }
      }
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    if (!isAdmin || isUploading) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!isAdmin) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!isAdmin || isUploading) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0 && files[0].type.startsWith("image/")) {
      handleUpload(files[0]);
    }
  };

  const hasImages = images.length > 0;

  // If there are no images, render nothing (no dashed empty upload boxes)
  if (!hasImages) {
    return null;
  }

  return (
    <div className={cn("space-y-2", compact ? "my-0.5 w-fit max-w-full" : "my-2 w-fit max-w-full")}>
      {/* ── Embedded Resizable Images Grid ── */}
      {hasImages && (
        <div className="flex flex-wrap gap-3 items-center w-fit max-w-full">
          {images.map((src, i) => (
            <ResizableExamImage
              key={`${src}-${i}`}
              src={src}
              alt={`${target} Diagram ${i + 1}`}
              examId={examId}
              questionNumber={questionNumber}
              target={target}
              isAdmin={isAdmin}
              isDeleting={deletingUrl === src}
              onExpand={() => setLightboxSrc(src)}
              onDelete={() => handleDelete(src)}
              onAddAnother={() => fileInputRef.current?.click()}
              onImageUpdated={onImageUpdated}
            />
          ))}
        </div>
      )}

      {/* ── Admin Hidden File Input (Always in DOM for programmatic clicks and drops) ── */}
      {isAdmin && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = "";
          }}
        />
      )}

      {/* ── Admin Initial Dropzone / Button (ONLY rendered when NO image exists yet) ── */}
      {isAdmin && !hasImages && (
        <div
          onClick={(e) => {
            // Prevent triggering option select when clicking dropzone
            e.stopPropagation();
          }}
        >
          <div
            tabIndex={0}
            role="button"
            aria-label="Upload exam diagram"
            onPaste={handlePaste}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "group relative flex items-center justify-center gap-2 rounded-xl border border-dashed transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#881337]",
              compact
                ? "py-2 px-3 border-[#881337]/35 hover:border-[#881337] bg-[#881337]/5 hover:bg-[#881337]/10 text-xs w-full"
                : "py-3 sm:py-3.5 px-3.5 sm:px-4 border-[#881337]/35 hover:border-[#881337] bg-[#881337]/5 hover:bg-[#881337]/10 text-sm",
              isDragging && "border-[#881337] bg-[#881337]/15 ring-2 ring-[#881337]/40 scale-[1.005]",
              isUploading && "pointer-events-none opacity-60"
            )}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[#881337]" />
                <span className="font-medium text-[#881337]">Uploading...</span>
              </>
            ) : compact ? (
              <div className="flex items-center gap-2 py-0.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-[#881337]/15 text-[#881337] shrink-0">
                  <UploadCloud className="h-3.5 w-3.5" />
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-semibold text-[#881337] dark:text-[#FDA4AF] text-xs truncate">
                    {label || "Upload Diagram"}
                  </span>
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">
                    • Drop or Ctrl+V
                  </span>
                </div>
              </div>
            ) : (
              <>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#881337]/15 text-[#881337] shrink-0">
                  <UploadCloud className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground text-xs sm:text-sm">
                    {label || `Add ${target === "question" ? "Question" : "Solution"} Diagram`}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Drag & drop, click to browse, or <span className="font-semibold text-[#881337] dark:text-[#FDA4AF]">Ctrl+V</span> to paste screenshot
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Fullscreen Lightbox Modal ── */}
      {lightboxSrc && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxSrc(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200 cursor-zoom-out"
        >
          <button
            type="button"
            onClick={() => setLightboxSrc(null)}
            className="absolute top-4 right-4 rounded-full bg-white/10 hover:bg-white/25 text-white p-2.5 transition-colors"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightboxSrc}
            alt="Expanded Diagram"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[95vw] rounded-2xl object-contain bg-white dark:bg-zinc-950 p-2 shadow-2xl border border-white/20"
          />
        </div>
      )}
    </div>
  );
}
