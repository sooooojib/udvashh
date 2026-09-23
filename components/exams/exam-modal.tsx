"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileQuestion,
  FileText,
  HelpCircle,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Trophy,
  X,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ExamItem } from "@/lib/exams";
import { LatexRenderer } from "./latex-renderer";
import { formatSolution } from "@/lib/format-solution";

import { submitExamAttempt } from "@/app/actions/exams";

interface ExamModalProps {
  exam: ExamItem | null;
  initialAttempt?: { score: number; total: number; selectedAnswers: Record<string, string> };
  onClose: () => void;
  onAttemptSaved?: (score: number, total: number, selectedAnswers: Record<string, string>) => void;
}

export function ExamModal({ exam, initialAttempt, onClose, onAttemptSaved }: ExamModalProps) {
  const [mounted, setMounted] = React.useState(false);
  const [mode, setMode] = React.useState<"solutions" | "practice">("practice");
  const [selectedAnswers, setSelectedAnswers] = React.useState<Record<number, string>>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [score, setScore] = React.useState<{ correct: number; total: number } | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

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
    exam.questions.forEach((q) => {
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

    const newScore = { correct: correctCount, total: exam.questions.length };
    setScore(newScore);
    setSubmitted(true);

    const stringAnswers: Record<string, string> = {};
    Object.entries(selectedAnswers).forEach(([k, v]) => {
      stringAnswers[k] = v;
    });

    onAttemptSaved?.(correctCount, exam.questions.length, stringAnswers);
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
                  onClick={() => setMode("practice")}
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
                  onClick={() => setMode("solutions")}
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
          {exam.questions.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground text-base">
              No questions found for this exam.
            </div>
          ) : isWritten ? (
            /* Written Exam Format */
            <div className="space-y-4 sm:space-y-6">
              <div className="rounded-xl sm:rounded-2xl border border-[#881337]/20 bg-[#FFF1F2] p-3.5 sm:p-5 text-xs sm:text-sm text-[#881337] dark:border-[#881337]/30 dark:bg-[#881337]/20 dark:text-[#FFE4E6]">
                📝 <strong>Written Exam Mode:</strong> This is a 3-hour descriptive question paper. Below are the question sections and full solutions.
              </div>
              {exam.questions.map((q, idx) => (
                <div
                  key={idx}
                  className="rounded-xl sm:rounded-2xl border border-border/70 bg-card p-4 sm:p-8 space-y-3 sm:space-y-4 dark:border-[#1F2C34] dark:bg-[#111820]"
                >
                  <div className="font-heading font-bold text-sm sm:text-lg text-[#27272A] dark:text-[#E8EDF0]">
                    Section {q.number || idx + 1}
                  </div>
                  <LatexRenderer
                    content={formatSolution(q.content || q.question)}
                    as="div"
                    className="text-sm sm:text-lg leading-relaxed text-[#27272A]/90 whitespace-pre-wrap dark:text-[#D1D9E0]"
                  />
                </div>
              ))}
            </div>
          ) : (
            /* MCQ Exam Format */
            exam.questions.map((q) => {
              const userChoice = selectedAnswers[q.number];
              const opts = q.options ? Object.entries(q.options) : [];

              return (
                <div
                  key={q.number}
                  className="rounded-xl sm:rounded-2xl border border-border/70 bg-card p-3.5 sm:p-6 space-y-3 sm:space-y-5 shadow-xs dark:border-[#1F2C34] dark:bg-[#111820] transition-colors"
                >
                  {/* Question Title */}
                  <div className="space-y-2.5 sm:space-y-3">
                    <div className="flex items-start gap-2.5 sm:gap-3.5">
                      <span className="flex h-6 w-6 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-[#FFF1F2] text-xs sm:text-sm font-mono font-bold text-[#881337] dark:bg-[#881337]/25 dark:text-[#FDA4AF] border border-[#881337]/20">
                        {q.number}
                      </span>
                      <LatexRenderer
                        content={q.question}
                        as="h3"
                        className="font-medium text-sm sm:text-lg md:text-xl leading-relaxed text-[#27272A] dark:text-[#E8EDF0]"
                      />
                    </div>

                    {/* Question Diagram / Image (if any) */}
                    {q.questionImages && q.questionImages.length > 0 && (
                      <div className="pl-8 sm:pl-11 space-y-3 pt-1">
                        {q.questionImages.map((src, i) => (
                          <img
                            key={i}
                            src={src}
                            alt={`Question ${q.number} Diagram`}
                            className="max-h-80 sm:max-h-96 rounded-xl border border-border/60 bg-white object-contain p-1.5 shadow-sm dark:bg-zinc-900"
                            loading="lazy"
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Options (A, B, C, D) */}
                  {opts.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 pt-1">
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

                        return (
                          <button
                            type="button"
                            key={key}
                            disabled={mode === "solutions" || submitted}
                            onClick={() => handleSelectOption(q.number, key)}
                            className={cn(
                              "flex items-center gap-2.5 sm:gap-3.5 rounded-xl border p-2.5 sm:p-4 text-left text-xs sm:text-base transition-all duration-150",
                              isPractice && !submitted && "cursor-pointer hover:border-[#881337]/50 hover:bg-[#FFF1F2]/60 dark:hover:border-[#881337]/40 dark:hover:bg-[#881337]/15",
                              isUserSelected && !submitted && "border-[#881337] bg-[#FFF1F2] text-[#27272A] dark:border-[#BE123C] dark:bg-[#881337]/25 dark:text-[#FFE4E6] font-medium ring-1 ring-[#881337]/30",
                              isCorrectOption && "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold ring-1 ring-emerald-500/30",
                              isWrongOption && "border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-300",
                              !isUserSelected && !isCorrectOption && !isWrongOption && "border-border/60 bg-muted/20 text-[#27272A] dark:border-[#1F2C34] dark:bg-[#0A0F12]/40 dark:text-[#E8EDF0]"
                            )}
                          >
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
                            <LatexRenderer
                              content={val}
                              as="span"
                              className="flex-1 leading-snug text-sm sm:text-base"
                            />
                            {isCorrectOption && (
                              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                            )}
                            {isWrongOption && (
                              <XCircle className="h-5 w-5 text-[#BE123C] shrink-0" />
                            )}
                          </button>
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
                            {(q.hasImage || q.solution.includes("[images]")) && (
                              <div className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                                <span>🖼️ Diagram / Image Reference</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Solution Photos / Diagrams */}
                        {q.solutionImages && q.solutionImages.length > 0 && (
                          <div className="space-y-2 pt-1">
                            {q.solutionImages.map((src, i) => (
                              <img
                                key={i}
                                src={src}
                                alt="Solution Diagram"
                                className="max-h-96 w-auto rounded-xl border border-border/60 bg-white object-contain p-1.5 shadow-sm dark:bg-zinc-900"
                                loading="lazy"
                              />
                            ))}
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
      </div>
    </div>,
    document.body
  );
}
