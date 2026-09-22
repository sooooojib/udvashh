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
          "relative overflow-hidden rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-500/[0.04] via-card to-card p-4 sm:p-5 shadow-sm backdrop-blur-md dark:border-rose-500/25 dark:bg-[#111820] space-y-4 transition-all duration-200 hover:border-rose-500/40 hover:shadow-md",
          className
        )}
      >
        {/* ── Exam Title Header: Icon + Title + (Score if completed) ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 via-rose-500 to-red-600 text-white shadow-md shadow-red-500/25">
              <GraduationCap className="h-4.5 w-4.5" />
            </div>
            <h3 className="font-heading text-base sm:text-lg font-bold tracking-tight text-foreground dark:text-[#E8EDF0]">
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
              <BookOpen className="h-3 w-3 text-rose-500" />
              <span>{exam.subject}</span>
            </span>

            {/* Duration */}
            <span className="inline-flex items-center gap-1 rounded-lg bg-muted/60 px-2.5 py-1 text-muted-foreground dark:bg-black/40 dark:text-[#9AA7AE] border border-border/40 font-mono">
              <Clock className="h-3 w-3 text-rose-500" />
              <span>{exam.duration}</span>
            </span>

            {/* Question count */}
            <span className="inline-flex items-center gap-1 rounded-lg bg-muted/60 px-2.5 py-1 text-muted-foreground dark:bg-black/40 dark:text-[#9AA7AE] border border-border/40 font-mono">
              <FileQuestion className="h-3 w-3 text-rose-500" />
              <span>{exam.totalQuestions} MCQs</span>
            </span>

            {/* PDF Link (if available) */}
            {exam.pdfUrl && (
              <a
                href={exam.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1 text-rose-600 dark:text-rose-400 border border-red-500/25 transition-colors font-semibold"
              >
                <FileText className="h-3 w-3 text-rose-500" />
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
                "group/btn inline-flex items-center justify-center gap-2 rounded-xl py-2 px-4 text-xs font-bold transition-all duration-200 cursor-pointer active:scale-98 shadow-md",
                isAttempted
                  ? "bg-muted/80 hover:bg-muted text-foreground border border-border/80 dark:border-[#1F2C34] hover:border-rose-500/40 hover:text-rose-600 dark:hover:text-rose-400 shadow-none"
                  : "text-white bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:via-rose-500 hover:to-rose-500 shadow-red-600/20"
              )}
            >
              {isAttempted ? (
                <>
                  <RotateCcw className="h-3.5 w-3.5 text-rose-500" />
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
            className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 transition-colors py-1 px-2"
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
