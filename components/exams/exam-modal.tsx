"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  BookOpen,
  Camera,
  CheckCircle2,
  Clock,
  FileQuestion,
  FileText,
  HelpCircle,
  Lightbulb,
  Plus,
  RotateCcw,
  Sparkles,
  Trophy,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ExamItem, ExamQuestion } from "@/lib/exams";
import { LatexRenderer } from "./latex-renderer";
import { WrittenQuestionRenderer } from "./written-question";
import { formatSolution } from "@/lib/format-solution";
import { ExamImageDropzone, compressImageToWebP, DropzoneTarget } from "./exam-image-dropzone";

import { submitExamAttempt } from "@/app/actions/exams";

interface ExamModalProps {
  exam: ExamItem | null;
  initialAttempt?: { score: number; total: number; selectedAnswers: Record<string, string> };
  onClose: () => void;
  onAttemptSaved?: (score: number, total: number, selectedAnswers: Record<string, string>) => void;
  isAdmin?: boolean;
  onQuestionsUpdated?: (updatedQuestions: ExamQuestion[]) => void;
}

export function ExamModal({
  exam,
  initialAttempt,
  onClose,
  onAttemptSaved,
  isAdmin = false,
  onQuestionsUpdated,
}: ExamModalProps) {
  const [mounted, setMounted] = React.useState(false);
  const [mode, setMode] = React.useState<"solutions" | "practice">("practice");
  const [selectedAnswers, setSelectedAnswers] = React.useState<Record<number, string>>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [score, setScore] = React.useState<{ correct: number; total: number } | null>(null);
  const [questions, setQuestions] = React.useState<ExamQuestion[]>(exam?.questions || []);
  const [activeQuestionMenu, setActiveQuestionMenu] = React.useState<number | null>(null);
  const questionMenuRef = React.useRef<HTMLDivElement | null>(null);
  const questionFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const pendingUploadTargetRef = React.useRef<{
    qNum: number;
    target: DropzoneTarget;
  } | null>(null);

  // Close question context menu on click outside
  React.useEffect(() => {
    if (activeQuestionMenu === null) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (questionMenuRef.current && !questionMenuRef.current.contains(e.target as Node)) {
        setActiveQuestionMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeQuestionMenu]);

  const triggerQuestionUpload = (qNum: number, target: DropzoneTarget) => {
    pendingUploadTargetRef.current = { qNum, target };
    setActiveQuestionMenu(null);
    questionFileInputRef.current?.click();
  };

  const handleGlobalQuestionFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const pending = pendingUploadTargetRef.current;
    if (!file || !pending || !exam) return;

    const { qNum, target } = pending;
    try {
      const toastId = toast.loading("Compressing & uploading diagram...");
      const compressedBlob = await compressImageToWebP(file);
      const compressedFile = new File(
        [compressedBlob],
        file.name.replace(/\.[^/.]+$/, "") + ".webp",
        { type: "image/webp" }
      );

      const formData = new FormData();
      formData.append("file", compressedFile);
      formData.append("examId", exam.id);
      formData.append("questionNumber", String(qNum));
      formData.append("target", target);

      const res = await fetch("/api/exams/upload-image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to upload image");
      }

      toast.success("Diagram attached!", { id: toastId });
      if (target.startsWith("option-")) {
        const optKey = target.replace("option-", "");
        handleOptionImageAdded(qNum, optKey, data.imageUrl);
      } else {
        handleImageAdded(qNum, target as "question" | "solution", data.imageUrl);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      e.target.value = "";
      pendingUploadTargetRef.current = null;
    }
  };

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Sync local questions when exam ID changes
  React.useEffect(() => {
    if (exam?.questions) {
      setQuestions(exam.questions);
    }
  }, [exam?.id]);

  // Lock body scroll when modal is active
  React.useEffect(() => {
    if (!exam) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [exam]);

  // Load existing attempt or reset state when exam changes
  React.useEffect(() => {
    if (initialAttempt) {
      const parsed: Record<number, string> = {};
      Object.entries(initialAttempt.selectedAnswers || {}).forEach(([k, v]) => {
        parsed[Number(k)] = v;
      });
      setSelectedAnswers(parsed);
      setSubmitted(true);
      setScore({ correct: initialAttempt.score, total: initialAttempt.total });
      setMode("practice");
    } else {
      setSelectedAnswers({});
      setSubmitted(false);
      setScore(null);
      setMode("practice");
    }
  }, [exam?.id, initialAttempt]);

  if (!mounted || !exam || typeof document === "undefined" || !document.body) {
    return null;
  }

  const isWritten = exam.type === "Written" || exam.category === "written";
  const canUpload = isAdmin && (mode === "solutions" || isWritten);

  const handleImageAdded = (qNum: number, target: "question" | "solution", newUrl: string) => {
    setQuestions((prev) => {
      const updated = prev.map((q) => {
        if (q.number !== qNum) return q;
        const qCopy = { ...q };
        if (target === "question") {
          const cur = Array.isArray(qCopy.questionImages) ? qCopy.questionImages : [];
          qCopy.questionImages = [...cur, newUrl];
        } else {
          const cur = Array.isArray(qCopy.solutionImages) ? qCopy.solutionImages : [];
          qCopy.solutionImages = [...cur, newUrl];
        }
        qCopy.hasImage = true;
        return qCopy;
      });
      onQuestionsUpdated?.(updated);
      return updated;
    });
  };

  const handleImageDeleted = (qNum: number, target: "question" | "solution", deletedUrl: string) => {
    setQuestions((prev) => {
      const updated = prev.map((q) => {
        if (q.number !== qNum) return q;
        const qCopy = { ...q };
        if (target === "question") {
          qCopy.questionImages = (qCopy.questionImages || []).filter((u) => u !== deletedUrl);
        } else {
          qCopy.solutionImages = (qCopy.solutionImages || []).filter((u) => u !== deletedUrl);
        }
        const hasAny =
          (qCopy.questionImages && qCopy.questionImages.length > 0) ||
          (qCopy.solutionImages && qCopy.solutionImages.length > 0);
        if (!hasAny && !qCopy.solution?.includes("[images]")) {
          qCopy.hasImage = false;
        }
        return qCopy;
      });
      onQuestionsUpdated?.(updated);
      return updated;
    });
  };

  const handleImageUpdated = (
    qNum: number,
    target: "question" | "solution",
    oldUrl: string,
    newUrl: string
  ) => {
    setQuestions((prev) => {
      const updated = prev.map((q) => {
        if (q.number !== qNum) return q;
        const qCopy = { ...q };
        const normalize = (u: string) => u.split("#")[0];
        const targetBase = normalize(oldUrl);

        if (target === "question" && Array.isArray(qCopy.questionImages)) {
          qCopy.questionImages = qCopy.questionImages.map((u) =>
            normalize(u) === targetBase ? newUrl : u
          );
        } else if (Array.isArray(qCopy.solutionImages)) {
          qCopy.solutionImages = qCopy.solutionImages.map((u) =>
            normalize(u) === targetBase ? newUrl : u
          );
        }
        return qCopy;
      });
      return updated;
    });
  };

  const handleOptionImageAdded = (qNum: number, optKey: string, newUrl: string) => {
    setQuestions((prev) => {
      const updated = prev.map((q) => {
        if (q.number !== qNum) return q;
        const qCopy = { ...q };
        qCopy.optionImages = { ...(qCopy.optionImages || {}), [optKey]: newUrl };
        qCopy.hasImage = true;
        return qCopy;
      });
      onQuestionsUpdated?.(updated);
      return updated;
    });
  };

  const handleOptionImageDeleted = (qNum: number, optKey: string) => {
    setQuestions((prev) => {
      const updated = prev.map((q) => {
        if (q.number !== qNum) return q;
        const qCopy = { ...q };
        if (qCopy.optionImages) {
          const next = { ...qCopy.optionImages };
          delete next[optKey as "A" | "B" | "C" | "D"];
          qCopy.optionImages = next;
        }
        return qCopy;
      });
      onQuestionsUpdated?.(updated);
      return updated;
    });
  };

  const handleOptionImageUpdated = (
    qNum: number,
    optKey: string,
    oldUrl: string,
    newUrl: string
  ) => {
    setQuestions((prev) => {
      const updated = prev.map((q) => {
        if (q.number !== qNum) return q;
        const qCopy = { ...q };
        if (!qCopy.optionImages) qCopy.optionImages = {};
        qCopy.optionImages = { ...qCopy.optionImages, [optKey]: newUrl };
        return qCopy;
      });
      return updated;
    });
  };

  const handleSelectOption = (qNum: number, optKey: string) => {
    if (submitted) return;
    setSelectedAnswers((prev) => {
      const updated = { ...prev };
      if (updated[qNum] === optKey) {
        delete updated[qNum];
      } else {
        updated[qNum] = optKey;
      }
      return updated;
    });
  };

  const handleSubmitExam = () => {
    let correctCount = 0;
    questions.forEach((q) => {
      const userAns = selectedAnswers[q.number];
      if (userAns) {
        if (q.correctAnswer) {
          if (userAns === q.correctAnswer) correctCount++;
        } else if (q.options && q.solution) {
          const chosenText = q.options[userAns as keyof typeof q.options];
          if (chosenText && q.solution.includes(chosenText)) {
            correctCount++;
          }
        }
      }
    });

    const newScore = { correct: correctCount, total: questions.length };
    setScore(newScore);
    setSubmitted(true);

    const stringAnswers: Record<string, string> = {};
    Object.entries(selectedAnswers).forEach(([k, v]) => {
      stringAnswers[k] = v;
    });

    onAttemptSaved?.(correctCount, questions.length, stringAnswers);
    submitExamAttempt(exam.id, correctCount, exam.questions.length, stringAnswers).catch((err) => {
      console.warn("Failed to save attempt to Neon:", err);
    });
  };

  const handleResetPractice = () => {
    setSelectedAnswers({});
    setSubmitted(false);
    setScore(null);
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[999999] flex items-center justify-center p-0 sm:p-4 md:p-6 bg-white/95 backdrop-blur-3xl dark:bg-[#070B0E]/95 dark:backdrop-blur-3xl overflow-hidden transition-colors"
    >
      <div className="relative flex flex-col w-full max-w-[1360px] h-[100dvh] sm:h-[96vh] max-h-[100dvh] sm:max-h-[96vh] rounded-none sm:rounded-3xl border-0 sm:border border-border/80 bg-white shadow-2xl dark:border-[#1F2C34] dark:bg-[#0D1318] overflow-hidden transition-colors">
        {/* ── Modal Title Bar (White in light mode, Dark blur in dark mode) ── */}
        <div className="shrink-0 border-b border-border/80 bg-white/95 dark:bg-[#111820]/95 backdrop-blur-xl px-3.5 sm:px-6 md:px-8 py-2.5 sm:py-3 shadow-xs space-y-2 sm:space-y-2.5">
          {/* Top Row: Meta Badges on Left + Cross Button on Top Right */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
              <span className="inline-flex items-center gap-1 rounded-full px-2 sm:px-2.5 py-0.5 text-[9px] sm:text-[11px] font-bold uppercase tracking-wider bg-[#FFF1F2] text-[#881337] border border-[#881337]/15 dark:bg-[#881337]/20 dark:text-[#FDA4AF] dark:border-[#881337]/30 whitespace-nowrap">
                {exam.category === "daily"
                  ? "Daily Live"
                  : exam.category === "weekly"
                  ? "Weekly Live"
                  : "Written"}
              </span>

              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-mono text-muted-foreground dark:text-[#9AA7AE] bg-muted/60 dark:bg-black/40 px-1.5 sm:px-2 py-0.5 rounded-md border border-border/40 dark:border-[#1F2C34] whitespace-nowrap">
                <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-[#BE123C] dark:text-[#FDA4AF]" />
                {exam.duration}
              </span>

              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-mono text-muted-foreground dark:text-[#9AA7AE] bg-muted/60 dark:bg-black/40 px-1.5 sm:px-2 py-0.5 rounded-md border border-border/40 dark:border-[#1F2C34] whitespace-nowrap">
                <FileQuestion className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-[#BE123C] dark:text-[#FDA4AF]" />
                {isWritten ? "Written" : `${exam.totalQuestions} Qs`}
              </span>

              {exam.pdfUrl && (
                <a
                  href={exam.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-[#881337] dark:text-[#FDA4AF] bg-[#FFF1F2] hover:bg-[#881337] hover:text-white dark:bg-[#881337]/20 dark:hover:bg-[#881337] dark:hover:text-white px-2 py-0.5 rounded-md border border-[#881337]/25 transition-colors whitespace-nowrap"
                >
                  <FileText className="h-3 w-3 text-[#BE123C] dark:text-[#FDA4AF]" />
                  <span>Exam PDF</span>
                  <ArrowRight className="h-3 w-3" />
                </a>
              )}
            </div>

            {/* Close Button Top Right */}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 sm:h-8.5 sm:w-8.5 items-center justify-center rounded-full text-muted-foreground hover:text-[#881337] hover:bg-[#FFF1F2] dark:hover:text-[#FDA4AF] dark:hover:bg-[#881337]/20 transition-colors cursor-pointer shrink-0"
              title="Close"
            >
              <X className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </button>
          </div>

          {/* Main Row: Exam Title + Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="font-heading text-sm sm:text-base md:text-lg font-bold tracking-tight text-[#27272A] dark:text-[#E8EDF0] truncate min-w-0">
              {exam.title}
            </h2>

            {/* Mode Switch Toggle: Full width on mobile, compact on desktop */}
            {!isWritten && (
              <div className="flex items-center rounded-xl bg-muted/70 p-0.5 sm:p-1 border border-border/40 dark:border-[#1F2C34] dark:bg-black/50 w-full sm:w-auto shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveQuestionMenu(null);
                    setMode("practice");
                  }}
                  className={cn(
                    "flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap",
                    mode === "practice"
                      ? "bg-[#881337] text-white shadow-xs font-bold dark:bg-[#881337] dark:text-white"
                      : "text-muted-foreground hover:text-[#881337] dark:hover:text-[#FDA4AF]"
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Practice</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveQuestionMenu(null);
                    setMode("solutions");
                  }}
                  className={cn(
                    "flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap",
                    mode === "solutions"
                      ? "bg-[#881337] text-white shadow-xs font-bold dark:bg-[#881337] dark:text-white"
                      : "text-muted-foreground hover:text-[#881337] dark:hover:text-[#FDA4AF]"
                  )}
                >
                  <Lightbulb className="h-3.5 w-3.5" />
                  <span>Solutions</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Practice Mode Score Banner ── */}
        {mode === "practice" && submitted && score && (
          <div className="shrink-0 flex items-center justify-between px-6 py-3 bg-[#FFF1F2] border-b border-[#881337]/20 text-[#881337] dark:bg-[#881337]/20 dark:border-[#881337]/35 dark:text-[#FFE4E6]">
            <div className="flex items-center gap-2.5">
              <Trophy className="h-5 w-5 text-[#881337] dark:text-[#FDA4AF]" />
              <span className="font-heading font-bold text-sm sm:text-base">
                Exam Completed! You scored {score.correct} / {score.total} (
                {Math.round((score.correct / score.total) * 100)}%)
              </span>
            </div>
            <button
              type="button"
              onClick={handleResetPractice}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#BE123C] hover:text-[#881337] dark:text-[#FDA4AF] dark:hover:text-[#FFE4E6] underline hover:no-underline cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              Try Again
            </button>
          </div>
        )}

        {/* ── Modal Scrollable Body (~30% bigger content) ── */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8 space-y-3.5 sm:space-y-6">
          {questions.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground text-base">
              No questions found for this exam.
            </div>
          ) : isWritten ? (
            /* Written Exam Format */
            <div className="space-y-4 sm:space-y-6">
              <div className="rounded-xl sm:rounded-2xl border border-[#881337]/20 bg-[#FFF1F2] p-3.5 sm:p-5 text-xs sm:text-sm text-[#881337] dark:border-[#881337]/30 dark:bg-[#881337]/20 dark:text-[#FFE4E6]">
                📝 <strong>Written Exam Mode:</strong> This is a 3-hour descriptive question paper. Below are the question sections and full solutions.
              </div>
              {questions.map((q, idx) => (
                <div
                  key={idx}
                  className="rounded-xl sm:rounded-2xl border border-border/70 bg-card p-4 sm:p-8 space-y-3.5 sm:space-y-5 dark:border-[#1F2C34] dark:bg-[#111820]"
                >
                  <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                    <div className="font-heading font-extrabold text-base sm:text-xl text-[#881337] dark:text-[#FDA4AF] flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-[#881337]/10 dark:bg-[#881337]/30 text-xs sm:text-sm font-mono">
                        {q.number || idx + 1}
                      </span>
                      <span>Section {q.number || idx + 1}</span>
                    </div>
                  </div>

                  {/* Section Diagram: Render ONLY if section actually contains diagrams/images */}
                  {((q.questionImages && q.questionImages.length > 0) ||
                    (q.solutionImages && q.solutionImages.length > 0)) && (
                    <ExamImageDropzone
                      examId={exam.id}
                      questionNumber={q.number || idx + 1}
                      target="solution"
                      images={[...(q.questionImages || []), ...(q.solutionImages || [])]}
                      isAdmin={canUpload}
                      label="Section Diagram"
                      onImageAdded={(url) => handleImageAdded(q.number || idx + 1, "solution", url)}
                      onImageDeleted={(url) => handleImageDeleted(q.number || idx + 1, "solution", url)}
                      onImageUpdated={(oldUrl, newUrl) => handleImageUpdated(q.number || idx + 1, "solution", oldUrl, newUrl)}
                    />
                  )}

                  {/* Sub-questions with dedicated Marks items/badges */}
                  <WrittenQuestionRenderer
                    content={q.content || q.question}
                  />

                  {/* Expandable Official Model Solution & Grading Guide */}
                  {q.solution && (
                    <div className="mt-4 pt-3.5 border-t border-border/40">
                      <details className="group/sol rounded-xl border border-[#881337]/15 bg-[#881337]/[0.02] dark:border-[#881337]/25 dark:bg-[#881337]/[0.05] p-3 transition-colors">
                        <summary className="cursor-pointer list-none flex items-center justify-between text-xs sm:text-sm font-semibold text-[#881337] dark:text-[#FDA4AF] hover:opacity-85 select-none py-0.5">
                          <span className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            <span>মডেল উত্তর ও নম্বর বণ্টন (Official Solution & Marking Guide)</span>
                          </span>
                          <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground group-open/sol:rotate-180 transition-transform">
                            ▼
                          </span>
                        </summary>
                        <div className="mt-3.5 pt-3 border-t border-[#881337]/10 dark:border-[#881337]/20">
                          <LatexRenderer
                            content={formatSolution(q.solution)}
                            as="div"
                            className="text-sm sm:text-base leading-relaxed text-[#27272A]/90 dark:text-[#D1D9E0] whitespace-pre-wrap font-normal"
                          />
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* MCQ Exam Format */
            questions.map((q) => {
              const userChoice = selectedAnswers[q.number];
              const opts = q.options ? Object.entries(q.options) : [];

              return (
                <div
                  key={q.number}
                  className="rounded-xl sm:rounded-2xl border border-border/70 bg-card p-3.5 sm:p-6 space-y-3 sm:space-y-5 shadow-xs dark:border-[#1F2C34] dark:bg-[#111820] transition-colors"
                >
                  {/* Question Title & Add Photo Button */}
                  <div className="space-y-2.5 sm:space-y-3">
                    <div className="flex items-start justify-between gap-2.5 sm:gap-3.5">
                      <div className="flex items-start gap-2.5 sm:gap-3.5 flex-1 min-w-0">
                        <span className="flex h-6 w-6 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-[#FFF1F2] text-xs sm:text-sm font-mono font-bold text-[#881337] dark:bg-[#881337]/25 dark:text-[#FDA4AF] border border-[#881337]/20">
                          {q.number}
                        </span>
                        <LatexRenderer
                          content={q.question}
                          as="h3"
                          className="font-medium text-sm sm:text-lg md:text-xl leading-relaxed text-[#27272A] dark:text-[#E8EDF0]"
                        />
                      </div>

                      {canUpload && (
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveQuestionMenu((prev) => (prev === q.number ? null : q.number));
                            }}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs font-semibold shadow-xs cursor-pointer active:scale-95 transition-all",
                              activeQuestionMenu === q.number
                                ? "bg-[#881337] text-white ring-2 ring-[#881337]/40"
                                : "bg-[#881337] hover:bg-[#BE123C] text-white"
                            )}
                            title="Add Diagram to this question"
                          >
                            <Camera className="h-3.5 w-3.5" />
                            <span>Add Photo</span>
                          </button>

                          {/* Popover Menu: Only one option 'Add Diagram' as requested */}
                          {activeQuestionMenu === q.number && (
                            <div
                              ref={questionMenuRef}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute top-10 right-0 z-50 flex flex-col gap-1 rounded-2xl border border-border/80 bg-white dark:bg-[#111820] backdrop-blur-xl p-2 shadow-2xl text-xs w-[245px] animate-in fade-in zoom-in-95 duration-150"
                            >
                              <div className="flex items-center justify-between px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 mb-1">
                                <span>Add Photo to Q{q.number}</span>
                                <button
                                  type="button"
                                  onClick={() => setActiveQuestionMenu(null)}
                                  className="rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              {/* Main Option: Add Diagram */}
                              <button
                                type="button"
                                onClick={() => triggerQuestionUpload(q.number, "question")}
                                className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 font-medium text-foreground hover:bg-[#881337]/10 hover:text-[#881337] dark:hover:text-[#FDA4AF] transition-colors text-left cursor-pointer group/opt"
                              >
                                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#881337]/15 text-[#881337] dark:text-[#FDA4AF] shrink-0 group-hover/opt:bg-[#881337] group-hover/opt:text-white transition-colors">
                                  <Camera className="h-4 w-4" />
                                </div>
                                <div>
                                  <div className="font-semibold text-xs">Add Diagram</div>
                                  <div className="text-[10px] text-muted-foreground">Attach diagram directly below question</div>
                                </div>
                              </button>

                              {/* Option Diagrams: A, B, C, D */}
                              {opts.length > 0 && (
                                <div className="pt-1.5 border-t border-border/40 mt-1 space-y-1.5">
                                  <div className="px-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    Option Diagrams:
                                  </div>
                                  <div className="grid grid-cols-2 gap-1.5 px-1">
                                    {opts.map(([optKey]) => (
                                      <button
                                        key={optKey}
                                        type="button"
                                        onClick={() => triggerQuestionUpload(q.number, `option-${optKey}` as DropzoneTarget)}
                                        className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-muted/30 px-2.5 py-1.5 font-medium hover:border-[#881337] hover:bg-[#881337]/10 hover:text-[#881337] dark:hover:text-[#FDA4AF] transition-colors text-xs cursor-pointer text-left"
                                      >
                                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#881337]/15 text-[10px] font-bold font-mono text-[#881337] dark:text-[#FDA4AF]">
                                          {optKey}
                                        </span>
                                        <span className="font-medium text-[11px]">Option {optKey}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Question Diagram: ONLY rendered if an image already exists */}
                    {q.questionImages && q.questionImages.length > 0 && (
                      <div className="pl-8 sm:pl-11 pt-1">
                        <ExamImageDropzone
                          examId={exam.id}
                          questionNumber={q.number}
                          target="question"
                          images={q.questionImages}
                          isAdmin={canUpload}
                          label="Add Question Diagram"
                          onImageAdded={(url) => handleImageAdded(q.number, "question", url)}
                          onImageDeleted={(url) => handleImageDeleted(q.number, "question", url)}
                          onImageUpdated={(oldUrl, newUrl) => handleImageUpdated(q.number, "question", oldUrl, newUrl)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Options (A, B, C, D) */}
                  {opts.length > 0 && (
                    <div
                      className={cn(
                        "gap-2 sm:gap-4 pt-1",
                        opts.some(([k, val]) => val === "[images]" || val?.includes("[images]") || q.optionImages?.[k as "A" | "B" | "C" | "D"])
                          ? "flex flex-wrap items-start"
                          : "grid grid-cols-1 sm:grid-cols-2"
                      )}
                    >
                      {opts.map(([key, val]) => {
                        const isPractice = mode === "practice";
                        const isUserSelected = isPractice && userChoice === key;
                        const isCorrectOption =
                          (mode === "solutions" || (isPractice && submitted)) &&
                          (q.correctAnswer
                            ? q.correctAnswer === key
                            : q.solution && val && q.solution.includes(val));
                        const isWrongOption =
                          isPractice && submitted && isUserSelected && !isCorrectOption;

                        const isImageOption =
                          val === "[images]" ||
                          val?.includes("[images]") ||
                          !!q.optionImages?.[key as "A" | "B" | "C" | "D"];
                        const optImg = q.optionImages?.[key as "A" | "B" | "C" | "D"];

                        return (
                          <div
                            key={key}
                            className={cn(
                              "rounded-xl border transition-all duration-150",
                              isImageOption
                                ? "w-fit max-w-full inline-flex items-center gap-2.5 sm:gap-3.5 p-2 sm:p-3 self-start"
                                : "w-full flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3.5 p-2.5 sm:p-4 text-left text-xs sm:text-base",
                              isPractice && !submitted && "cursor-pointer hover:border-[#881337]/50 hover:bg-[#FFF1F2]/60 dark:hover:border-[#881337]/40 dark:hover:bg-[#881337]/15",
                              isUserSelected && !submitted && "border-[#881337] bg-[#FFF1F2] text-[#27272A] dark:border-[#BE123C] dark:bg-[#881337]/25 dark:text-[#FFE4E6] font-medium ring-1 ring-[#881337]/30",
                              isCorrectOption && "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold ring-1 ring-emerald-500/30",
                              isWrongOption && "border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-300",
                              !isUserSelected && !isCorrectOption && !isWrongOption && "border-border/60 bg-muted/20 text-[#27272A] dark:border-[#1F2C34] dark:bg-[#0A0F12]/40 dark:text-[#E8EDF0]"
                            )}
                            onClick={() => {
                              if (isPractice && !submitted) {
                                handleSelectOption(q.number, key);
                              }
                            }}
                          >
                            <div className={cn("flex items-center gap-2.5 sm:gap-3.5 min-w-0", isImageOption ? "w-fit max-w-full" : "flex-1")}>
                              <span
                                className={cn(
                                  "flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full text-xs sm:text-sm font-mono font-bold border",
                                  isCorrectOption
                                    ? "bg-emerald-500 text-white border-emerald-500"
                                    : isWrongOption
                                    ? "bg-[#BE123C] text-white border-[#BE123C]"
                                    : isUserSelected
                                    ? "bg-[#881337] text-white border-[#881337]"
                                    : "border-border/80 bg-background text-muted-foreground dark:border-[#1F2C34] dark:bg-black"
                                )}
                              >
                                {key}
                              </span>

                              {!isImageOption ? (
                                <LatexRenderer
                                  content={val}
                                  as="span"
                                  className="flex-1 leading-snug text-sm sm:text-base"
                                />
                              ) : (
                                /* Place 1: Option Diagram / Image Dropzone directly in place of [images] */
                                <div
                                  className="w-fit max-w-full"
                                  onClick={(e) => {
                                    if (canUpload) e.stopPropagation();
                                  }}
                                >
                                  {optImg && (
                                    <ExamImageDropzone
                                      examId={exam.id}
                                      questionNumber={q.number}
                                      target={`option-${key}` as any}
                                      images={[optImg]}
                                      isAdmin={canUpload}
                                      compact={true}
                                      onImageAdded={(url) => handleOptionImageAdded(q.number, key, url)}
                                      onImageDeleted={() => handleOptionImageDeleted(q.number, key)}
                                      onImageUpdated={(oldUrl, newUrl) => handleOptionImageUpdated(q.number, key, oldUrl, newUrl)}
                                    />
                                  )}
                                </div>
                              )}

                              {isCorrectOption && (
                                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 ml-auto" />
                              )}
                              {isWrongOption && (
                                <XCircle className="h-5 w-5 text-[#BE123C] shrink-0 ml-auto" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Solution Block (Supports Text, Images / Diagrams, and PDFs) */}
                  {(mode === "solutions" || submitted) &&
                    (q.solution ||
                      (q.solutionImages && q.solutionImages.length > 0) ||
                      (q.solutionPdfs && q.solutionPdfs.length > 0)) && (
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5 space-y-3 dark:border-emerald-500/20 dark:bg-emerald-950/20">
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400">
                          <Lightbulb className="h-4 w-4" />
                          <span>Solution & Explanation:</span>
                        </div>

                        {/* Solution Text */}
                        {q.solution && (
                          <div className="space-y-2">
                            <LatexRenderer
                              content={formatSolution(q.solution)}
                              as="div"
                              className="text-sm sm:text-base leading-relaxed text-[#27272A]/85 dark:text-[#C9D1D9] whitespace-pre-wrap"
                            />
                          </div>
                        )}

                        {/* Solution Diagram: Render ONLY if diagram actually exists */}
                        {q.solutionImages && q.solutionImages.length > 0 && (
                          <div className="pt-1">
                            <ExamImageDropzone
                              examId={exam.id}
                              questionNumber={q.number}
                              target="solution"
                              images={q.solutionImages}
                              isAdmin={canUpload}
                              label="Solution Diagram"
                              onImageAdded={(url) => handleImageAdded(q.number, "solution", url)}
                              onImageDeleted={(url) => handleImageDeleted(q.number, "solution", url)}
                              onImageUpdated={(oldUrl, newUrl) => handleImageUpdated(q.number, "solution", oldUrl, newUrl)}
                            />
                          </div>
                        )}

                        {/* Solution PDFs */}
                        {q.solutionPdfs && q.solutionPdfs.length > 0 && (
                          <div className="flex flex-wrap gap-2.5 pt-1">
                            {q.solutionPdfs.map((pdf, i) => (
                              <a
                                key={i}
                                href={pdf}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-xl border border-[#881337]/25 bg-[#FFF1F2] hover:bg-[#881337] hover:text-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-[#881337] dark:border-[#881337]/35 dark:bg-[#881337]/20 dark:text-[#FDA4AF] dark:hover:bg-[#881337] dark:hover:text-white transition-colors"
                              >
                                <FileText className="h-4 w-4 text-[#BE123C] dark:text-[#FDA4AF]" />
                                <span>Open Solution PDF</span>
                                <ArrowRight className="h-3.5 w-3.5" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                </div>
              );
            })
          )}
        </div>

        {/* ── Modal Footer (Always Visible at Bottom) ── */}
        <div className="shrink-0 flex items-center justify-between border-t border-border/80 bg-white/95 dark:bg-[#111820]/95 backdrop-blur-xl px-3 sm:px-6 md:px-8 py-2.5 sm:py-3.5 shadow-xs gap-2">
          <div className="text-xs sm:text-sm text-muted-foreground font-mono min-w-0 truncate">
            {mode === "practice" && !isWritten ? (
              <span className="whitespace-nowrap">
                <span className="hidden xs:inline">Answered: </span>
                <span className="xs:hidden">Ans: </span>
                <strong className="text-[#881337] font-bold dark:text-[#FDA4AF]">
                  {Object.keys(selectedAnswers).length}
                </strong>
                {" "}/ {exam.questions.length}
              </span>
            ) : (
              <span className="whitespace-nowrap">
                {exam.questions.length} <span className="hidden xs:inline">questions</span><span className="xs:hidden">Qs</span>
              </span>
            )}
            {exam.title && <span className="hidden md:inline"> • {exam.title}</span>}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {mode === "practice" && !isWritten && !submitted && (
              <button
                type="button"
                onClick={handleSubmitExam}
                disabled={Object.keys(selectedAnswers).length === 0}
                className="group/submit inline-flex items-center gap-1.5 sm:gap-2 rounded-xl bg-[#881337] hover:bg-[#BE123C] px-3.5 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs disabled:opacity-50 cursor-pointer active:scale-95 transition-all whitespace-nowrap"
              >
                <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span>Submit Exam</span>
                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 transition-transform duration-200 group-hover/submit:translate-x-1" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border/80 bg-muted/60 hover:bg-[#FFF1F2] hover:text-[#881337] hover:border-[#881337]/30 px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-foreground dark:border-[#1F2C34] dark:hover:bg-[#881337]/20 dark:hover:text-[#FDA4AF] transition-colors cursor-pointer whitespace-nowrap"
            >
              Close
            </button>
          </div>
        </div>

        {/* Global hidden file input for admin question-level photo triggers */}
        {canUpload && (
          <input
            ref={questionFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleGlobalQuestionFileChange}
          />
        )}
      </div>
    </div>,
    document.body
  );
}
