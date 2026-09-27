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
  RotateCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/utils/format";
import {
  addDrivePdf,
  deleteVideoPdf,
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
}: VideoPdfSectionProps) {
  const [pdfs, setPdfs] = React.useState<VideoPdfItem[]>(initialPdfs);
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [previewPdf, setPreviewPdf] = React.useState<VideoPdfItem | null>(null);

  // Upload mode: "drive" (default, direct via Apps Script), "supabase" (Supabase storage), "link" (paste link)
  const [uploadMode, setUploadMode] = React.useState<"drive" | "supabase" | "link">("drive");

  // Multi-File Upload State
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [uploadTitle, setUploadTitle] = React.useState("");
  const [activeUploads, setActiveUploads] = React.useState<ActiveUploadTask[]>([]);
  const [isDrawerExpanded, setIsDrawerExpanded] = React.useState(false);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // File handle cache for one-click re-try
  const fileMapRef = React.useRef<Map<string, File>>(new Map());

  // Link Form State
  const [driveTitle, setDriveTitle] = React.useState("");
  const [driveUrl, setDriveUrl] = React.useState("");
  const [isAttachingDrive, setIsAttachingDrive] = React.useState(false);

  // Deletion state
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setPdfs(initialPdfs);
  }, [initialPdfs]);

  // Lock background scrolling when PDF preview modal or add modal is open
  React.useEffect(() => {
    if (previewPdf || isAddModalOpen) {
      const originalHtmlOverflow = document.documentElement.style.overflow;
      const originalHtmlOverscroll = document.documentElement.style.overscrollBehavior;
      const originalBodyOverflow = document.body.style.overflow;
      const originalBodyOverscroll = document.body.style.overscrollBehavior;

      document.documentElement.style.overflow = "hidden";
      document.documentElement.style.overscrollBehavior = "none";
      document.body.style.overflow = "hidden";
      document.body.style.overflow = "none";

      return () => {
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.documentElement.style.overscrollBehavior = originalHtmlOverscroll;
        document.body.style.overflow = originalBodyOverflow;
        document.body.style.overflow = originalBodyOverscroll;
      };
    }
  }, [previewPdf, isAddModalOpen]);

  // Handle ESC key to close open modals
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (previewPdf) setPreviewPdf(null);
        if (isAddModalOpen) closeAndResetModal();
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

  // Helper to update individual active upload task
  const updateTask = (taskId: string, partial: Partial<ActiveUploadTask>) => {
    setActiveUploads((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...partial } : t))
    );
  };

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

  // Drag & drop handlers
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

  /**
   * Executes a single file upload with automatic retry on transient failure
   */
  const executeSingleUpload = async (
    task: ActiveUploadTask,
    file: File,
    scriptUrlHint?: string
  ): Promise<{ success: boolean; scriptUrl?: string }> => {
    let resolvedScriptUrl = scriptUrlHint || "";

    updateTask(task.id, {
      status: "uploading",
      progress: 15,
      statusText:
        task.mode === "supabase"
          ? "Connecting to Supabase Storage..."
          : "Connecting to Google Drive bridge...",
    });

    try {
      if (task.mode === "supabase") {
        // --- Supabase Upload Flow ---
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

        updateTask(task.id, { progress: 45, statusText: "Uploading to storage..." });

        // Upload directly to Supabase storage with retry
        let uploadOk = false;
        let lastError: Error | null = null;
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            if (attempt > 1) {
              updateTask(task.id, {
                statusText: "Network busy, auto-retrying...",
                progress: 50,
              });
              await new Promise((r) => setTimeout(r, 2000));
            }

            const uploadRes = await fetch(signedUrl, {
              method: "PUT",
              headers: { "Content-Type": "application/pdf" },
              body: file,
            });

            if (uploadRes.ok) {
              uploadOk = true;
              break;
            } else {
              throw new Error(`Upload returned status ${uploadRes.status}`);
            }
          } catch (err: unknown) {
            lastError = err instanceof Error ? err : new Error(String(err));
          }
        }

        if (!uploadOk) {
          throw lastError || new Error("Failed to upload to Supabase Storage.");
        }

        updateTask(task.id, { progress: 85, statusText: "Finalizing PDF record..." });

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
        updateTask(task.id, {
          status: "completed",
          progress: 100,
          statusText: "Uploaded to Supabase!",
        });
        toast.success(`Uploaded: ${task.title}`);
        return { success: true };
      } else {
        // --- Google Drive Direct Flow (via Apps Script) ---
        if (!resolvedScriptUrl) {
          const configRes = await fetch("/api/upload/drive/config");
          if (!configRes.ok) {
            const errData = await configRes.json().catch(() => ({}));
            throw new Error(errData.message || "Failed to connect to Google Drive bridge.");
          }
          const cfg = await configRes.json();
          resolvedScriptUrl = cfg.scriptUrl;
        }

        updateTask(task.id, { progress: 30, statusText: "Processing PDF data..." });

        // Convert file to base64
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

        updateTask(task.id, { progress: 60, statusText: "Uploading to Google Drive..." });

        // Upload with automatic retry on transient network/Apps Script errors
        let scriptData: { fileId?: string; webViewLink?: string } | null = null;
        const maxAttempts = 2;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            if (attempt > 1) {
              updateTask(task.id, {
                statusText: `Connection busy, auto-retrying (${attempt}/${maxAttempts})...`,
                progress: 55,
              });
              await new Promise((r) => setTimeout(r, 2500));
            }

            const scriptRes = await fetch(resolvedScriptUrl, {
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

            const data = await scriptRes.json();
            if (!data.success || !data.fileId) {
              throw new Error(data.error || "Google Drive upload failed.");
            }

            scriptData = data;
            break; // Succeeded!
          } catch (err: unknown) {
            if (attempt >= maxAttempts) throw err;
            console.warn(`Drive upload attempt ${attempt} failed, will auto-retry:`, err);
          }
        }

        if (!scriptData || !scriptData.fileId) {
          throw new Error("Google Drive upload did not return a valid file ID.");
        }

        updateTask(task.id, { progress: 90, statusText: "Finalizing Drive record..." });

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
          throw new Error(completeData.message || "Failed to record Drive PDF.");
        }

        setPdfs((prev) => [...prev, completeData.pdf]);
        updateTask(task.id, {
          status: "completed",
          progress: 100,
          statusText: "Uploaded to Google Drive!",
        });
        toast.success(`Uploaded: ${task.title}`);
        return { success: true, scriptUrl: resolvedScriptUrl };
      }
    } catch (err: unknown) {
      console.error(`Upload error for ${task.fileName}:`, err);
      const msg = err instanceof Error ? err.message : "Upload failed.";
      updateTask(task.id, {
        status: "error",
        errorMessage: msg,
        statusText: `Failed: ${msg}`,
      });
      toast.error(`Failed to upload ${task.fileName}: ${msg}`);
      return { success: false, scriptUrl: resolvedScriptUrl };
    }
  };

  // Re-try a single failed task on demand
  const handleRetryTask = async (taskId: string) => {
    const task = activeUploads.find((t) => t.id === taskId);
    const file = fileMapRef.current.get(taskId);

    if (!task || !file) {
      toast.error("File reference expired. Please re-select the file.");
      return;
    }

    updateTask(taskId, {
      status: "uploading",
      progress: 10,
      statusText: "Retrying upload...",
      errorMessage: undefined,
    });

    await executeSingleUpload(task, file);
  };

  // Batch upload submission handler
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

    // Close the modal immediately so the user can continue viewing videos without waiting
    closeAndResetModal();

    const newTasks: ActiveUploadTask[] = filesToUpload.map((f, idx) => {
      const cleanName = f.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ");
      const title =
        filesToUpload.length === 1 && customSingleTitle
          ? customSingleTitle
          : cleanName;
      const taskId = `${Date.now()}-${idx}-${f.name}`;

      // Save file reference in memory for potential one-click retry
      fileMapRef.current.set(taskId, f);

      return {
        id: taskId,
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

    // Sequential Queue Runner with inter-file cooldown delay
    (async () => {
      let cachedScriptUrl = "";

      for (let i = 0; i < newTasks.length; i++) {
        const task = newTasks[i];
        const file = filesToUpload[i];

        const res = await executeSingleUpload(task, file, cachedScriptUrl);
        if (res.scriptUrl) {
          cachedScriptUrl = res.scriptUrl;
        }

        // Inter-file cooldown delay: give Google Apps Script instance & network 2000ms to recycle
        if (i < newTasks.length - 1) {
          updateTask(task.id, {
            statusText: "Uploaded! Cooldown before next file...",
          });
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    })();
  };

  // Google Drive Link Attachment
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

  // PDF deletion
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

  // Queue status summary
  const hasActiveUploads = activeUploads.length > 0;
  const inProgressUploads = activeUploads.filter(
    (t) => t.status === "uploading" || t.status === "queued"
  );
  const isAnyUploading = inProgressUploads.length > 0;

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
              "active:scale-[0.97] hover:shadow-md cursor-pointer",
              buttonAccent
            )}
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            Add Note
          </button>
        )}
      </div>

      {/* ── Minimal Pending Upload Strip (Modern, non-intrusive) ── */}
      {isAnyUploading && (
        <div
          onClick={() => setIsDrawerExpanded(true)}
          className="mb-2 flex items-center justify-between px-3 py-2 rounded-xl border border-dashed cursor-pointer transition-all duration-200 hover:opacity-95"
          style={{
            borderColor: `${accentColor}40`,
            backgroundColor: `${accentColor}0a`,
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" style={{ color: accentColor }} />
            <p className="text-xs font-medium text-foreground dark:text-[#E8EDF0] truncate">
              Uploading {inProgressUploads.length} {inProgressUploads.length === 1 ? "note" : "notes"} in background...
            </p>
          </div>
          <span
            className="text-[11px] font-medium shrink-0 ml-2 hover:underline"
            style={{ color: accentColor }}
          >
            View queue
          </span>
        </div>
      )}

      {/* ── PDF List ── */}
      {pdfs.length === 0 && !isAnyUploading ? (
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
                ? 'Click "Add Note" to attach lecture PDFs'
                : "Lecture notes will appear here when added"}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
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
                  animationDelay: `${idx * 40}ms`,
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
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:text-[#9AA7AE] dark:hover:text-white dark:hover:bg-[#1F2C34] transition-colors cursor-pointer"
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

      {/* ── Modern Add PDF Modal (Clean, No Redundancies) ── */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overscroll-contain"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAndResetModal();
          }}
          onWheel={(e) => {
            if (e.target === e.currentTarget) e.preventDefault();
          }}
        >
          <div className="relative w-full max-w-[440px] rounded-2xl border border-border/50 bg-card shadow-2xl dark:border-[#1F2C34] dark:bg-[#0D1318] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 dark:border-[#1F2C34]">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex items-center justify-center w-7 h-7 rounded-lg"
                  style={{ backgroundColor: `${accentColor}18` }}
                >
                  <UploadCloud className="h-4 w-4" style={{ color: accentColor }} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground dark:text-[#E8EDF0]">
                    Add Lecture PDF
                  </h3>
                  <p className="text-[11px] text-muted-foreground dark:text-[#788896]">
                    Direct upload or attach cloud link
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeAndResetModal}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:text-[#9AA7AE] dark:hover:text-white dark:hover:bg-[#1F2C34] transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5">
              {/* Modern Segmented Control */}
              <div className="grid grid-cols-3 p-1 mb-4 rounded-xl bg-muted/40 dark:bg-[#111820] border border-border/40 dark:border-[#1F2C34]">
                <button
                  type="button"
                  onClick={() => setUploadMode("drive")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer",
                    uploadMode === "drive"
                      ? "bg-card dark:bg-[#1A2530] text-foreground dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                      : "text-muted-foreground hover:text-foreground dark:text-[#9AA7AE] dark:hover:text-white"
                  )}
                >
                  <UploadCloud className="h-3.5 w-3.5 text-emerald-500" />
                  Drive
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode("supabase")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer",
                    uploadMode === "supabase"
                      ? "bg-card dark:bg-[#1A2530] text-foreground dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                      : "text-muted-foreground hover:text-foreground dark:text-[#9AA7AE] dark:hover:text-white"
                  )}
                >
                  <HardDrive className="h-3.5 w-3.5 text-blue-500" />
                  Supabase
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode("link")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer",
                    uploadMode === "link"
                      ? "bg-card dark:bg-[#1A2530] text-foreground dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                      : "text-muted-foreground hover:text-foreground dark:text-[#9AA7AE] dark:hover:text-white"
                  )}
                >
                  <Link2 className="h-3.5 w-3.5 text-amber-500" />
                  Link
                </button>
              </div>

              {/* Upload File Mode (Drive or Supabase) */}
              {uploadMode !== "link" ? (
                <form onSubmit={handleFileUpload} className="space-y-4">
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
                  {selectedFiles.length === 0 ? (
                    <div
                      className={cn(
                        "relative flex flex-col items-center justify-center gap-2.5 p-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200",
                        isDragOver
                          ? "border-emerald-500 bg-emerald-500/10 scale-[1.01]"
                          : "border-border/60 hover:border-border hover:bg-muted/20 dark:border-[#22313F] dark:hover:border-[#2F4457] dark:bg-[#10171F]/50"
                      )}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-muted/40 dark:bg-[#141E28] transition-transform duration-200 group-hover:scale-110">
                        <UploadCloud className="h-6 w-6 text-muted-foreground dark:text-[#788896]" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-semibold text-foreground dark:text-[#E8EDF0]">
                          Choose PDF files or drop them here
                        </p>
                        <p className="text-[11px] text-muted-foreground dark:text-[#788896] mt-0.5">
                          {uploadMode === "drive"
                            ? "Direct to Google Drive (no file size limits)"
                            : "Direct to Supabase Storage (up to 50 MB)"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Selected Files View */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground dark:text-[#E8EDF0]">
                          {selectedFiles.length} {selectedFiles.length === 1 ? "file" : "files"} selected
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-muted-foreground bg-muted/50 dark:bg-[#1A2530] px-2 py-0.5 rounded-full">
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

                      {/* File Chips / Scroll List */}
                      <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                        {selectedFiles.map((file, idx) => (
                          <div
                            key={`${file.name}-${idx}`}
                            className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-border/50 dark:border-[#1F2C34] bg-muted/20 dark:bg-[#111820]"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="h-4 w-4 text-emerald-500 shrink-0" />
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
                              onClick={() => removeSelectedFile(idx)}
                              className="p-1 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                              title="Remove file"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Add more button */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground dark:text-[#9AA7AE] dark:hover:text-white border border-dashed border-border/50 dark:border-[#1F2C34] rounded-lg transition-colors cursor-pointer text-center"
                      >
                        + Add more PDFs
                      </button>

                      {/* Title Input (only if exactly 1 file is selected) */}
                      {selectedFiles.length === 1 && (
                        <div className="space-y-1 pt-1">
                          <label
                            htmlFor="upload-title"
                            className="text-[11px] font-semibold text-muted-foreground dark:text-[#9AA7AE]"
                          >
                            Title (Optional)
                          </label>
                          <Input
                            id="upload-title"
                            placeholder="e.g. Lecture 01 — Problem Solving"
                            value={uploadTitle}
                            onChange={(e) => setUploadTitle(e.target.value)}
                            className="h-9 text-xs rounded-xl border-border/40 dark:border-[#1F2C34] dark:bg-[#111820]"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-2 border-t border-border/30 dark:border-[#1F2C34]/60">
                    <button
                      type="button"
                      onClick={closeAndResetModal}
                      className="h-9 rounded-xl text-xs px-4 border border-border/60 bg-card text-muted-foreground hover:text-foreground hover:bg-muted/80 dark:border-[#1F2C34] dark:bg-[#141E28] dark:text-[#9AA7AE] dark:hover:bg-[#1F2C34] dark:hover:text-white font-medium transition-all active:scale-[0.98] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={selectedFiles.length === 0}
                      className={cn(
                        "inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl text-xs font-semibold transition-all duration-200",
                        "disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer",
                        "active:scale-[0.97]",
                        buttonAccent
                      )}
                    >
                      <UploadCloud className="h-3.5 w-3.5" />
                      {selectedFiles.length > 1
                        ? `Upload ${selectedFiles.length} PDFs`
                        : "Upload PDF"}
                    </button>
                  </div>
                </form>
              ) : (
                /* Paste Google Drive Link Mode */
                <form onSubmit={handleDriveAttach} className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="drive-title"
                      className="text-[11px] font-semibold text-muted-foreground dark:text-[#9AA7AE]"
                    >
                      Note Title
                    </label>
                    <Input
                      id="drive-title"
                      placeholder="e.g. Class 01 Lecture Notes"
                      value={driveTitle}
                      onChange={(e) => setDriveTitle(e.target.value)}
                      disabled={isAttachingDrive}
                      className="h-9 text-xs rounded-xl border-border/40 dark:border-[#1F2C34] dark:bg-[#111820]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="drive-url"
                      className="text-[11px] font-semibold text-muted-foreground dark:text-[#9AA7AE]"
                    >
                      Google Drive Share Link
                    </label>
                    <Input
                      id="drive-url"
                      placeholder="https://drive.google.com/file/d/.../view"
                      value={driveUrl}
                      onChange={(e) => setDriveUrl(e.target.value)}
                      disabled={isAttachingDrive}
                      className="h-9 text-xs rounded-xl font-mono border-border/40 dark:border-[#1F2C34] dark:bg-[#111820]"
                    />
                    {driveUrl && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {detectedDriveId ? (
                          <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="h-3 w-3" />
                            Valid Google Drive link
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                            <AlertCircle className="h-3 w-3" />
                            Please enter a valid shareable Drive link
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-2 border-t border-border/30 dark:border-[#1F2C34]/60">
                    <button
                      type="button"
                      onClick={closeAndResetModal}
                      disabled={isAttachingDrive}
                      className="h-9 rounded-xl text-xs px-4 border border-border/60 bg-card text-muted-foreground hover:text-foreground hover:bg-muted/80 dark:border-[#1F2C34] dark:bg-[#141E28] dark:text-[#9AA7AE] dark:hover:bg-[#1F2C34] dark:hover:text-white font-medium transition-all active:scale-[0.98] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!driveTitle.trim() || !driveUrl.trim() || isAttachingDrive}
                      className={cn(
                        "inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer",
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
                          Attach Link
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

      {/* ── YouTube-Style Floating Upload Manager (Sleek, Persistent, Auto-Retry) ── */}
      {hasActiveUploads && (() => {
        const total = activeUploads.length;
        const completedCount = activeUploads.filter((t) => t.status === "completed").length;
        const errorCount = activeUploads.filter((t) => t.status === "error").length;
        const allCompleted = completedCount === total && total > 0;
        const hasErrors = errorCount > 0;
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
              "fixed bottom-5 right-5 z-50 rounded-2xl border shadow-2xl transition-all duration-300 overflow-hidden",
              "bg-background/95 dark:bg-[#0D1318]/95 backdrop-blur-xl border-border/80 dark:border-[#222F3D]",
              isDrawerExpanded ? "w-[350px] sm:w-[390px]" : "w-auto max-w-[340px]",
              allCompleted
                ? "border-emerald-500/40 ring-1 ring-emerald-500/20"
                : hasErrors
                ? "border-amber-500/40 ring-1 ring-amber-500/20"
                : "ring-1 ring-black/5 dark:ring-white/5"
            )}
          >
            {/* Header summary bar */}
            <div
              onClick={() => setIsDrawerExpanded((prev) => !prev)}
              className="flex items-center justify-between gap-3 px-3.5 py-2.5 cursor-pointer hover:bg-muted/30 dark:hover:bg-[#141D26] transition-colors select-none"
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
                <div className="min-w-0 pr-1">
                  <p className="text-xs font-semibold text-foreground dark:text-[#E8EDF0] truncate">
                    {allCompleted
                      ? `${total} ${total === 1 ? "PDF" : "PDFs"} uploaded`
                      : hasErrors && !isAnyUploading
                      ? `${errorCount} upload failed`
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
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronUp className="h-3.5 w-3.5" />
                  )}
                </button>
                {(allCompleted || !isAnyUploading) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveUploads([]);
                      setIsDrawerExpanded(false);
                    }}
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                    title="Dismiss"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Overall Progress Line */}
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
                      <div className="flex items-center gap-1.5 shrink-0">
                        {task.status === "completed" ? (
                          <span className="text-emerald-500 font-semibold text-[10px] flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 inline" /> Done
                          </span>
                        ) : task.status === "error" ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-rose-500 font-medium text-[10px] flex items-center gap-0.5">
                              <AlertCircle className="h-3 w-3 inline" /> Failed
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRetryTask(task.id)}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 transition-colors cursor-pointer"
                              title="Retry upload"
                            >
                              <RotateCw className="h-2.5 w-2.5" />
                              Retry
                            </button>
                          </div>
                        ) : task.status === "uploading" ? (
                          <span style={{ color: accentColor }} className="font-semibold text-[10px] font-mono">
                            {task.progress}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">Queued</span>
                        )}
                      </div>
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
                      <span className="truncate pr-2">{task.statusText}</span>
                      <span className="shrink-0 font-mono">{formatFileSize(task.fileSize)}</span>
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
