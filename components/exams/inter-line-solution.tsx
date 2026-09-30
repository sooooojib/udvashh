"use client";

import * as React from "react";
import { formatSolution } from "@/lib/format-solution";
import { LatexRenderer } from "./latex-renderer";
import { ResizableExamImage, compressImageToWebP } from "./exam-image-dropzone";
import { parseImageMeta, buildImageUrlWithMeta } from "@/lib/exam-image-meta";
import { X } from "lucide-react";
import { toast } from "sonner";

interface InterLineSolutionProps {
  examId: string;
  questionNumber: number;
  solution?: string | null;
  solutionImages?: string[];
  isAdmin?: boolean;
  onImageAdded: (imageUrl: string) => void;
  onImageDeleted: (imageUrl: string) => void;
  onImageUpdated: (oldUrl: string, newUrl: string) => void;
}

export function InterLineSolution({
  examId,
  questionNumber,
  solution,
  solutionImages = [],
  isAdmin = false,
  onImageAdded,
  onImageDeleted,
  onImageUpdated,
}: InterLineSolutionProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [lightboxSrc, setLightboxSrc] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  const [localSlotMap, setLocalSlotMap] = React.useState<Record<string, number>>({});
  const pendingPatchTimerRef = React.useRef<Record<string, NodeJS.Timeout>>({});

  // Clean up pending timers on unmount
  React.useEffect(() => {
    return () => {
      Object.values(pendingPatchTimerRef.current).forEach(clearTimeout);
    };
  }, []);

  // Split formatted solution text into individual logical lines / mathematical steps without breaking math blocks
  const lines = React.useMemo(() => {
    if (!solution) return [];
    const formatted = formatSolution(solution);
    if (!formatted) return [];

    const mathRegex = /(\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$|\\\([\s\S]*?\\\)|\$(?!\$)[\s\S]*?\$)/g;
    const protectedText = formatted.replace(mathRegex, (m) => m.replace(/\n/g, "__MATH_NL__"));

    return protectedText
      .split(/\n+/)
      .map((l) => l.trim().replace(/__MATH_NL__/g, "\n"))
      .filter(Boolean);
  }, [solution]);

  // Group images by their assigned line slot index
  const imagesBySlot = React.useMemo(() => {
    const map = new Map<number, string[]>();
    if (!solutionImages || solutionImages.length === 0) return map;

    solutionImages.forEach((src) => {
      const cleanUrl = src.split("#")[0];
      const meta = parseImageMeta(src);
      // Prefer local optimistic slot override for instantaneous UI updates
      let slot = localSlotMap[cleanUrl] ?? meta.line;

      // If no explicit #line is set, check if the raw solution had [images] marker
      if (slot === undefined) {
        if (solution?.includes("[images]")) {
          const before = solution.split("[images]")[0];
          const formattedBefore = formatSolution(before);
          const mathRegex = /(\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$|\\\([\s\S]*?\\\)|\$(?!\$)[\s\S]*?\$)/g;
          const protectedBefore = formattedBefore.replace(mathRegex, (m) => m.replace(/\n/g, "__MATH_NL__"));
          const beforeLines = protectedBefore
            .split(/\n+/)
            .map((l) => l.trim())
            .filter(Boolean);
          slot = beforeLines.length;
        } else {
          // Default: at the end of the lines
          slot = lines.length;
        }
      }

      // Clamp slot between 0 and lines.length
      slot = Math.max(0, Math.min(lines.length, slot));
      const list = map.get(slot) || [];
      list.push(src);
      map.set(slot, list);
    });

    return map;
  }, [solutionImages, solution, lines.length, localSlotMap]);

  // Handle uploading another photo
  const handleUpload = async (file: File) => {
    if (!isAdmin || isUploading) return;
    setIsUploading(true);
    const toastId = toast.loading("Compressing and uploading diagram...");

    try {
      const compressedBlob = await compressImageToWebP(file);
      const formData = new FormData();
      const ext = file.name?.split(".").pop() || "webp";
      const fileName = `solution-${Date.now()}.${ext}`;
      formData.append("file", compressedBlob, fileName);
      formData.append("examId", examId);
      formData.append("questionNumber", String(questionNumber));
      formData.append("target", "solution");

      const res = await fetch("/api/exams/upload-image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Upload failed");
      }

      const uploadedUrl = data.publicUrl || data.imageUrl;
      onImageAdded(uploadedUrl);
      toast.success("Solution diagram uploaded successfully!", { id: toastId });
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload diagram", { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  // Instant 0ms optimistic line move + debounced background server sync
  const handleMoveImageToSlot = React.useCallback(
    (src: string, newSlot: number) => {
      const meta = parseImageMeta(src);
      const cleanUrl = src.split("#")[0];
      const newUrl = buildImageUrlWithMeta(src, { width: meta.width, line: newSlot });

      // 1. Instant local UI update (0ms latency, zero lag!)
      setLocalSlotMap((prev) => ({ ...prev, [cleanUrl]: newSlot }));

      // 2. Cache in localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(`exam_img_line_${cleanUrl}`, String(newSlot));
      }

      // 3. Debounce background server sync and parent state update (250ms)
      if (pendingPatchTimerRef.current[cleanUrl]) {
        clearTimeout(pendingPatchTimerRef.current[cleanUrl]);
      }

      pendingPatchTimerRef.current[cleanUrl] = setTimeout(async () => {
        onImageUpdated(src, newUrl);

        if (isAdmin) {
          try {
            const res = await fetch("/api/exams/upload-image", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                examId,
                questionNumber,
                target: "solution",
                oldUrl: src,
                newUrl,
              }),
            });

            if (!res.ok) {
              toast.error("Failed to save diagram position to database");
            }
          } catch (err) {
            console.warn("[Move API] Error:", err);
          }
        }
      }, 250);
    },
    [examId, questionNumber, isAdmin, onImageUpdated]
  );

  const totalSlots = lines.length + 1;

  return (
    <div className="relative">
      {/* ── Inter-Line Flow: Lines of Text Interleaved with Diagrams ── */}
      <div className="space-y-1">
        {Array.from({ length: totalSlots }).map((_, slotIdx) => {
          const hasImagesAtSlot = imagesBySlot.has(slotIdx);
          const isLineBelow = slotIdx < lines.length;

          return (
            <React.Fragment key={`slot-container-${slotIdx}`}>
              {/* ── Images Rendered at this Exact Line Slot ── */}
              {hasImagesAtSlot && (
                <div className="my-2">
                  <div className="flex flex-wrap gap-3 items-center w-fit max-w-full">
                    {imagesBySlot.get(slotIdx)!.map((imgSrc, imgIdx) => (
                      <ResizableExamImage
                        key={`sol-${imgSrc.split("#")[0]}-${imgIdx}`}
                        src={imgSrc}
                        alt={`Solution Diagram ${imgIdx + 1}`}
                        examId={examId}
                        questionNumber={questionNumber}
                        target="solution"
                        isAdmin={isAdmin}
                        isDeleting={false}
                        onExpand={() => setLightboxSrc(imgSrc)}
                        onDelete={() => onImageDeleted(imgSrc)}
                        onAddAnother={() => fileInputRef.current?.click()}
                        onImageUpdated={onImageUpdated}
                        lineIndex={slotIdx}
                        totalLines={lines.length}
                        onMoveLine={(newSlot) => handleMoveImageToSlot(imgSrc, newSlot)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Line of Text / Mathematical Derivation Step ── */}
              {isLineBelow && (
                <div className="py-0.5 leading-relaxed text-[#27272A]/85 dark:text-[#C9D1D9]">
                  <LatexRenderer
                    content={lines[slotIdx]}
                    as="div"
                    className="text-sm sm:text-base whitespace-pre-wrap"
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Hidden File Input for Admin to Upload Additional Photos ── */}
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
            alt="Expanded Solution Diagram"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[95vw] rounded-2xl object-contain bg-white dark:bg-zinc-950 p-2 shadow-2xl border border-white/20"
          />
        </div>
      )}
    </div>
  );
}
