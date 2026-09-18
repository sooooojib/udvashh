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

  // File Upload State
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);
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
      : "#25A8A2";

  const buttonAccent =
    moduleType === "intensive"
      ? "bg-amber-500 hover:bg-amber-600 text-white"
      : moduleType === "subject-hacks"
      ? "bg-blue-600 hover:bg-blue-700 text-white"
      : "bg-[#25A8A2] hover:bg-[#20928D] text-white";

  const iconAccent =
    moduleType === "intensive"
      ? "text-amber-500"
      : moduleType === "subject-hacks"
      ? "text-blue-500"
      : "text-[#25A8A2]";

  // Handle file selection
  const handleFileChange = (file: File | null) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      toast.error("Only PDF files (.pdf) are allowed.");
      return;
    }
    setSelectedFile(file);
    if (!uploadTitle.trim()) {
      const cleanName = file.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ");
      setUploadTitle(cleanName);
    }
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
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileChange(droppedFile);
  };

  // Handle direct file upload (to Google Drive or Supabase)
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Please choose a PDF file.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("videoId", videoId);
    formData.append("file", selectedFile);
    formData.append("title", uploadTitle.trim() || selectedFile.name);
    formData.append("destination", uploadMode === "supabase" ? "supabase" : "drive");

    try {
      const response = await fetch("/api/upload/pdf", {
        method: "POST",
        body: formData,
      });

      const res = await response.json();

      if (res.success && res.pdf) {
        toast.success(
          uploadMode === "supabase"
            ? "PDF uploaded to Supabase!"
            : "PDF uploaded to Google Drive!"
        );
        setPdfs((prev) => [...prev, res.pdf]);
        closeAndResetModal();
      } else {
        toast.error(res.message || "Upload failed.");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Upload failed. Please try again.";
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
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
    setSelectedFile(null);
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
      {pdfs.length === 0 ? (
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
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:text-[#9AA7AE] dark:hover:text-white dark:hover:bg-[#1F2C34] transition-all duration-150"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>

                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={!isDrive}
                    title="Download"
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:text-[#9AA7AE] dark:hover:text-white dark:hover:bg-[#1F2C34] transition-all duration-150"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDeletePdf(pdf.id)}
                      disabled={deletingId === pdf.id}
                      title="Delete"
                      className="p-2 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 dark:text-[#9AA7AE] dark:hover:text-rose-400 transition-all duration-150 disabled:opacity-40"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewPdf(null);
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAndResetModal();
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
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                  />

                  {/* Drag & Drop Zone */}
                  <div
                    className={cn(
                      "relative flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200",
                      isDragOver
                        ? "border-current bg-current/5 scale-[1.01]"
                        : selectedFile
                        ? "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-500/8"
                        : "border-border/50 bg-muted/10 hover:border-border/80 hover:bg-muted/20 dark:border-[#1F2C34] dark:bg-[#111820]/50 dark:hover:border-[#253342]"
                    )}
                    style={isDragOver ? { color: accentColor } : undefined}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {selectedFile ? (
                      <>
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-medium text-foreground dark:text-[#E8EDF0] truncate max-w-[280px]">
                            {selectedFile.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground dark:text-[#5C6A72] font-mono mt-0.5">
                            {formatFileSize(selectedFile.size)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                            setUploadTitle("");
                          }}
                          className="text-[11px] text-muted-foreground hover:text-rose-500 transition-colors mt-1"
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-muted/30 dark:bg-[#141E28]">
                          <UploadCloud className="h-5 w-5 text-muted-foreground/60 dark:text-[#5C6A72]" />
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-medium text-muted-foreground dark:text-[#9AA7AE]">
                            Drop PDF here or{" "}
                            <span style={{ color: accentColor }} className="font-semibold">
                              browse
                            </span>
                          </p>
                          <p className="text-[10px] text-muted-foreground/50 dark:text-[#5C6A72] mt-0.5">
                            PDF files only
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Title Input */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="upload-title"
                      className="text-[11px] font-semibold text-muted-foreground dark:text-[#9AA7AE] uppercase tracking-wider"
                    >
                      Title
                    </label>
                    <Input
                      id="upload-title"
                      placeholder="e.g. Lecture 01 — Problem Solving"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      disabled={isUploading}
                      className="h-9 text-xs rounded-xl border-border/40 dark:border-[#1F2C34] dark:bg-[#111820] focus-visible:ring-1"
                      style={
                        {
                          "--tw-ring-color": `${accentColor}50`,
                        } as React.CSSProperties
                      }
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={closeAndResetModal}
                      disabled={isUploading}
                      className="h-9 rounded-xl text-xs px-4"
                    >
                      Cancel
                    </Button>
                    <button
                      type="submit"
                      disabled={!selectedFile || isUploading}
                      className={cn(
                        "inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl text-xs font-semibold transition-all duration-200",
                        "disabled:opacity-40 disabled:cursor-not-allowed",
                        "active:scale-[0.97]",
                        buttonAccent
                      )}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Uploading…
                        </>
                      ) : (
                        <>
                          {uploadMode === "supabase" ? (
                            <HardDrive className="h-3.5 w-3.5" />
                          ) : (
                            <UploadCloud className="h-3.5 w-3.5" />
                          )}
                          {uploadMode === "supabase" ? "Upload to Supabase" : "Upload to Drive"}
                        </>
                      )}
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={closeAndResetModal}
                      disabled={isAttachingDrive}
                      className="h-9 rounded-xl text-xs px-4"
                    >
                      Cancel
                    </Button>
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
    </section>
  );
}
