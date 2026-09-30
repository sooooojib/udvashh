"use client";

import { CalendarDays, BookOpen, PenLine } from "lucide-react";
import type { ExamItem } from "@/lib/exams";

const BARS = [
  {
    key: "daily",
    label: "Daily Live Exam",
    icon: CalendarDays,
    iconBg: "bg-[#881337] dark:bg-[#9F1239]",
    trackBg: "bg-[#881337]/12 dark:bg-[#881337]/20",
    fillGradient: "linear-gradient(90deg, #881337, #BE123C)",
    activeText: "text-[#881337] dark:text-[#FDA4AF]",
  },
  {
    key: "weekly",
    label: "Weekly Live Exam",
    icon: BookOpen,
    iconBg: "bg-[#D97706] dark:bg-[#B45309]",
    trackBg: "bg-[#D97706]/12 dark:bg-[#D97706]/20",
    fillGradient: "linear-gradient(90deg, #B45309, #F59E0B)",
    activeText: "text-[#D97706] dark:text-[#FCD34D]",
  },
  {
    key: "written",
    label: "Written Live Exam",
    icon: PenLine,
    iconBg: "bg-[#0D9488] dark:bg-[#0F766E]",
    trackBg: "bg-[#0D9488]/12 dark:bg-[#0D9488]/20",
    fillGradient: "linear-gradient(90deg, #0F766E, #14B8A6)",
    activeText: "text-[#0D9488] dark:text-[#5EEAD4]",
  },
] as const;

interface ExamProgressBarsProps {
  initialExams: ExamItem[];
  userAttempts: Record<string, unknown>;
}

export function ExamProgressBars({ initialExams, userAttempts }: ExamProgressBarsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
      {BARS.map(({ key, label, icon: Icon, iconBg, trackBg, fillGradient, activeText }) => {
        const total = initialExams.filter((e) => e.category === key).length;
        const completed = initialExams.filter((e) => e.category === key && userAttempts[e.id]).length;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

        return (
          <div
            key={key}
            className="flex items-center gap-3.5 rounded-2xl border border-border/50 bg-white dark:bg-[#0D1117] dark:border-[#1F2C34]/80 px-4 py-3.5 shadow-xs"
          >
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg} text-white shadow-xs`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-foreground dark:text-[#E8EDF0] truncate">
                  {label}
                </span>
                <span className="text-xs font-bold tabular-nums text-foreground dark:text-[#E8EDF0] ml-2 shrink-0">
                  <span className={completed > 0 ? activeText : undefined}>{completed}</span>
                  <span className="text-muted-foreground/60 dark:text-[#5C6A72]">/{total}</span>
                </span>
              </div>
              <div className={`relative h-2 w-full rounded-full overflow-hidden ${trackBg}`}>
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${pct}%`, background: fillGradient }}
                />
              </div>
              <div className="flex items-center justify-between mt-1 text-[10px]">
                <span className="text-muted-foreground/60 dark:text-[#5C6A72] font-medium">
                  {pct}% completed
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}