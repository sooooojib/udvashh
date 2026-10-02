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
  Zap,
  Code2,
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
import { PdfViewerModal } from "./pdf-viewer-modal";

interface ActiveUploadTask {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  progress: number;
  statusText: string;
  mode: "drive" | "supabase";
  driveMethod?: "direct" | "script";
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

  // 3 Upload Modes: "drive" (Google Drive direct), "supabase" (Supabase Storage), "link" (Google Drive URL)
  const [uploadMode, setUploadMode] = React.useState<"drive" | "supabase" | "link">("drive");
  // Drive Sub-Method: "direct" (Resumable Chunked API) vs "script" (Apps Script Bridge)
  const [driveMethod, setDriveMethod] = React.useState<"direct" | "script">("direct");

  // Multi-File Upload State
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [fileTitles, setFileTitles] = React.useState<Record<string, string>>({});
  const [activeUploads, setActiveUploads] = React.useState<ActiveUploadTask[]>([]);
  const [isWidgetExpanded, setIsWidgetExpanded] = React.useState(false);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // File cache for one-click re-try
  const fileMapRef = React.useRef<Map<string, File>>(new Map());

  // Link Form State
  const [linkTitle, setLinkTitle] = React.useState("");
  const [linkUrl, setLinkUrl] = React.useState("");
  const [isAttachingLink, setIsAttachingLink] = React.useState(false);

  // Deletion state
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setPdfs(initialPdfs);
  }, [initialPdfs]);

  // Lock background scroll when Add Modal is open (PdfViewerModal handles its own scroll lock)
  React.useEffect(() => {
    if (isAddModalOpen) {
      document.body.dataset.modalOpen = "true";
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";

      return () => {
        delete document.body.dataset.modalOpen;
        const otherModals = document.querySelectorAll(
          '[data-modal-open="true"], [role="dialog"]'
        );
        if (otherModals.length === 0) {
          document.documentElement.style.overflow = "";
          document.body.style.overflow = "";
        }
      };
    }
  }, [isAddModalOpen]);

  // Handle ESC key for Add Modal
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isAddModalOpen) {
        closeAndResetModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAddModalOpen]);

  const accentColor =
    moduleType === "intensive"
      ? "#F59E0B"
      : moduleType === "subject-hacks"
      ? "#3B82F6"
      : "#10B981";

  const buttonAccent =
    moduleType === "intensive"
      ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20"
      : moduleType === "subject-hacks"
      ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
      : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20";

  // Task updater
  const updateTask = (taskId: string, partial: Partial<ActiveUploadTask>) => {
    setActiveUploads((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...partial } : t))
    );
  };

  // Handle file selection
  const handleFilesChange = (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    const valid: File[] = [];

    Array.from(files).forEach((f) => {
      if (f.name.toLowerCase().endsWith(".pdf") || f.type === "application/pdf") {
        valid.push(f);
      }
    });

    if (valid.length === 0) {
      toast.error("Please select PDF files (.pdf only).");
      return;
    }

    setSelectedFiles((prev) => {
      const combined = [...prev];
      valid.forEach((newF) => {
        if (!combined.some((ex) => ex.name === newF.name && ex.size === newF.size)) {
          combined.push(newF);
        }
      });
      return combined;
    });
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Drag & drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      handleFilesChange(e.dataTransfer.files);
    }
  };

  /**
   * Executes a single upload with total correctness for both Supabase & Drive
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
          : "Connecting to Drive bridge...",
    });

    try {
      if (task.mode === "supabase") {
        // --- 1. Supabase Storage Upload ---
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

        updateTask(task.id, { progress: 45, statusText: "Uploading to Supabase..." });

        // PUT directly to Supabase storage with retry
        let uploadOk = false;
        let lastError: Error | null = null;
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            if (attempt > 1) {
              updateTask(task.id, {
                statusText: `Retrying Supabase upload (${attempt}/2)...`,
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
              throw new Error(`Supabase returned status ${uploadRes.status}`);
            }
          } catch (err: unknown) {
            lastError = err instanceof Error ? err : new Error(String(err));
          }
        }

        if (!uploadOk) {
          throw lastError || new Error("Failed to upload to Supabase Storage.");
        }

        updateTask(task.id, { progress: 85, statusText: "Saving to database..." });

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
          throw new Error(completeData.message || "Failed to finalize Supabase record.");
        }

        setPdfs((prev) => [...prev, completeData.pdf]);
        updateTask(task.id, {
          status: "completed",
          progress: 100,
          statusText: "Uploaded to Supabase",
        });
        toast.success(`Uploaded: ${task.title}`);
        return { success: true };
      } else {
        // --- 2. Google Drive Upload ---
        const isScriptSelected = task.driveMethod === "script";

        if (isScriptSelected) {
          // --- User selected Apps Script Bridge ---
          if (file.size > 36 * 1024 * 1024) {
            throw new Error(
              `File (${formatFileSize(file.size)}) exceeds Google Apps Script 50MB payload limit (after Base64). Please toggle to "Direct" mode or use the Link tab.`
            );
          }

          if (!resolvedScriptUrl) {
            const configRes = await fetch("/api/upload/drive/config");
            if (!configRes.ok) {
              const errData = await configRes.json().catch(() => ({}));
              throw new Error(errData.message || "Failed to connect to Google Drive bridge.");
            }
            const cfg = await configRes.json();
            resolvedScriptUrl = cfg.scriptUrl;
          }

          updateTask(task.id, { progress: 30, statusText: "Processing file data..." });

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

          updateTask(task.id, { progress: 60, statusText: "Uploading via Apps Script..." });

          let scriptData: { fileId?: string; webViewLink?: string } | null = null;
          const maxAttempts = 2;

          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
              if (attempt > 1) {
                updateTask(task.id, {
                  statusText: `Retrying Script upload (${attempt}/${maxAttempts})...`,
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
                throw new Error(`Apps Script bridge returned status ${scriptRes.status}`);
              }

              const data = await scriptRes.json();
              if (!data.success || !data.fileId) {
                throw new Error(data.error || "Upload was not completed by Apps Script.");
              }

              scriptData = data;
              break;
            } catch (err: unknown) {
              if (attempt >= maxAttempts) throw err;
              console.warn(`Drive script attempt ${attempt} failed, retrying...`, err);
            }
          }

          if (!scriptData || !scriptData.fileId) {
            throw new Error("Could not retrieve Drive file ID from Apps Script.");
          }

          updateTask(task.id, { progress: 90, statusText: "Saving to database..." });

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
            statusText: "Uploaded via Apps Script",
          });
          toast.success(`Uploaded: ${task.title}`);
          return { success: true, scriptUrl: resolvedScriptUrl };
        }

        // --- User selected Direct Resumable Chunked Upload (handles ANY size: 50MB, 200MB, 1GB+) ---
        let useResumableChunked = false;
        let resumableSessionUrl = "";
        let initErrorMessage = "";

        updateTask(task.id, {
          status: "uploading",
          progress: 5,
          statusText: "Connecting to Google Drive...",
        });

        try {
          const startRes = await fetch("/api/upload/drive/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: file.name,
              fileSize: file.size,
            }),
          });

          const startData = await startRes.json().catch(() => ({}));
          if (startRes.ok && startData.success && startData.sessionUrl) {
            resumableSessionUrl = startData.sessionUrl;
            useResumableChunked = true;
          } else {
            initErrorMessage = startData.message || "Failed to start Drive session.";
            console.warn("Drive resumable session init notice:", initErrorMessage);
          }
        } catch (initErr) {
          initErrorMessage = initErr instanceof Error ? initErr.message : "Connection failed";
          console.warn("Drive resumable init error:", initErr);
        }

        if (useResumableChunked && resumableSessionUrl) {
          // --- Official Google Drive Resumable Chunk Upload (2MB chunks) ---
          const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunk (safe for Vercel, optimal for Drive)
          const totalSize = file.size;
          let start = 0;
          let chunkIndex = 1;
          const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
          let createdPdf: VideoPdfItem | null = null;

          while (start < totalSize) {
            const end = Math.min(start + CHUNK_SIZE, totalSize) - 1;
            const chunkBlob = file.slice(start, end + 1);
            const currentPercent = Math.max(5, Math.min(95, Math.round((start / totalSize) * 100)));

            updateTask(task.id, {
              progress: currentPercent,
              statusText: `Uploading (${chunkIndex}/${totalChunks}) • ${currentPercent}%`,
            });

            let chunkOk = false;
            let lastChunkErr: unknown = null;

            // Retry up to 3 times per chunk
            for (let chunkAttempt = 1; chunkAttempt <= 3; chunkAttempt++) {
              try {
                if (chunkAttempt > 1) {
                  updateTask(task.id, {
                    statusText: `Retrying chunk ${chunkIndex}/${totalChunks} (${chunkAttempt}/3)...`,
                  });
                  await new Promise((r) => setTimeout(r, 2000));
                }

                const chunkRes = await fetch(
                  `/api/upload/drive/chunk?rangeStart=${start}&rangeEnd=${end}&totalSize=${totalSize}&videoId=${encodeURIComponent(videoId)}&title=${encodeURIComponent(task.title)}`,
                  {
                    method: "POST",
                    headers: {
                      "x-session-url": resumableSessionUrl,
                      "Content-Type": "application/octet-stream",
                    },
                    body: chunkBlob,
                  }
                );

                if (!chunkRes.ok) {
                  const errJson = await chunkRes.json().catch(() => ({}));
                  throw new Error(errJson.message || `Chunk ${chunkIndex} upload failed.`);
                }

                const chunkData = await chunkRes.json();
                if (chunkData.done && chunkData.pdf) {
                  createdPdf = chunkData.pdf;
                }

                chunkOk = true;
                break;
              } catch (err) {
                lastChunkErr = err;
                console.warn(`Chunk ${chunkIndex} attempt ${chunkAttempt} failed:`, err);
              }
            }

            if (!chunkOk) {
              throw lastChunkErr || new Error(`Failed to upload chunk ${chunkIndex}.`);
            }

            start = end + 1;
            chunkIndex++;
          }

          if (createdPdf) {
            setPdfs((prev) => [...prev, createdPdf!]);
            updateTask(task.id, {
              status: "completed",
              progress: 100,
              statusText: "Uploaded to Drive",
            });
            toast.success(`Uploaded: ${task.title}`);
            return { success: true };
          } else {
            throw new Error("Drive upload finished but could not confirm database record.");
          }
        }

        // --- Fallback if Direct API failed: try Apps Script if <= 35 MB ---
        if (file.size > 36 * 1024 * 1024) {
          throw new Error(
            initErrorMessage.includes("reconnect") || initErrorMessage.includes("expired")
              ? initErrorMessage
              : `File (${formatFileSize(file.size)}) requires Google Drive OAuth authorization. Visit /api/oauth/drive to reconnect, or use the Supabase tab.`
          );
        }

        if (!resolvedScriptUrl) {
          const configRes = await fetch("/api/upload/drive/config");
          if (!configRes.ok) {
            const errData = await configRes.json().catch(() => ({}));
            throw new Error(errData.message || "Failed to connect to Google Drive bridge.");
          }
          const cfg = await configRes.json();
          resolvedScriptUrl = cfg.scriptUrl;
        }

        updateTask(task.id, { progress: 30, statusText: "Processing file data..." });

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

        updateTask(task.id, { progress: 60, statusText: "Uploading to Drive bridge..." });

        let scriptData: { fileId?: string; webViewLink?: string } | null = null;
        const maxAttempts = 2;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            if (attempt > 1) {
              updateTask(task.id, {
                statusText: `Retrying Drive upload (${attempt}/${maxAttempts})...`,
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
              throw new Error(`Drive bridge returned status ${scriptRes.status}`);
            }

            const data = await scriptRes.json();
            if (!data.success || !data.fileId) {
              throw new Error(data.error || "Upload was not completed by Drive.");
            }

            scriptData = data;
            break;
          } catch (err: unknown) {
            if (attempt >= maxAttempts) throw err;
            console.warn(`Drive attempt ${attempt} failed, retrying...`, err);
          }
        }

        if (!scriptData || !scriptData.fileId) {
          throw new Error("Could not retrieve Drive file ID.");
        }

        updateTask(task.id, { progress: 90, statusText: "Saving to database..." });

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
          statusText: "Uploaded to Drive",
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
        statusText: msg,
      });
      toast.error(msg);
      return { success: false, scriptUrl: resolvedScriptUrl };
    }
  };

  // Re-try a single failed task
  const handleRetryTask = async (taskId: string) => {
    const task = activeUploads.find((t) => t.id === taskId);
    const file = fileMapRef.current.get(taskId);

    if (!task || !file) {
      toast.error("File cache expired. Please re-select the file.");
      return;
    }

    updateTask(taskId, {
      status: "uploading",
      progress: 10,
      statusText: "Retrying...",
      errorMessage: undefined,
    });

    await executeSingleUpload(task, file);
  };

  // Submit batch upload
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    const filesToUpload = [...selectedFiles];
    const modeToUpload: "drive" | "supabase" =
      uploadMode === "supabase" ? "supabase" : "drive";

    // If user explicitly chose Script mode and a file exceeds Apps Script limit, warn them to switch to Direct
    if (modeToUpload === "drive" && driveMethod === "script") {
      const oversized = filesToUpload.filter((f) => f.size > 36 * 1024 * 1024);
      if (oversized.length > 0) {
        toast.error(
          `"${oversized[0].name}" (${formatFileSize(oversized[0].size)}) exceeds Apps Script's 50MB payload limit. Please toggle to "Direct" mode above.`,
          { duration: 7000 }
        );
        return;
      }
    }

    // Close modal immediately so user continues without waiting
    closeAndResetModal();

    const newTasks: ActiveUploadTask[] = filesToUpload.map((f, idx) => {
      const fileKey = `${f.name}-${f.size}-${idx}`;
      const cleanName = f.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ");
      const userCustom = fileTitles[fileKey]?.trim();
      const title = userCustom || cleanName;
      const taskId = `${Date.now()}-${idx}-${f.name}`;

      fileMapRef.current.set(taskId, f);

      return {
        id: taskId,
        title,
        fileName: f.name,
        fileSize: f.size,
        progress: 0,
        statusText: "Queued",
        mode: modeToUpload,
        driveMethod: modeToUpload === "drive" ? driveMethod : undefined,
        status: "queued" as const,
      };
    });

    setActiveUploads((prev) => [...prev, ...newTasks]);

    // Sequential Queue Runner with 2s cooldown
    (async () => {
      let cachedScriptUrl = "";

      for (let i = 0; i < newTasks.length; i++) {
        const task = newTasks[i];
        const file = filesToUpload[i];

        const res = await executeSingleUpload(task, file, cachedScriptUrl);
        if (res.scriptUrl) {
          cachedScriptUrl = res.scriptUrl;
        }

        // 2000ms cooldown delay between files
        if (i < newTasks.length - 1) {
          updateTask(task.id, { statusText: "Done" });
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    })();
  };

  // Google Drive Link Attachment
  const detectedDriveId = extractGoogleDriveFileId(linkUrl);

  const handleDriveAttach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkTitle.trim() || !linkUrl.trim()) {
      toast.error("Please enter a title and Google Drive link.");
      return;
    }

    if (!detectedDriveId) {
      toast.error("Invalid Google Drive URL. Please paste a valid shareable link.");
      return;
    }

    setIsAttachingLink(true);
    try {
      const res = await addDrivePdf({
        videoId,
        title: linkTitle.trim(),
        driveUrl: linkUrl.trim(),
      });

      if (res.success && res.pdf) {
        toast.success("Note attached!");
        setPdfs((prev) => [...prev, res.pdf!]);
        closeAndResetModal();
      } else {
        toast.error(res.message || "Failed to attach link.");
      }
    } catch {
      toast.error("Failed to attach link.");
    } finally {
      setIsAttachingLink(false);
    }
  };

  // PDF deletion
  const handleDeletePdf = async (pdfId: string) => {
    if (!confirm("Remove this lecture note?")) return;
    setDeletingId(pdfId);

    try {
      const res = await deleteVideoPdf({ pdfId, videoId });
      if (res.success) {
        toast.success("Note removed.");
        setPdfs((prev) => prev.filter((p) => p.id !== pdfId));
        if (previewPdf?.id === pdfId) setPreviewPdf(null);
      } else {
        toast.error(res.message || "Failed to remove note.");
      }
    } catch {
      toast.error("Error removing note.");
    } finally {
      setDeletingId(null);
    }
  };

  const closeAndResetModal = () => {
    setIsAddModalOpen(false);
    setSelectedFiles([]);
    setFileTitles({});
    setLinkTitle("");
    setLinkUrl("");
    setUploadMode("drive");
    setDriveMethod("direct");
  };

  // Queue state summaries
  const hasActiveUploads = activeUploads.length > 0;
  const inProgressUploads = activeUploads.filter(
    (t) => t.status === "uploading" || t.status === "queued"
  );
  const isAnyUploading = inProgressUploads.length > 0;
  const totalTasks = activeUploads.length;
  const completedTasks = activeUploads.filter((t) => t.status === "completed").length;
  const errorTasks = activeUploads.filter((t) => t.status === "error").length;
  const allCompleted = completedTasks === totalTasks && totalTasks > 0;
  const hasErrors = errorTasks > 0;
  const overallProgress = Math.round(
    activeUploads.reduce(
      (acc, t) => acc + (t.status === "completed" ? 100 : t.progress),
      0
    ) / (totalTasks || 1)
  );

  return (
    <section className="mt-6">
      {/* ── Section Header ── */}
      <div className="flex items-center justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm tracking-tight text-foreground dark:text-[#E8EDF0]">
            Lecture Notes
          </h3>
          {pdfs.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold bg-muted dark:bg-[#1A2530] text-muted-foreground dark:text-[#9AA7AE] tabular-nums">
              {pdfs.length}
            </span>
          )}
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className={cn(
              "inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer shadow-sm active:scale-[0.98]",
              buttonAccent
            )}
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            Add Note
          </button>
        )}
      </div>

      {/* ── Notes List ── */}
      {pdfs.length === 0 && !isAnyUploading ? (
        <div className="flex items-center gap-3.5 py-4 px-4 rounded-2xl border border-dashed border-border/50 dark:border-white/5 bg-muted/10 dark:bg-[#10171F]/40">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-muted/40 dark:bg-white/5 text-muted-foreground">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground dark:text-[#9AA7AE]">
              No lecture notes attached
            </p>
            <p className="text-[11px] text-muted-foreground/60 dark:text-[#657682] mt-0.5">
              {isAdmin
                ? 'Click "Add Note" to upload or attach PDFs'
                : "Lecture notes will appear here"}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {/* Active upload skeleton / indicator in list */}
          {isAnyUploading && (
            <div
              onClick={() => setIsWidgetExpanded(true)}
              className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-dashed border-emerald-500/30 bg-emerald-500/[0.04] cursor-pointer transition-all hover:bg-emerald-500/[0.07]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-500 shrink-0" />
                <p className="text-xs font-medium text-foreground dark:text-[#E8EDF0] truncate">
                  Uploading {inProgressUploads[0]?.title || "note"} ({inProgressUploads[0]?.mode === "supabase" ? "Supabase" : "Drive"})...
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-[11px] font-semibold text-emerald-500">
                  {overallProgress}%
                </span>
                <span className="text-[11px] text-muted-foreground underline decoration-muted-foreground/40">
                  Queue
                </span>
              </div>
            </div>
          )}

          {pdfs.map((pdf) => {
            const isDrive = pdf.source_type === "drive";
            const downloadUrl =
              isDrive && pdf.file_id
                ? getDriveDownloadUrl(pdf.file_id)
                : pdf.file_url;

            return (
              <div
                key={pdf.id}
                onClick={() => setPreviewPdf(pdf)}
                className={cn(
                  "group flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border cursor-pointer transition-all duration-150",
                  "border-border/40 bg-card/60 hover:bg-card dark:border-white/5 dark:bg-[#10171F]/50 dark:hover:bg-[#141E28]",
                  "hover:border-border/70 dark:hover:border-white/10 hover:shadow-sm"
                )}
              >
                {/* Left: Icon + Title + Meta */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-lg shrink-0",
                      isDrive
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-blue-500/10 text-blue-500"
                    )}
                  >
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p
                      title={pdf.title}
                      className="font-medium text-xs text-foreground dark:text-[#E8EDF0] truncate leading-tight group-hover:text-primary transition-colors"
                    >
                      {pdf.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={cn(
                          "text-[9px] font-semibold px-1.5 py-0.2 rounded font-mono uppercase",
                          isDrive
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        )}
                      >
                        {isDrive ? "Drive" : "Supabase"}
                      </span>
                      {pdf.file_size && (
                        <span className="text-[10px] text-muted-foreground/70 dark:text-[#657682] font-mono">
                          {formatFileSize(pdf.file_size)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div
                  className="flex items-center gap-1 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setPreviewPdf(pdf)}
                    title="Preview"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>

                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={!isDrive}
                    title="Download"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDeletePdf(pdf.id)}
                      disabled={deletingId === pdf.id}
                      title="Remove note"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-40"
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

      {/* ── Document Preview Modal with Pinch & Pan Zoom ── */}
      {previewPdf && (
        <PdfViewerModal
          pdf={previewPdf}
          onClose={() => setPreviewPdf(null)}
        />
      )}

      {/* ── Modern, Clean "Add Note" Modal (Drive / Supabase / Link) ── */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAndResetModal();
          }}
        >
          <div className="relative w-full max-w-[420px] rounded-2xl border border-border/50 bg-card shadow-2xl dark:border-white/10 dark:bg-[#0E151D] animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40 dark:border-white/5">
              <h3 className="font-semibold text-sm text-foreground dark:text-[#E8EDF0]">
                Add Lecture Note
              </h3>
              <button
                type="button"
                onClick={closeAndResetModal}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5">
              {/* Sleek 3-Pill Switcher */}
              <div className="grid grid-cols-3 p-1 mb-4 rounded-xl bg-muted/40 dark:bg-[#121921] border border-border/30 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setUploadMode("drive")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer",
                    uploadMode === "drive"
                      ? "bg-card dark:bg-[#1A2530] text-foreground dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                      : "text-muted-foreground hover:text-foreground dark:text-[#8A9BA8] dark:hover:text-white"
                  )}
                >
                  <UploadCloud className="h-3.5 w-3.5 text-emerald-500" />
                  Drive
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode("supabase")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer",
                    uploadMode === "supabase"
                      ? "bg-card dark:bg-[#1A2530] text-foreground dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                      : "text-muted-foreground hover:text-foreground dark:text-[#8A9BA8] dark:hover:text-white"
                  )}
                >
                  <HardDrive className="h-3.5 w-3.5 text-blue-500" />
                  Supabase
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode("link")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer",
                    uploadMode === "link"
                      ? "bg-card dark:bg-[#1A2530] text-foreground dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                      : "text-muted-foreground hover:text-foreground dark:text-[#8A9BA8] dark:hover:text-white"
                  )}
                >
                  <Link2 className="h-3.5 w-3.5 text-amber-500" />
                  Link
                </button>
              </div>

              {/* Drive Method Toggle (Direct Resumable API vs Apps Script Bridge) */}
              {uploadMode === "drive" && (
                <div className="flex items-center justify-between px-3 py-2 mb-3.5 rounded-xl bg-muted/30 dark:bg-[#121921] border border-border/40 dark:border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold text-foreground dark:text-[#E8EDF0]">
                      Drive Engine
                    </span>
                    <span className="text-[10px] text-muted-foreground dark:text-[#8A9BA8]">
                      {driveMethod === "direct"
                        ? "Chunked API (Unlimited size, handles 50MB+)"
                        : "Apps Script Bridge (Best for files <35 MB)"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-background dark:bg-[#0E151D] border border-border/40 dark:border-white/10 shadow-xs">
                    <button
                      type="button"
                      onClick={() => setDriveMethod("direct")}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer",
                        driveMethod === "direct"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold shadow-xs"
                          : "text-muted-foreground hover:text-foreground dark:text-[#8A9BA8] dark:hover:text-white"
                      )}
                    >
                      <Zap className="h-3 w-3 stroke-[2.2]" />
                      Direct
                    </button>
                    <button
                      type="button"
                      onClick={() => setDriveMethod("script")}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer",
                        driveMethod === "script"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold shadow-xs"
                          : "text-muted-foreground hover:text-foreground dark:text-[#8A9BA8] dark:hover:text-white"
                      )}
                    >
                      <Code2 className="h-3 w-3 stroke-[2.2]" />
                      Script
                    </button>
                  </div>
                </div>
              )}

              {/* Mode 1 & 2: Direct Upload (Drive or Supabase) */}
              {uploadMode !== "link" ? (
                <form onSubmit={handleFileUpload} className="space-y-4">
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

                  {selectedFiles.length === 0 ? (
                    /* Dropzone */
                    <div
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-150",
                        isDragOver
                          ? "border-emerald-500 bg-emerald-500/10 scale-[1.01]"
                          : "border-border/60 hover:border-emerald-500/50 hover:bg-muted/20 dark:border-white/10 dark:hover:border-emerald-500/40 dark:bg-[#121921]/50"
                      )}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <div
                        className={cn(
                          "flex items-center justify-center w-10 h-10 rounded-xl",
                          uploadMode === "drive"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-blue-500/10 text-blue-500"
                        )}
                      >
                        {uploadMode === "drive" ? (
                          <UploadCloud className="h-5 w-5" />
                        ) : (
                          <HardDrive className="h-5 w-5" />
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-medium text-foreground dark:text-[#E8EDF0]">
                          Drop PDF here or <span className="text-emerald-500 underline font-semibold">browse</span>
                        </p>
                        <p className="text-[11px] text-muted-foreground dark:text-[#657682] mt-0.5">
                          {uploadMode === "drive"
                            ? driveMethod === "direct"
                              ? "Direct to Google Drive (unlimited size, chunked upload)"
                              : "Direct to Apps Script bridge (files up to 35 MB)"
                            : "Direct to Supabase Storage (high-speed)"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* File List with Inline Rename for Every File */
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground dark:text-[#E8EDF0]">
                          {selectedFiles.length} {selectedFiles.length === 1 ? "file" : "files"} chosen ({uploadMode === "drive" ? "Drive" : "Supabase"})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFiles([]);
                            setFileTitles({});
                          }}
                          className="text-[11px] text-rose-500 hover:underline cursor-pointer"
                        >
                          Clear all
                        </button>
                      </div>

                      <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                        {selectedFiles.map((f, idx) => {
                          const fileKey = `${f.name}-${f.size}-${idx}`;
                          const cleanDefault = f.name
                            .replace(/\.pdf$/i, "")
                            .replace(/[_-]+/g, " ");
                          const currentTitle =
                            fileTitles[fileKey] !== undefined
                              ? fileTitles[fileKey]
                              : cleanDefault;

                          return (
                            <div
                              key={fileKey}
                              className="p-2.5 rounded-xl bg-muted/30 dark:bg-[#121921] border border-border/40 dark:border-white/5 space-y-1.5 transition-all"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                                  <span
                                    title={f.name}
                                    className="text-[11px] text-muted-foreground font-mono truncate"
                                  >
                                    {f.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[10px] text-muted-foreground/80 font-mono">
                                    {formatFileSize(f.size)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeSelectedFile(idx)}
                                    className="p-1 rounded-md text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer"
                                    title="Remove file"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>

                              {uploadMode === "drive" && driveMethod === "script" && f.size > 36 * 1024 * 1024 && (
                                <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                  <AlertCircle className="h-3 w-3 shrink-0 text-amber-500" />
                                  <span>
                                    Exceeds Apps Script 35 MB limit. Please toggle to{" "}
                                    <button
                                      type="button"
                                      onClick={() => setDriveMethod("direct")}
                                      className="underline font-semibold hover:text-amber-700 dark:hover:text-amber-300 inline-flex items-center gap-0.5"
                                    >
                                      <Zap className="h-2.5 w-2.5 inline" /> Direct
                                    </button>{" "}
                                    above.
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-medium text-muted-foreground dark:text-[#8A9BA8] shrink-0">
                                  Title:
                                </span>
                                <Input
                                  value={currentTitle}
                                  onChange={(e) =>
                                    setFileTitles((prev) => ({
                                      ...prev,
                                      [fileKey]: e.target.value,
                                    }))
                                  }
                                  placeholder="Note title..."
                                  className="h-7 text-xs rounded-lg bg-background/70 dark:bg-[#0E151D] border-border/40 dark:border-white/10 px-2 font-medium"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground dark:text-[#8A9BA8] dark:hover:text-white transition-colors cursor-pointer text-center"
                      >
                        + Choose more files
                      </button>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-2 border-t border-border/30 dark:border-white/5">
                    <button
                      type="button"
                      onClick={closeAndResetModal}
                      className="h-8 rounded-xl text-xs px-3.5 border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:border-white/10 dark:hover:bg-white/5 transition-colors cursor-pointer font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={selectedFiles.length === 0}
                      className={cn(
                        "inline-flex items-center justify-center gap-1.5 h-8 px-4 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer shadow-sm active:scale-[0.98]",
                        "disabled:opacity-40 disabled:cursor-not-allowed",
                        buttonAccent
                      )}
                    >
                      {uploadMode === "drive" ? (
                        <UploadCloud className="h-3.5 w-3.5" />
                      ) : (
                        <HardDrive className="h-3.5 w-3.5" />
                      )}
                      {selectedFiles.length > 1
                        ? `Upload ${selectedFiles.length} to ${uploadMode === "drive" ? "Drive" : "Supabase"}`
                        : `Upload to ${uploadMode === "drive" ? "Drive" : "Supabase"}`}
                    </button>
                  </div>
                </form>
              ) : (
                /* Mode 3: Attach Google Drive Link */
                <form onSubmit={handleDriveAttach} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground dark:text-[#8A9BA8]">
                      Note Title
                    </label>
                    <Input
                      placeholder="e.g. Class 01 Lecture Notes"
                      value={linkTitle}
                      onChange={(e) => setLinkTitle(e.target.value)}
                      disabled={isAttachingLink}
                      className="h-8 text-xs rounded-xl border-border/40 dark:border-white/10 dark:bg-[#121921]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground dark:text-[#8A9BA8]">
                      Google Drive Link
                    </label>
                    <Input
                      placeholder="https://drive.google.com/file/d/.../view"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      disabled={isAttachingLink}
                      className="h-8 text-xs rounded-xl font-mono border-border/40 dark:border-white/10 dark:bg-[#121921]"
                    />
                    {linkUrl && (
                      <p className="text-[10px] mt-1">
                        {detectedDriveId ? (
                          <span className="text-emerald-500 font-medium inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Valid Google Drive link detected
                          </span>
                        ) : (
                          <span className="text-amber-500 inline-flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> Please paste a valid Google Drive share link
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-2 border-t border-border/30 dark:border-white/5">
                    <button
                      type="button"
                      onClick={closeAndResetModal}
                      disabled={isAttachingLink}
                      className="h-8 rounded-xl text-xs px-3.5 border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:border-white/10 dark:hover:bg-white/5 transition-colors cursor-pointer font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!linkTitle.trim() || !linkUrl.trim() || isAttachingLink}
                      className={cn(
                        "inline-flex items-center justify-center gap-1.5 h-8 px-4 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer shadow-sm active:scale-[0.98]",
                        "disabled:opacity-40 disabled:cursor-not-allowed",
                        buttonAccent
                      )}
                    >
                      {isAttachingLink ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Attaching…
                        </>
                      ) : (
                        <>
                          <Link2 className="h-3.5 w-3.5" />
                          Attach Note
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

      {/* ── Ultra-Sleek Floating Upload Pill (Dynamic Island Style) ── */}
      {hasActiveUploads && (
        <aside
          aria-label="Upload progress"
          className={cn(
            "fixed bottom-6 right-6 z-50 transition-all duration-200 select-none",
            isWidgetExpanded ? "w-80 sm:w-96" : "w-auto"
          )}
        >
          {!isWidgetExpanded ? (
            /* Collapsed Pill */
            <div
              onClick={() => setIsWidgetExpanded(true)}
              className={cn(
                "flex items-center gap-2.5 h-10 px-3.5 rounded-full shadow-2xl backdrop-blur-xl border cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]",
                "bg-background/95 dark:bg-[#0E151D]/95 border-border/70 dark:border-white/10",
                allCompleted
                  ? "border-emerald-500/40"
                  : hasErrors
                  ? "border-amber-500/40"
                  : ""
              )}
            >
              {allCompleted ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : hasErrors && !isAnyUploading ? (
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-emerald-500 shrink-0" />
              )}

              <span className="text-xs font-medium text-foreground dark:text-[#E8EDF0]">
                {allCompleted
                  ? `${totalTasks} ${totalTasks === 1 ? "note" : "notes"} uploaded`
                  : hasErrors && !isAnyUploading
                  ? `${errorTasks} upload failed`
                  : `Uploading... ${overallProgress}%`}
              </span>

              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground ml-1" />

              {(allCompleted || !isAnyUploading) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveUploads([]);
                  }}
                  className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ) : (
            /* Expanded Card */
            <div className="rounded-2xl shadow-2xl backdrop-blur-xl border bg-background/95 dark:bg-[#0E151D]/95 border-border/70 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div
                onClick={() => setIsWidgetExpanded(false)}
                className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-muted/30 dark:hover:bg-white/5 transition-colors border-b border-border/40 dark:border-white/5"
              >
                <div className="flex items-center gap-2">
                  {allCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : hasErrors ? (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                  )}
                  <span className="text-xs font-semibold text-foreground dark:text-[#E8EDF0]">
                    {allCompleted
                      ? "All uploads complete"
                      : `Uploading (${completedTasks}/${totalTasks})`}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-mono text-muted-foreground mr-1">
                    {overallProgress}%
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1 bg-muted/40 dark:bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>

              {/* File list */}
              <div className="max-h-56 overflow-y-auto divide-y divide-border/30 dark:divide-white/5 px-3.5 py-1">
                {activeUploads.map((task) => (
                  <div key={task.id} className="py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0 pr-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium text-foreground dark:text-[#E8EDF0] truncate">
                          {task.title}
                        </p>
                        <span
                          className={cn(
                            "text-[8px] font-semibold px-1 py-0.2 rounded font-mono uppercase shrink-0",
                            task.mode === "supabase"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          )}
                        >
                          {task.mode === "supabase"
                            ? "Supabase"
                            : task.driveMethod === "script"
                            ? "Drive • Script"
                            : "Drive • Direct"}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground/80 dark:text-[#657682] mt-0.5">
                        {task.statusText} • {formatFileSize(task.fileSize)}
                      </p>
                    </div>

                    <div className="shrink-0">
                      {task.status === "completed" ? (
                        <span className="text-[10px] font-semibold text-emerald-500 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Done
                        </span>
                      ) : task.status === "error" ? (
                        <button
                          type="button"
                          onClick={() => handleRetryTask(task.id)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors cursor-pointer"
                        >
                          <RotateCw className="h-2.5 w-2.5" />
                          Retry
                        </button>
                      ) : task.status === "uploading" ? (
                        <span className="text-[10px] font-mono text-emerald-500 font-semibold">
                          {task.progress}%
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Queued</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex justify-end px-3.5 py-2 border-t border-border/30 dark:border-white/5 bg-muted/20 dark:bg-black/20">
                <button
                  type="button"
                  onClick={() => {
                    setActiveUploads([]);
                    setIsWidgetExpanded(false);
                  }}
                  className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {allCompleted ? "Dismiss" : "Clear queue"}
                </button>
              </div>
            </div>
          )}
        </aside>
      )}
    </section>
  );
}
