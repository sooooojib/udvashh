"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  Trash2,
  ExternalLink,
  Download,
  Eye,
  X,
  UploadCloud,
  Link2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  ChevronDown,
  ChevronUp,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/utils/format";
import {
  addDrivePdf,
  deleteVideoPdf,
  getGoogleDriveAuthLink,
  type VideoPdfItem,
} from "@/app/actions/pdf";
import {
  extractGoogleDriveFileId,
  getDrivePreviewUrl,
  getDriveDownloadUrl,
} from "@/lib/utils/google-drive";

interface ActiveUploadTask {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  progress: number;
  statusText: string;
  mode: "drive" | "supabase";
  status: "queued" | "uploading" | "completed" | "error";
  errorMessage?: string;
}

interface VideoPdfSectionProps {
  videoId: string;
  initialPdfs: VideoPdfItem[];
  isAdmin?: boolean;
  moduleType?: "live" | "intensive" | "subject-hacks";
  isDriveConnected?: boolean;
}

export function VideoPdfSection({
  videoId,
  initialPdfs,
  isAdmin = false,
  moduleType = "live",
  isDriveConnected = false,
}: VideoPdfSectionProps) {
  const [pdfs, setPdfs] = React.useState<VideoPdfItem[]>(initialPdfs);
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [previewPdf, setPreviewPdf] = React.useState<VideoPdfItem | null>(null);

  // Three modes: "drive" (upload to Google Drive), "supabase" (upload to Supabase), "link" (paste Drive URL)
  const [uploadMode, setUploadMode] = React.useState<"drive" | "supabase" | "link">("drive");

  // Multi-File Upload State
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [uploadTitle, setUploadTitle] = React.useState("");
  const [activeUploads, setActiveUploads] = React.useState<ActiveUploadTask[]>([]);
  const [isDrawerExpanded, setIsDrawerExpanded] = React.useState(false);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Link Form State
  const [driveTitle, setDriveTitle] = React.useState("");
  const [driveUrl, setDriveUrl] = React.useState("");
  const [isAttachingDrive, setIsAttachingDrive] = React.useState(false);

  // Deletion state
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Auth link for Google Drive
  const [authUrl, setAuthUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    setPdfs(initialPdfs);
  }, [initialPdfs]);

  React.useEffect(() => {
    if (isAddModalOpen && isAdmin) {
      getGoogleDriveAuthLink()
        .then((url) => setAuthUrl(url))
        .catch(() => {});
    }
  }, [isAddModalOpen, isAdmin]);

  // Lock background scrolling when PDF preview modal (or add modal) is open
  React.useEffect(() => {
    if (previewPdf || isAddModalOpen) {
      const originalHtmlOverflow = document.documentElement.style.overflow;
      const originalHtmlOverscroll = document.documentElement.style.overscrollBehavior;
      const originalBodyOverflow = document.body.style.overflow;
      const originalBodyOverscroll = document.body.style.overscrollBehavior;

      document.documentElement.style.overflow = "hidden";
      document.documentElement.style.overscrollBehavior = "none";
      document.body.style.overflow = "hidden";
      document.body.style.overscrollBehavior = "none";

      return () => {
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.documentElement.style.overscrollBehavior = originalHtmlOverscroll;
        document.body.style.overflow = originalBodyOverflow;
        document.body.style.overscrollBehavior = originalBodyOverscroll;
      };
    }
  }, [previewPdf, isAddModalOpen]);

  // Handle ESC key to close open modals
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (previewPdf) setPreviewPdf(null);
        if (isAddModalOpen) setIsAddModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewPdf, isAddModalOpen]);

  const accentColor =
    moduleType === "intensive"
      ? "#F59E0B"
      : moduleType === "subject-hacks"
      ? "#3B82F6"
      : "#10B981";

  const buttonAccent =
    moduleType === "intensive"
      ? "bg-amber-500 hover:bg-amber-600 text-white"
      : moduleType === "subject-hacks"
      ? "bg-blue-600 hover:bg-blue-700 text-white"
      : "bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white";

  const iconAccent =
    moduleType === "intensive"
      ? "text-amber-500"
      : moduleType === "subject-hacks"
      ? "text-blue-500"
      : "text-emerald-600 dark:text-emerald-400";

  // Handle multi-file selection
  const handleFilesChange = (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    const validPdfs: File[] = [];

    Array.from(files).forEach((f) => {
      if (f.name.toLowerCase().endsWith(".pdf") || f.type === "application/pdf") {
        validPdfs.push(f);
      }
    });

    if (validPdfs.length === 0) {
      toast.error("Only PDF files (.pdf) are allowed.");
      return;
    }

    setSelectedFiles((prev) => {
      const combined = [...prev];
      validPdfs.forEach((newF) => {
        if (!combined.some((ex) => ex.name === newF.name && ex.size === newF.size)) {
          combined.push(newF);
        }
      });
      return combined;
    });

    if (validPdfs.length === 1 && selectedFiles.length === 0 && !uploadTitle.trim()) {
      const cleanName = validPdfs[0].name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ");
      setUploadTitle(cleanName);
    }
  };

  const removeSelectedFile = (indexToRemove: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  // Handle drag & drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      handleFilesChange(e.dataTransfer.files);
    }
  };

  // Handle batch file upload in background (YouTube-style queue, zero waiting time!)
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      toast.error("Please choose at least one PDF file.");
      return;
    }

    const filesToUpload = [...selectedFiles];
    const modeToUpload: "drive" | "supabase" =
      uploadMode === "supabase" ? "supabase" : "drive";
    const customSingleTitle = uploadTitle.trim();

    // Close the modal immediately so the user can continue watching uninterrupted!
    closeAndResetModal();

    const newTasks: ActiveUploadTask[] = filesToUpload.map((f, idx) => {
      const cleanName = f.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ");
      const title =
        filesToUpload.length === 1 && customSingleTitle
          ? customSingleTitle
          : cleanName;
      return {
        id: `${Date.now()}-${idx}-${f.name}`,
        title,
        fileName: f.name,
        fileSize: f.size,
        progress: 0,
        statusText: "Waiting in queue...",
        mode: modeToUpload,
        status: "queued" as const,
      };
    });

    setActiveUploads((prev) => [...prev, ...newTasks]);

    // Background Queue Runner (processes sequential uploads so personal accounts aren't throttled)
    (async () => {
      let cachedScriptUrl = "";
      if (modeToUpload === "drive") {
        try {
          const configRes = await fetch("/api/upload/drive/config");
          if (configRes.ok) {
            const cfg = await configRes.json();
            cachedScriptUrl = cfg.scriptUrl || "";
          }
        } catch (cfgErr) {
          console.error("Failed to load drive config:", cfgErr);
        }
      }

      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const task = newTasks[i];

        // Mark current file as actively uploading
        setActiveUploads((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  status: "uploading",
                  progress: 10,
                  statusText:
                    modeToUpload === "supabase"
                      ? "Connecting to Supabase Storage..."
                      : "Connecting to Google Drive bridge...",
                }
              : t
          )
        );

        try {
          if (modeToUpload === "supabase") {
            // 1. Get signed upload URL
            setActiveUploads((prev) =>
              prev.map((t) =>
                t.id === task.id
                  ? { ...t, progress: 25, statusText: "Authorizing upload..." }
                  : t
              )
            );

            const signRes = await fetch("/api/upload/supabase/sign", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ videoId, fileName: file.name }),
            });

            if (!signRes.ok) {
              const errData = await signRes.json().catch(() => ({}));
              throw new Error(errData.message || "Failed to initialize Supabase upload.");
            }

            const { signedUrl, storagePath } = await signRes.json();

            // 2. Upload directly to Supabase Storage
            setActiveUploads((prev) =>
              prev.map((t) =>
                t.id === task.id
                  ? { ...t, progress: 50, statusText: "Uploading to Supabase Storage..." }
                  : t
              )
            );

            const uploadRes = await fetch(signedUrl, {
              method: "PUT",
              headers: { "Content-Type": "application/pdf" },
              body: file,
            });

            if (!uploadRes.ok) {
              throw new Error(`Supabase upload failed (status ${uploadRes.status}).`);
            }

            // 3. Save database record
            setActiveUploads((prev) =>
              prev.map((t) =>
                t.id === task.id
                  ? { ...t, progress: 85, statusText: "Finalizing PDF record..." }
                  : t
              )
            );

            const completeRes = await fetch("/api/upload/supabase/complete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                videoId,
                title: task.title,
                storagePath,
                fileSize: file.size,
              }),
            });

            const completeData = await completeRes.json();
            if (!completeRes.ok || !completeData.success) {
              throw new Error(completeData.message || "Failed to finalize PDF record.");
            }

            setPdfs((prev) => [...prev, completeData.pdf]);
            setActiveUploads((prev) =>
              prev.map((t) =>
                t.id === task.id
                  ? {
                      ...t,
                      status: "completed",
                      progress: 100,
                      statusText: "Uploaded to Supabase!",
                    }
                  : t
              )
            );
            toast.success(`Uploaded: ${task.title}`);
          } else {
            // GOOGLE DRIVE UPLOAD
            if (!cachedScriptUrl) {
              const configRes = await fetch("/api/upload/drive/config");
              if (!configRes.ok) {
                const errData = await configRes.json().catch(() => ({}));
                throw new Error(errData.message || "Failed to connect to Google Drive bridge.");
              }
              const cfg = await configRes.json();
              cachedScriptUrl = cfg.scriptUrl;
            }

            // 2. Read PDF as base64 in browser
            setActiveUploads((prev) =>
              prev.map((t) =>
                t.id === task.id
                  ? { ...t, progress: 30, statusText: "Processing PDF..." }
                  : t
              )
            );

            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result as string;
                const commaIdx = result.indexOf(",");
                resolve(commaIdx !== -1 ? result.slice(commaIdx + 1) : result);
              };
              reader.onerror = () => reject(new Error("Failed to read PDF file"));
              reader.readAsDataURL(file);
            });

            // 3. Upload directly to Google Drive via Apps Script
            setActiveUploads((prev) =>
              prev.map((t) =>
                t.id === task.id
                  ? { ...t, progress: 60, statusText: "Uploading to Google Drive..." }
                  : t
              )
            );

            const scriptRes = await fetch(cachedScriptUrl, {
              method: "POST",
              headers: { "Content-Type": "text/plain;charset=utf-8" },
              body: JSON.stringify({
                fileName: file.name,
                base64,
              }),
            });

            if (!scriptRes.ok) {
              throw new Error(`Google Drive bridge returned status ${scriptRes.status}`);
            }

            const scriptData = await scriptRes.json();
            if (!scriptData.success || !scriptData.fileId) {
              throw new Error(scriptData.error || "Google Drive upload was unsuccessful.");
            }

            // 4. Save record in database
            setActiveUploads((prev) =>
              prev.map((t) =>
                t.id === task.id
                  ? { ...t, progress: 90, statusText: "Finalizing Drive record..." }
                  : t
              )
            );

            const completeRes = await fetch("/api/upload/drive/complete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                videoId,
                title: task.title,
                fileId: scriptData.fileId,
                webViewLink: scriptData.webViewLink,
                fileSize: file.size,
              }),
            });

            const completeData = await completeRes.json();
            if (!completeRes.ok || !completeData.success) {
              throw new Error(completeData.message || "Failed to save Drive PDF record.");
            }

            setPdfs((prev) => [...prev, completeData.pdf]);
            setActiveUploads((prev) =>
              prev.map((t) =>
                t.id === task.id
                  ? {
                      ...t,
                      status: "completed",
                      progress: 100,
                      statusText: "Uploaded to Google Drive!",
                    }
                  : t
              )
            );
            toast.success(`Uploaded: ${task.title}`);
          }
        } catch (err: unknown) {
          console.error(`Upload error for ${file.name}:`, err);
          const msg =
            err instanceof Error ? err.message : "Upload failed.";
          setActiveUploads((prev) =>
            prev.map((t) =>
              t.id === task.id
                ? {
                    ...t,
                    status: "error",
                    errorMessage: msg,
                    statusText: msg,
                  }
                : t
            )
          );
          toast.error(`Failed to upload ${file.name}: ${msg}`);
        }
      }
    })();
  };

  // Handle Google Drive Link Attachment
  const detectedDriveId = extractGoogleDriveFileId(driveUrl);

  const handleDriveAttach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driveTitle.trim() || !driveUrl.trim()) {
      toast.error("Please enter both a title and Google Drive link.");
      return;
    }

    if (!detectedDriveId) {
      toast.error("Invalid Google Drive URL. Please paste a valid shareable link.");
      return;
    }

    setIsAttachingDrive(true);
    try {
      const res = await addDrivePdf({
        videoId,
        title: driveTitle.trim(),
        driveUrl: driveUrl.trim(),
      });

      if (res.success && res.pdf) {
        toast.success("Drive link attached!");
        setPdfs((prev) => [...prev, res.pdf!]);
        closeAndResetModal();
      } else {
        toast.error(res.message || "Failed to attach Google Drive link.");
      }
    } catch {
      toast.error("Failed to attach Google Drive link.");
    } finally {
      setIsAttachingDrive(false);
    }
  };

  // Handle PDF deletion
  const handleDeletePdf = async (pdfId: string) => {
    if (!confirm("Are you sure you want to delete this PDF?")) return;
    setDeletingId(pdfId);

    try {
      const res = await deleteVideoPdf({ pdfId, videoId });
      if (res.success) {
        toast.success("PDF removed.");
        setPdfs((prev) => prev.filter((p) => p.id !== pdfId));
        if (previewPdf?.id === pdfId) setPreviewPdf(null);
      } else {
        toast.error(res.message || "Failed to delete PDF.");
      }
    } catch {
      toast.error("Error deleting PDF.");
    } finally {
      setDeletingId(null);
    }
  };

  const closeAndResetModal = () => {
    setIsAddModalOpen(false);
    setSelectedFiles([]);
    setUploadTitle("");
    setDriveTitle("");
    setDriveUrl("");
    setUploadMode("drive");
  };

  return (
    <section className="mt-5">
      {/* ── Section Header ── */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center w-7 h-7 rounded-lg"
            style={{ backgroundColor: `${accentColor}15` }}
          >
            <FileText className="h-3.5 w-3.5" style={{ color: accentColor }} />
          </div>
          <h3 className="font-semibold text-[13px] tracking-tight text-foreground dark:text-[#E8EDF0]">
            Lecture Notes
          </h3>
          {pdfs.length > 0 && (
            <span
              className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-md text-[10px] font-bold tabular-nums"
              style={{
                backgroundColor: `${accentColor}18`,
                color: accentColor,
              }}
            >
              {pdfs.length}
            </span>
          )}
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className={cn(
              "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-all duration-200",
              "active:scale-[0.97] hover:shadow-md",
              buttonAccent
            )}
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            Add
          </button>
        )}
      </div>

      {/* ── PDF List ── */}
      {pdfs.length === 0 && activeUploads.length === 0 ? (
        <div className="flex items-center gap-3 py-4 px-4 rounded-xl border border-dashed border-border/50 dark:border-[#1F2C34]/60 bg-muted/10 dark:bg-[#111820]/40">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted/30 dark:bg-[#141E28]/60">
            <FileText className="h-4 w-4 text-muted-foreground/50 dark:text-[#5C6A72]" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground dark:text-[#9AA7AE]">
              No notes attached yet
            </p>
            <p className="text-[11px] text-muted-foreground/60 dark:text-[#5C6A72] mt-0.5">
              {isAdmin
                ? 'Click "Add" to attach lecture PDFs'
                : "Lecture notes will appear here when added"}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {/* Optimistic Ghost Cards while uploading/queued */}
          {activeUploads
            .filter((t) => t.status === "uploading" || t.status === "queued")
            .map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl border border-dashed transition-all duration-200 animate-pulse"
                style={{
                  borderColor: `${accentColor}50`,
                  backgroundColor: `${accentColor}08`,
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                    style={{ backgroundColor: `${accentColor}18` }}
                  >
                    <Loader2 className="h-4 w-4 animate-spin" style={{ color: accentColor }} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-foreground dark:text-[#E8EDF0] truncate">
                        {task.title}
                      </p>
                      <span
                        className="px-1.5 py-0.5 text-[9px] font-bold rounded"
                        style={{
                          backgroundColor: `${accentColor}20`,
                          color: accentColor,
                        }}
                      >
                        {task.mode === "drive" ? "Drive" : "Supabase"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground dark:text-[#9AA7AE] mt-0.5">
                      <span>{task.statusText}</span>
                      {task.status === "uploading" && (
                        <>
                          <span>•</span>
                          <span className="font-mono font-medium">{task.progress}%</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="w-20 hidden sm:block shrink-0">
                  <div className="w-full h-1.5 bg-muted/40 dark:bg-[#1A2530] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: task.status === "uploading" ? `${task.progress}%` : "15%",
                        backgroundColor: accentColor,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          {pdfs.map((pdf, idx) => {
            const isDrive = pdf.source_type === "drive";
            const downloadUrl =
              isDrive && pdf.file_id
                ? getDriveDownloadUrl(pdf.file_id)
                : pdf.file_url;

            return (
              <div
                key={pdf.id}
                className={cn(
                  "group flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all duration-200",
                  "border-border/40 bg-card/60 hover:bg-card dark:border-[#1F2C34]/60 dark:bg-[#111820]/50 dark:hover:bg-[#141E28]",
                  "hover:border-border/60 dark:hover:border-[#1F2C34] hover:shadow-sm"
                )}
                style={{
                  animationDelay: `${idx * 50}ms`,
                }}
              >
                {/* PDF Icon */}
                <div
                  className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 transition-transform duration-200 group-hover:scale-105"
                  style={{
                    backgroundColor: isDrive ? "#10B98118" : "#F4364C18",
                  }}
                >
                  <FileText
                    className="h-4 w-4"
                    style={{ color: isDrive ? "#10B981" : "#F4364C" }}
                  />
                </div>

                {/* Title + Meta */}
                <div className="min-w-0 flex-1">
                  <p
                    title={pdf.title}
                    className="font-medium text-xs text-foreground dark:text-[#E8EDF0] truncate leading-snug"
                  >
                    {pdf.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-[1px] rounded"
                      style={{
                        backgroundColor: isDrive ? "#10B98112" : "#F4364C12",
                        color: isDrive ? "#10B981" : "#F4364C",
                      }}
                    >
                      {isDrive ? "Drive" : "Upload"}
                    </span>
                    {pdf.file_size && (
                      <span className="text-[10px] text-muted-foreground/70 dark:text-[#5C6A72] font-mono">
                        {formatFileSize(pdf.file_size)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    type="button"
                    onClick={() => setPreviewPdf(pdf)}
                    title="Preview"
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:text-[#9AA7AE] dark:hover:text-white dark:hover:bg-[#1F2C34] transition-all duration-150 cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>

                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={!isDrive}
                    title="Download"
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:text-[#9AA7AE] dark:hover:text-white dark:hover:bg-[#1F2C34] transition-all duration-150 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDeletePdf(pdf.id)}
                      disabled={deletingId === pdf.id}
                      title="Delete"
                      className="p-2 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 dark:text-[#9AA7AE] dark:hover:text-rose-400 dark:hover:bg-rose-500/15 transition-all duration-150 disabled:opacity-40 cursor-pointer"
                    >
                      {deletingId === pdf.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-500" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Document Preview Modal ── */}
      {previewPdf && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overscroll-contain"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewPdf(null);
          }}
          onWheel={(e) => {
            if (e.target === e.currentTarget) e.preventDefault();
          }}
        >
          <div className="relative flex flex-col w-full max-w-5xl h-[88vh] rounded-2xl border border-border/40 bg-card shadow-2xl overflow-hidden dark:border-[#1F2C34] dark:bg-[#0D1318] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 dark:border-[#1F2C34] bg-muted/30 dark:bg-[#111820]">
              <div className="flex items-center gap-2.5 min-w-0 pr-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-rose-500/10">
                  <FileText className="h-3.5 w-3.5 text-rose-500" />
                </div>
                <h3 className="font-semibold text-xs sm:text-sm text-foreground dark:text-[#E8EDF0] truncate">
                  {previewPdf.title}
                </h3>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={previewPdf.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:text-[#9AA7AE] dark:hover:text-white dark:hover:bg-[#1F2C34] transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Open</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewPdf(null)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:text-[#9AA7AE] dark:hover:text-white dark:hover:bg-[#1F2C34] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Document Iframe */}
            <div className="flex-1 w-full bg-black/90 relative">
              <iframe
                src={
                  previewPdf.source_type === "drive" && previewPdf.file_id
                    ? getDrivePreviewUrl(previewPdf.file_id)
                    : `${previewPdf.file_url}#toolbar=1`
                }
                title={previewPdf.title}
                className="w-full h-full border-none"
                allow="autoplay"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Add PDF Modal ── */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overscroll-contain"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAndResetModal();
          }}
          onWheel={(e) => {
            if (e.target === e.currentTarget) e.preventDefault();
          }}
        >
          <div className="relative w-full max-w-[420px] rounded-2xl border border-border/50 bg-card shadow-2xl dark:border-[#1F2C34] dark:bg-[#0D1318] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40 dark:border-[#1F2C34]">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex items-center justify-center w-7 h-7 rounded-lg"
                  style={{ backgroundColor: `${accentColor}15` }}
                >
                  <Plus className="h-3.5 w-3.5" style={{ color: accentColor }} />
                </div>
                <h3 className="font-semibold text-sm text-foreground dark:text-[#E8EDF0]">
                  Add PDF
                </h3>
              </div>
              <button
                type="button"
                onClick={closeAndResetModal}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:text-[#9AA7AE] dark:hover:text-white dark:hover:bg-[#1F2C34] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5">
              {/* Mode Toggle — 3 tabs */}
              <div className="relative flex p-1 mb-5 rounded-xl bg-muted/30 border border-border/30 dark:border-[#1F2C34]/80 dark:bg-[#111820]">
                {/* Sliding indicator */}
                <div
                  className="absolute top-1 bottom-1 rounded-[10px] transition-all duration-300 ease-out shadow-sm"
                  style={{
                    left:
                      uploadMode === "drive"
                        ? "4px"
                        : uploadMode === "supabase"
                        ? "calc(33.333% + 0px)"
                        : "calc(66.666% - 4px)",
                    width: "calc(33.333% - 4px)",
                    backgroundColor: `${accentColor}18`,
                    border: `1px solid ${accentColor}30`,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setUploadMode("drive")}
                  className={cn(
                    "relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[10px] text-[11px] font-semibold transition-colors duration-200",
                    uploadMode === "drive"
                      ? "text-foreground dark:text-white"
                      : "text-muted-foreground dark:text-[#9AA7AE] hover:text-foreground dark:hover:text-white"
                  )}
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  Drive
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode("supabase")}
                  className={cn(
                    "relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[10px] text-[11px] font-semibold transition-colors duration-200",
                    uploadMode === "supabase"
                      ? "text-foreground dark:text-white"
                      : "text-muted-foreground dark:text-[#9AA7AE] hover:text-foreground dark:hover:text-white"
                  )}
                >
                  <HardDrive className="h-3.5 w-3.5" />
                  Supabase
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode("link")}
                  className={cn(
                    "relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[10px] text-[11px] font-semibold transition-colors duration-200",
                    uploadMode === "link"
                      ? "text-foreground dark:text-white"
                      : "text-muted-foreground dark:text-[#9AA7AE] hover:text-foreground dark:hover:text-white"
                  )}
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Link
                </button>
              </div>

              {/* Upload File Mode (Drive or Supabase) */}
              {uploadMode !== "link" ? (
                <form onSubmit={handleFileUpload} className="space-y-4">
                  {/* Drive Connection Status (only show in drive mode) */}
                  {uploadMode === "drive" && !isDriveConnected && authUrl && (
                    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/8">
                      <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                        <span>Connect Google Drive first</span>
                      </div>
                      <a
                        href={authUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-500 hover:bg-amber-600 text-white shrink-0 transition-colors"
                      >
                        Connect
                      </a>
                    </div>
                  )}

                  {uploadMode === "drive" && isDriveConnected && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-500/15 bg-emerald-500/5 dark:bg-emerald-500/8">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                        Google Drive connected
                      </span>
                    </div>
                  )}

                  {uploadMode === "supabase" && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-blue-500/15 bg-blue-500/5 dark:bg-blue-500/8">
                      <HardDrive className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">
                        Uploads to Supabase Storage (50 MB limit)
                      </span>
                    </div>
                  )}

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      handleFilesChange(e.target.files);
                      e.target.value = "";
                    }}
                  />

                  {/* Drag & Drop Zone */}
                  <div
                    className={cn(
                      "relative flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200",
                      isDragOver
                        ? "border-current bg-current/5 scale-[1.01]"
                        : selectedFiles.length > 0
                        ? "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-500/8"
                        : "border-border/50 bg-muted/10 hover:border-border/80 hover:bg-muted/20 dark:border-[#1F2C34] dark:bg-[#111820]/50 dark:hover:border-[#253342]"
                    )}
                    style={isDragOver ? { color: accentColor } : undefined}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-muted/30 dark:bg-[#141E28]">
                      {selectedFiles.length > 0 ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <UploadCloud className="h-5 w-5 text-muted-foreground/60 dark:text-[#5C6A72]" />
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium text-foreground dark:text-[#E8EDF0]">
                        {selectedFiles.length > 0
                          ? `${selectedFiles.length} ${selectedFiles.length === 1 ? "PDF" : "PDFs"} selected`
                          : "Drop PDF(s) here or browse"}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 dark:text-[#5C6A72] mt-0.5">
                        {selectedFiles.length > 0
                          ? "Click to choose or drop more PDFs"
                          : "Supports multiple PDF selection at once"}
                      </p>
                    </div>
                  </div>

                  {/* Selected Files List */}
                  {selectedFiles.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="font-semibold text-foreground/80 dark:text-[#E8EDF0]">
                          Files to upload ({selectedFiles.length})
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px]">
                            {formatFileSize(
                              selectedFiles.reduce((acc, f) => acc + f.size, 0)
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFiles([]);
                              setUploadTitle("");
                            }}
                            className="text-[11px] text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            Clear all
                          </button>
                        </div>
                      </div>

                      <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                        {selectedFiles.map((file, idx) => (
                          <div
                            key={`${file.name}-${idx}`}
                            className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border/40 dark:border-[#1F2C34] bg-muted/20 dark:bg-[#111820]"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-medium truncate text-foreground dark:text-[#E8EDF0]">
                                  {file.name}
                                </p>
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  {formatFileSize(file.size)}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeSelectedFile(idx);
                              }}
                              className="p-1 rounded-md text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer shrink-0"
                              title="Remove file"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Title Input (only if exactly 1 file is selected) */}
                  {selectedFiles.length === 1 && (
                    <div className="space-y-1.5">
                      <label
                        htmlFor="upload-title"
                        className="text-[11px] font-semibold text-muted-foreground dark:text-[#9AA7AE] uppercase tracking-wider"
                      >
                        Title (Optional)
                      </label>
                      <Input
                        id="upload-title"
                        placeholder="e.g. Lecture 01 — Problem Solving"
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value)}
                        className="h-9 text-xs rounded-xl border-border/40 dark:border-[#1F2C34] dark:bg-[#111820] focus-visible:ring-1"
                        style={
                          {
                            "--tw-ring-color": `${accentColor}50`,
                          } as React.CSSProperties
                        }
                      />
                    </div>
                  )}

                  {selectedFiles.length > 1 && (
                    <p className="text-[11px] text-muted-foreground/70 dark:text-[#788896]">
                      * Each PDF will automatically be titled using its clean file name.
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={closeAndResetModal}
                      className="h-9 rounded-xl text-xs px-4 border border-border/70 bg-card text-muted-foreground hover:text-foreground hover:bg-muted/80 dark:border-[#1F2C34] dark:bg-[#141E28] dark:text-[#9AA7AE] dark:hover:bg-[#1F2C34] dark:hover:text-white font-medium transition-all active:scale-[0.98] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={selectedFiles.length === 0}
                      className={cn(
                        "inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl text-xs font-semibold transition-all duration-200",
                        "disabled:opacity-40 disabled:cursor-not-allowed",
                        "active:scale-[0.97]",
                        buttonAccent
                      )}
                    >
                      {uploadMode === "supabase" ? (
                        <HardDrive className="h-3.5 w-3.5" />
                      ) : (
                        <UploadCloud className="h-3.5 w-3.5" />
                      )}
                      {selectedFiles.length > 1
                        ? `Upload ${selectedFiles.length} PDFs to ${uploadMode === "supabase" ? "Supabase" : "Drive"}`
                        : uploadMode === "supabase"
                        ? "Upload to Supabase"
                        : "Upload to Drive"}
                    </button>
                  </div>
                </form>
              ) : (
                /* Paste Link Mode */
                <form onSubmit={handleDriveAttach} className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="drive-title"
                      className="text-[11px] font-semibold text-muted-foreground dark:text-[#9AA7AE] uppercase tracking-wider"
                    >
                      Title
                    </label>
                    <Input
                      id="drive-title"
                      placeholder="e.g. Class 01 Lecture Notes"
                      value={driveTitle}
                      onChange={(e) => setDriveTitle(e.target.value)}
                      disabled={isAttachingDrive}
                      className="h-9 text-xs rounded-xl border-border/40 dark:border-[#1F2C34] dark:bg-[#111820] focus-visible:ring-1"
                      style={
                        {
                          "--tw-ring-color": `${accentColor}50`,
                        } as React.CSSProperties
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="drive-url"
                      className="text-[11px] font-semibold text-muted-foreground dark:text-[#9AA7AE] uppercase tracking-wider"
                    >
                      Google Drive URL
                    </label>
                    <Input
                      id="drive-url"
                      placeholder="https://drive.google.com/file/d/.../view"
                      value={driveUrl}
                      onChange={(e) => setDriveUrl(e.target.value)}
                      disabled={isAttachingDrive}
                      className="h-9 text-xs rounded-xl font-mono border-border/40 dark:border-[#1F2C34] dark:bg-[#111820] focus-visible:ring-1"
                      style={
                        {
                          "--tw-ring-color": `${accentColor}50`,
                        } as React.CSSProperties
                      }
                    />
                    {driveUrl && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {detectedDriveId ? (
                          <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="h-3 w-3" />
                            Valid Drive link detected
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                            <AlertCircle className="h-3 w-3" />
                            Enter a valid Google Drive share link
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={closeAndResetModal}
                      disabled={isAttachingDrive}
                      className="h-9 rounded-xl text-xs px-4 border border-border/70 bg-card text-muted-foreground hover:text-foreground hover:bg-muted/80 dark:border-[#1F2C34] dark:bg-[#141E28] dark:text-[#9AA7AE] dark:hover:bg-[#1F2C34] dark:hover:text-white font-medium transition-all active:scale-[0.98] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!driveTitle.trim() || !driveUrl.trim() || isAttachingDrive}
                      className={cn(
                        "inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl text-xs font-semibold transition-all duration-200",
                        "disabled:opacity-40 disabled:cursor-not-allowed",
                        "active:scale-[0.97]",
                        buttonAccent
                      )}
                    >
                      {isAttachingDrive ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Attaching…
                        </>
                      ) : (
                        <>
                          <Link2 className="h-3.5 w-3.5" />
                          Attach
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── YouTube-Style Floating Upload Manager ── */}
      {activeUploads.length > 0 && (() => {
        const total = activeUploads.length;
        const completedCount = activeUploads.filter((t) => t.status === "completed").length;
        const hasErrors = activeUploads.some((t) => t.status === "error");
        const allCompleted = completedCount === total && total > 0;
        const overallProgress = Math.round(
          activeUploads.reduce(
            (acc, t) => acc + (t.status === "completed" ? 100 : t.progress),
            0
          ) / (total || 1)
        );

        return (
          <aside
            aria-label="Upload manager"
            className={cn(
              "fixed bottom-5 right-5 z-50 w-[340px] sm:w-[380px] rounded-2xl border shadow-2xl transition-all duration-300 overflow-hidden",
              "bg-background/95 dark:bg-[#10171F]/95 backdrop-blur-xl border-border/80 dark:border-[#222F3D]",
              allCompleted
                ? "border-emerald-500/50 ring-1 ring-emerald-500/20"
                : hasErrors
                ? "border-amber-500/40 ring-1 ring-amber-500/20"
                : "ring-1 ring-black/5 dark:ring-white/5"
            )}
          >
            {/* Header summary bar (Clickable to expand/collapse) */}
            <div
              onClick={() => setIsDrawerExpanded((prev) => !prev)}
              className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 dark:hover:bg-[#141D26] transition-colors select-none"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0 transition-colors"
                  style={{
                    backgroundColor: allCompleted
                      ? "#10B98120"
                      : hasErrors
                      ? "#F59E0B20"
                      : `${accentColor}18`,
                  }}
                >
                  {allCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : hasErrors ? (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin" style={{ color: accentColor }} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground dark:text-[#E8EDF0] truncate">
                    {allCompleted
                      ? `${total} ${total === 1 ? "PDF" : "PDFs"} uploaded`
                      : total === 1
                      ? `Uploading ${activeUploads[0].title}`
                      : `Uploading ${total} PDFs (${completedCount}/${total} done)`}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground dark:text-[#788896]">
                    <span className="font-mono font-medium">{overallProgress}%</span>
                    <span>•</span>
                    <span>{isDrawerExpanded ? "Click to collapse" : "Click to view queue"}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDrawerExpanded((prev) => !prev);
                  }}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title={isDrawerExpanded ? "Collapse" : "Expand"}
                >
                  {isDrawerExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </button>
                {(allCompleted || hasErrors) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveUploads([]);
                      setIsDrawerExpanded(false);
                    }}
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                    title="Dismiss all"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Overall Batch Progress Bar */}
            <div className="w-full h-1 bg-muted/40 dark:bg-[#1A2530] overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${overallProgress}%`,
                  backgroundColor: allCompleted
                    ? "#10B981"
                    : hasErrors
                    ? "#F59E0B"
                    : accentColor,
                }}
              />
            </div>

            {/* Expanded Itemized Queue */}
            {isDrawerExpanded && (
              <div className="max-h-60 overflow-y-auto px-4 py-2.5 divide-y divide-border/30 dark:divide-[#1F2C34]/60">
                {activeUploads.map((task) => (
                  <div key={task.id} className="py-2.5 first:pt-1 last:pb-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                        <span className="text-xs font-medium text-foreground dark:text-[#E8EDF0] truncate">
                          {task.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono shrink-0">
                        {task.status === "completed" ? (
                          <span className="text-emerald-500 font-semibold flex items-center gap-0.5">
                            <CheckCircle2 className="h-3 w-3 inline" /> Done
                          </span>
                        ) : task.status === "error" ? (
                          <span className="text-rose-500 font-semibold flex items-center gap-0.5">
                            <AlertCircle className="h-3 w-3 inline" /> Failed
                          </span>
                        ) : task.status === "uploading" ? (
                          <span style={{ color: accentColor }} className="font-semibold">
                            {task.progress}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Queued</span>
                        )}
                      </span>
                    </div>

                    {task.status === "uploading" && (
                      <div className="w-full h-1 bg-muted/40 dark:bg-[#1A2530] rounded-full overflow-hidden mt-1.5">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${task.progress}%`, backgroundColor: accentColor }}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground/70 dark:text-[#788896] mt-1">
                      <span className="truncate">{task.statusText}</span>
                      <span>{formatFileSize(task.fileSize)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        );
      })()}
    </section>
  );
}
