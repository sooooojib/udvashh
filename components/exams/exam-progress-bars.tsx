"use client";

import { BookOpen, CalendarDays, PenLine } from "lucide-react";
import { ExamItem } from "@/lib/exams";

const BARS = [
  { key: "daily",   label: "Daily Live Exam",   icon: CalendarDays, iconBg: "bg-[#3B82F6]", trackBg: "bg-[#3B82F6]/15 dark:bg-[#3B82F6]/10", fillGradient: "linear-gradient(90deg, #2563EB, #60A5FA)" },
  { key: "weekly",  label: "Weekly Live Exam",  icon: BookOpen,    iconBg: "bg-[#8B5CF6]", trackBg: "bg-[#8B5CF6]/15 dark:bg-[#8B5CF6]/10", fillGradient: "linear-gradient(90deg, #7C3AED, #A78BFA)" },
  { key: "written", label: "Written Live Exam", icon: PenLine,     iconBg: "bg-[#F97316]", trackBg: "bg-[#F97316]/15 dark:bg-[#F97316]/10", fillGradient: "linear-gradient(90deg, #EA580C, #FB923C)" },
] as const;

interface ExamProgressBarsProps {
  initialExams: ExamItem[];
  userAttempts: Record<string, unknown>;
}

export function ExamProgressBars({ initialExams, userAttempts }: ExamProgressBarsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
      {BARS.map(({ key, label, icon: Icon, iconBg, trackBg, fillGradient }) => {
        const total     = initialExams.filter((e) => e.category === key).length;
        const completed = initialExams.filter((e) => e.category === key && userAttempts[e.id]).length;
        const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;
        return (
          <div key={key} className="flex items-center gap-3.5 rounded-2xl border border-border/50 bg-card dark:bg-[#0D1117] dark:border-[#1F2C34]/80 px-4 py-3.5 shadow-xs">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg} text-white shadow-sm`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-foreground dark:text-[#E8EDF0] truncate">{label}</span>
                <span className="text-xs font-bold tabular-nums text-foreground dark:text-[#E8EDF0] ml-2 shrink-0">{completed}/{total}</span>
              </div>
              <div className={`relative h-2 w-full rounded-full overflow-hidden ${trackBg}`}>
                <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out" style={{ width: pct + "%", background: fillGradient }} />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground/60 dark:text-[#5C6A72]">{pct}% completed</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}