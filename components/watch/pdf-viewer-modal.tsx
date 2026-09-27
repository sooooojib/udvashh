"use client";

import * as React from "react";
import {
  FileText,
  ExternalLink,
  Download,
  X,
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

export function PdfViewerModal({ pdf, onClose }: PdfViewerModalProps) {
  const [isFullscreen, setIsFullscreen] = React.useState<boolean>(false);
  const cardRef = React.useRef<HTMLDivElement>(null);

  const isDrive = pdf.source_type === "drive" && !!pdf.file_id;
  const previewSrc = isDrive
    ? getDrivePreviewUrl(pdf.file_id!)
    : `${pdf.file_url}#toolbar=1`;
  const downloadUrl = isDrive
    ? getDriveDownloadUrl(pdf.file_id!)
    : pdf.file_url;

  // Toggle Fullscreen (supports both native Fullscreen API and CSS fullscreen)
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (cardRef.current?.requestFullscreen) {
        cardRef.current.requestFullscreen().catch(() => {
          setIsFullscreen(true);
        });
      } else {
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {
          setIsFullscreen(false);
        });
      } else {
        setIsFullscreen(false);
      }
    }
  };

  // Sync state if user exits fullscreen via Esc / OS gesture
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Keyboard shortcut: Esc to close (when not in native fullscreen)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.fullscreenElement) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-150",
        isFullscreen ? "p-0" : "p-3 sm:p-6"
      )}
      onClick={(e) => {
        if (!isFullscreen && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={cardRef}
        className={cn(
          "relative flex flex-col w-full bg-card dark:bg-[#0D1318] text-foreground border border-border/40 dark:border-white/10 shadow-2xl overflow-hidden transition-all duration-150",
          isFullscreen
            ? "fixed inset-0 w-screen h-screen rounded-none z-50 border-none"
            : "max-w-5xl h-[88vh] rounded-2xl"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 dark:border-white/10 bg-muted/30 dark:bg-[#111820] select-none shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-3">
            <div className="p-1 rounded-md bg-rose-500/10 text-rose-500 shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-medium text-xs sm:text-sm text-foreground dark:text-[#E8EDF0] truncate">
                {pdf.title}
              </h3>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground dark:text-white/50">
                <span className="uppercase font-mono">
                  {pdf.source_type === "drive" ? "Google Drive" : "Supabase"}
                </span>
                {pdf.file_size && (
                  <>
                    <span>•</span>
                    <span className="font-mono">{formatFileSize(pdf.file_size)}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Exit Fullscreen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Fullscreen</span>
                </>
              )}
            </button>

            {/* Open in new tab */}
            <a
              href={pdf.file_url}
              target="_blank"
              rel="noopener noreferrer"
              title="Open in new tab"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:hover:bg-white/10 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Open</span>
            </a>

            {/* Download */}
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={!isDrive}
              title="Download PDF"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Download className="h-4 w-4" />
            </a>

            {/* Close */}
            <button
              type="button"
              onClick={() => {
                if (document.fullscreenElement) {
                  document.exitFullscreen?.().catch(() => {});
                }
                onClose();
              }}
              title="Close (Esc)"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:hover:bg-white/10 transition-colors cursor-pointer ml-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Document Frame */}
        <div className="flex-1 w-full bg-black/90 relative">
          <iframe
            src={previewSrc}
            title={pdf.title}
            className="w-full h-full border-none"
            allow="autoplay"
          />
        </div>
      </div>
    </div>
  );
}
