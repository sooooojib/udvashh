"use client";

import * as React from "react";
import {
  FileText,
  ExternalLink,
  Download,
  X,
  Maximize2,
  Minimize2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/utils/format";
import type { VideoPdfItem } from "@/app/actions/pdf";
import {
  getDriveStreamUrl,
  getDriveDownloadUrl,
} from "@/lib/utils/google-drive";

interface PdfViewerModalProps {
  pdf: VideoPdfItem;
  onClose: () => void;
}

export function PdfViewerModal({ pdf, onClose }: PdfViewerModalProps) {
  // Stretched / Full-viewport state (pure in-browser stretch, no OS fullscreen)
  const [isStretched, setIsStretched] = React.useState<boolean>(false);

  // Progressive download & percentage tracking
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [progress, setProgress] = React.useState<number>(0);
  const [loadedBytes, setLoadedBytes] = React.useState<number>(0);
  const [totalBytes, setTotalBytes] = React.useState<number>(pdf.file_size || 0);
  const [pdfBlobUrl, setPdfBlobUrl] = React.useState<string | null>(null);

  const isDrive = pdf.source_type === "drive" && !!pdf.file_id;
  const rawStreamUrl = isDrive
    ? getDriveStreamUrl(pdf.file_id!, pdf.title)
    : `${pdf.file_url}#toolbar=1&zoom=page-width`;
  const downloadUrl = isDrive
    ? getDriveDownloadUrl(pdf.file_id!)
    : pdf.file_url;

  // Fetch the PDF using a ReadableStream to compute live percentage
  React.useEffect(() => {
    let isCancelled = false;
    let createdUrl: string | null = null;
    const abortController = new AbortController();

    async function fetchWithProgress() {
      setIsLoading(true);
      setProgress(0);
      setLoadedBytes(0);

      const fetchTarget = isDrive
        ? `/api/pdf/${pdf.file_id}?title=${encodeURIComponent(pdf.title)}`
        : pdf.file_url;

      try {
        const response = await fetch(fetchTarget, {
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }

        const contentLengthHeader = response.headers.get("content-length");
        const total = contentLengthHeader
          ? parseInt(contentLengthHeader, 10)
          : pdf.file_size || 0;

        if (total > 0) {
          setTotalBytes(total);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          setPdfBlobUrl(rawStreamUrl);
          setIsLoading(false);
          return;
        }

        const chunks: Uint8Array[] = [];
        let received = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          if (value) {
            chunks.push(value);
            received += value.length;
            setLoadedBytes(received);

            if (total > 0) {
              const pct = Math.min(100, Math.round((received / total) * 100));
              setProgress(pct);
            }
          }
        }

        if (isCancelled) return;

        // Combine chunks into a single Blob with application/pdf type
        const blob = new Blob(chunks as unknown as BlobPart[], {
          type: "application/pdf",
        });
        createdUrl = URL.createObjectURL(blob);
        setPdfBlobUrl(`${createdUrl}#toolbar=1&zoom=page-width`);
        setProgress(100);

        // Brief 150ms buffer for browser to mount PDF canvas before hiding overlay
        setTimeout(() => {
          if (!isCancelled) {
            setIsLoading(false);
          }
        }, 150);
      } catch (err: unknown) {
        if ((err as Error)?.name === "AbortError") return;
        console.warn("Could not stream with progress, falling back:", err);
        if (!isCancelled) {
          setPdfBlobUrl(rawStreamUrl);
          setIsLoading(false);
        }
      }
    }

    fetchWithProgress();

    return () => {
      isCancelled = true;
      abortController.abort();
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [isDrive, pdf.file_id, pdf.file_url, pdf.file_size, pdf.title, rawStreamUrl]);

  // Keyboard shortcut: Esc to restore/close, F to toggle stretch
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "Escape") {
        if (isStretched) {
          setIsStretched(false);
        } else {
          onClose();
        }
      } else if (e.key === "f" || e.key === "F") {
        setIsStretched((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isStretched, onClose]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/85 backdrop-blur-sm animate-in fade-in duration-150",
        isStretched ? "p-0" : "p-2 sm:p-4 md:p-6"
      )}
      onClick={(e) => {
        if (!isStretched && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={cn(
          "relative flex flex-col w-full bg-white dark:bg-[#0D1318] text-foreground border shadow-2xl ring-1 ring-slate-900/5 dark:ring-white/10 overflow-hidden transition-all duration-150",
          isStretched
            ? "fixed inset-0 w-screen h-screen max-w-none max-h-none rounded-none border-none ring-0 z-50"
            : "max-w-6xl h-[92dvh] sm:h-[90vh] rounded-xl sm:rounded-2xl border-slate-200/80 dark:border-white/10"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#111820] select-none shrink-0 h-11">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 pr-2 sm:pr-3">
            <div className="p-1 rounded-md bg-rose-50 text-rose-600 border border-rose-100/80 dark:border-transparent dark:bg-rose-500/10 dark:text-rose-400 shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-[#E8EDF0] truncate">
                {pdf.title}
              </h3>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-white/50">
                <span className="uppercase font-mono font-medium">
                  {pdf.source_type === "drive" ? "Google Drive" : "Supabase"}
                </span>
                {(totalBytes > 0 || pdf.file_size) && (
                  <>
                    <span>•</span>
                    <span className="font-mono">
                      {formatFileSize(totalBytes || pdf.file_size)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Stretch Screen Toggle (In-browser Fullscreen) */}
            <button
              type="button"
              onClick={() => setIsStretched((prev) => !prev)}
              title={
                isStretched
                  ? "Restore windowed view (F or Esc)"
                  : "Stretch to full screen (F)"
              }
              className={cn(
                "flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                isStretched
                  ? "bg-slate-100 text-slate-900 dark:bg-white/15 dark:text-white font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-white/70 dark:hover:text-white dark:hover:bg-white/10"
              )}
            >
              {isStretched ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Restore</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Stretch</span>
                </>
              )}
            </button>

            {/* Open in new tab */}
            <a
              href={pdf.file_url}
              target="_blank"
              rel="noopener noreferrer"
              title="Open in new tab"
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-white/70 dark:hover:text-white dark:hover:bg-white/10 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Open</span>
            </a>

            {/* Download */}
            <a
              href={pdfBlobUrl || downloadUrl}
              download={pdf.title.endsWith(".pdf") ? pdf.title : `${pdf.title}.pdf`}
              target={pdfBlobUrl ? undefined : "_blank"}
              rel="noopener noreferrer"
              title="Download PDF"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-white/70 dark:hover:text-white dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Download className="h-4 w-4" />
            </a>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              title="Close (Esc)"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-white/70 dark:hover:text-white dark:hover:bg-white/10 transition-colors cursor-pointer ml-0.5 sm:ml-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Document Frame */}
        <div className="flex-1 w-full h-[calc(100%-44px)] bg-[#F8FAFC] dark:bg-[#0A0E13] relative overflow-hidden">
          {/* Progress / Loading Screen */}
          {isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-[#0A0E13] p-4 text-center animate-in fade-in duration-150 select-none">
              {/* Subtle ambient light glow */}
              <div className="absolute w-72 h-72 rounded-full bg-rose-500/10 dark:bg-rose-500/15 blur-3xl pointer-events-none" />

              {/* Minimalist Floating Card */}
              <div className="relative z-10 w-full max-w-[320px] sm:max-w-[360px] p-4 sm:p-5 rounded-2xl bg-white/95 dark:bg-[#111822]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-2xl shadow-slate-900/10 dark:shadow-black/60 flex flex-col gap-3.5">
                {/* Header row: Icon + Document Title + Tabular % */}
                <div className="flex items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-rose-500" />
                      <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate leading-tight">
                        {pdf.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-white/45 truncate mt-0.5">
                        {progress >= 100
                          ? "Opening native viewer..."
                          : "Downloading document..."}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="text-base sm:text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                      {progress}
                      <span className="text-xs font-semibold text-rose-500 ml-0.5">%</span>
                    </span>
                  </div>
                </div>

                {/* Precision Micro Progress Bar */}
                <div className="w-full h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 via-rose-400 to-amber-400 rounded-full transition-all duration-150 ease-out relative"
                    style={{ width: `${Math.max(progress, 3)}%` }}
                  >
                    <div className="absolute inset-0 bg-white/25 animate-pulse" />
                  </div>
                </div>

                {/* Footer metrics: Loaded size vs Total + Source Badge */}
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-white/40 pt-0.5">
                  <span>
                    {loadedBytes > 0 ? formatFileSize(loadedBytes) : "0 B"}
                    {totalBytes > 0 && ` / ${formatFileSize(totalBytes)}`}
                  </span>
                  <span className="text-[9px] uppercase font-sans font-semibold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 text-slate-600 dark:text-white/60">
                    {pdf.source_type === "drive" ? "Google Drive" : "Storage"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Native PDF Iframe */}
          {pdfBlobUrl && (
            <iframe
              src={pdfBlobUrl}
              title={pdf.title}
              className="w-full h-full border-none block bg-[#F8FAFC] dark:bg-[#0A0E13]"
              allow="autoplay"
              onLoad={() => {
                if (progress >= 100) {
                  setIsLoading(false);
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
