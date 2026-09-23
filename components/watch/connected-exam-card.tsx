"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  FileQuestion,
  FileText,
  GraduationCap,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExamItem } from "@/lib/exams";
import { ExamModal } from "@/components/exams/exam-modal";

interface ConnectedExamCardProps {
  exam: ExamItem;
  initialAttempt?: {
    score: number;
    total: number;
    selectedAnswers: Record<string, string>;
  } | null;
  className?: string;
}

export function ConnectedExamCard({
  exam,
  initialAttempt,
  className,
}: ConnectedExamCardProps) {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [attempt, setAttempt] = React.useState(initialAttempt || null);

  const isAttempted = !!attempt;

  return (
    <>
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-[#881337]/20 bg-card p-4 sm:p-5 shadow-xs backdrop-blur-md dark:border-[#881337]/30 dark:bg-[#111820] space-y-4 transition-all duration-200 hover:border-[#881337]/35 hover:shadow-sm",
          className
        )}
      >
        {/* ── Exam Title Header: Icon + Title + (Score if completed) ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#881337] text-white shadow-xs">
              <GraduationCap className="h-4.5 w-4.5" />
            </div>
            <h3 className="font-heading text-base sm:text-lg font-bold tracking-tight text-[#27272A] dark:text-[#E8EDF0]">
              {exam.title}
            </h3>
          </div>

          {/* Attempt status or score pill (shown only when completed) */}
          {isAttempted && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shadow-xs shrink-0">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>Completed</span>
              <span className="font-mono text-emerald-700 dark:text-emerald-300">
                • {attempt.score}/{attempt.total} ({Math.round((attempt.score / attempt.total) * 100)}%)
              </span>
            </div>
          )}
        </div>

        {/* ── Exam Meta Details ── */}
        <div className="space-y-2.5 pt-0.5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Subject */}
            <span className="inline-flex items-center gap-1 rounded-lg bg-muted/60 px-2.5 py-1 text-muted-foreground dark:bg-black/40 dark:text-[#9AA7AE] border border-border/40 font-medium">
              <BookOpen className="h-3 w-3 text-[#BE123C] dark:text-[#FDA4AF]" />
              <span>{exam.subject}</span>
            </span>

            {/* Duration */}
            <span className="inline-flex items-center gap-1 rounded-lg bg-muted/60 px-2.5 py-1 text-muted-foreground dark:bg-black/40 dark:text-[#9AA7AE] border border-border/40 font-mono">
              <Clock className="h-3 w-3 text-[#BE123C] dark:text-[#FDA4AF]" />
              <span>{exam.duration}</span>
            </span>

            {/* Question count */}
            <span className="inline-flex items-center gap-1 rounded-lg bg-muted/60 px-2.5 py-1 text-muted-foreground dark:bg-black/40 dark:text-[#9AA7AE] border border-border/40 font-mono">
              <FileQuestion className="h-3 w-3 text-[#BE123C] dark:text-[#FDA4AF]" />
              <span>{exam.totalQuestions} MCQs</span>
            </span>

            {/* PDF Link (if available) */}
            {exam.pdfUrl && (
              <a
                href={exam.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-[#FFF1F2] hover:bg-[#881337] hover:text-white px-2.5 py-1 text-[#881337] dark:bg-[#881337]/20 dark:text-[#FDA4AF] dark:hover:bg-[#881337] dark:hover:text-white border border-[#881337]/20 dark:border-[#881337]/35 transition-colors font-semibold"
              >
                <FileText className="h-3 w-3 text-[#BE123C] dark:text-[#FDA4AF]" />
                <span>Exam PDF</span>
              </a>
            )}
          </div>
        </div>

        {/* ── Actions Row ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-border/40 dark:border-[#1F2C34]/80">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className={cn(
                "group/btn inline-flex items-center justify-center gap-2 rounded-xl py-2 px-4 text-xs font-bold transition-all duration-200 cursor-pointer active:scale-98 shadow-xs",
                isAttempted
                  ? "bg-muted/70 hover:bg-[#FFF1F2] text-[#27272A] border border-border/80 hover:border-[#881337]/30 hover:text-[#881337] dark:bg-[#141E28] dark:text-[#E8EDF0] dark:hover:bg-[#881337]/20 dark:hover:text-[#FDA4AF] dark:hover:border-[#881337]/40 shadow-none"
                  : "text-white bg-[#881337] hover:bg-[#BE123C] shadow-xs active:bg-[#70102e]"
              )}
            >
              {isAttempted ? (
                <>
                  <RotateCcw className="h-3.5 w-3.5 text-[#BE123C] dark:text-[#FDA4AF]" />
                  <span>Review & Retake Exam</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Start Live Exam</span>
                </>
              )}
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/btn:translate-x-1" />
            </button>
          </div>

          <Link
            href="/exams"
            className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-muted-foreground hover:text-[#881337] dark:hover:text-[#FDA4AF] transition-colors py-1 px-2"
          >
            <span>Explore All Exams</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* ── Modal for Direct In-Page Exam Practice ── */}
      {isModalOpen && (
        <ExamModal
          exam={exam}
          initialAttempt={attempt || undefined}
          onClose={() => setIsModalOpen(false)}
          onAttemptSaved={(score, total, selectedAnswers) => {
            setAttempt({ score, total, selectedAnswers });
          }}
        />
      )}
    </>
  );
}
