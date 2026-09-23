"use client";

import * as React from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileQuestion,
  FileText,
  Filter,
  Flame,
  Layers,
  Tv,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ExamItem, SUBJECTS, SubjectType } from "@/lib/exams";
import { ExamModal } from "@/components/exams/exam-modal";

interface ExamHubProps {
  initialExams: ExamItem[];
  initialUserAttempts?: Record<
    string,
    { score: number; total: number; selectedAnswers: Record<string, string> }
  >;
}

export function ExamHub({ initialExams, initialUserAttempts }: ExamHubProps) {
  const [selectedType, setSelectedType] = React.useState<"all" | "daily" | "weekly" | "written">("all");
  const [selectedSubject, setSelectedSubject] = React.useState<string>("all");
  const [activeExam, setActiveExam] = React.useState<ExamItem | null>(null);
  const [userAttempts, setUserAttempts] = React.useState<
    Record<string, { score: number; total: number; selectedAnswers: Record<string, string> }>
  >(initialUserAttempts || {});

  const [isTypeOpen, setIsTypeOpen] = React.useState(false);
  const [isSubjectOpen, setIsSubjectOpen] = React.useState(false);
  const typeDropdownRef = React.useRef<HTMLDivElement>(null);
  const subjectDropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside or pressing Escape
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        typeDropdownRef.current &&
        !typeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsTypeOpen(false);
      }
      if (
        subjectDropdownRef.current &&
        !subjectDropdownRef.current.contains(event.target as Node)
      ) {
        setIsSubjectOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsTypeOpen(false);
        setIsSubjectOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Helper labels & icons
  const getTypeLabel = (type: "all" | "daily" | "weekly" | "written") => {
    switch (type) {
      case "daily":
        return "Daily Live Exams";
      case "weekly":
        return "Weekly Exams";
      case "written":
        return "Written Exams";
      default:
        return "All Exam Types";
    }
  };

  const getTypeIcon = (type: "all" | "daily" | "weekly" | "written") => {
    switch (type) {
      case "daily":
        return <Tv className="h-3.5 w-3.5" />;
      case "weekly":
        return <Flame className="h-3.5 w-3.5" />;
      case "written":
        return <FileText className="h-3.5 w-3.5" />;
      default:
        return <Layers className="h-3.5 w-3.5" />;
    }
  };

  // Dynamic counts for type filter tabs
  const counts = React.useMemo(() => {
    return {
      all: initialExams.length,
      daily: initialExams.filter((e) => e.category === "daily").length,
      weekly: initialExams.filter((e) => e.category === "weekly").length,
      written: initialExams.filter((e) => e.category === "written").length,
    };
  }, [initialExams]);

  // Exams matching selected type
  const typeFilteredExams = React.useMemo(() => {
    if (selectedType === "all") return initialExams;
    return initialExams.filter((e) => e.category === selectedType);
  }, [initialExams, selectedType]);

  // Subject list with counts tailored dynamically to the active exam type
  const subjectList = React.useMemo(() => {
    const countsMap = new Map<string, number>();
    typeFilteredExams.forEach((exam) => {
      const sub = exam.subject || "Comprehensive";
      countsMap.set(sub, (countsMap.get(sub) || 0) + 1);
    });

    const ordered: { name: string; count: number }[] = [];

    // Predefined subjects that exist in this type
    SUBJECTS.forEach((sub) => {
      const count = countsMap.get(sub);
      if (count && count > 0) {
        ordered.push({ name: sub, count });
      }
    });

    // Comprehensive if exists
    if (countsMap.has("Comprehensive")) {
      ordered.push({
        name: "Comprehensive",
        count: countsMap.get("Comprehensive")!,
      });
    }

    // Any other subjects
    countsMap.forEach((count, sub) => {
      if (sub !== "Comprehensive" && !SUBJECTS.includes(sub as any)) {
        ordered.push({ name: sub, count });
      }
    });

    return ordered;
  }, [typeFilteredExams]);

  // If selected subject is not in the new subjectList, automatically reset to 'all'
  React.useEffect(() => {
    if (
      selectedSubject !== "all" &&
      !subjectList.some((s) => s.name === selectedSubject)
    ) {
      setSelectedSubject("all");
    }
  }, [subjectList, selectedSubject]);

  // Filtered exams (applies subject filter on top of typeFilteredExams)
  const filteredExams = React.useMemo(() => {
    if (selectedSubject === "all") return typeFilteredExams;
    return typeFilteredExams.filter((exam) => exam.subject === selectedSubject);
  }, [typeFilteredExams, selectedSubject]);

  return (
    <div className="space-y-6">
      {/* ── Filter Bar with Sleek Scrollable Dropdowns (Image 2 style) ── */}
      <div className="relative border-b border-border/40 pb-5 dark:border-[#1F2C34]/80">
        <div className="flex flex-col gap-3.5 md:flex-row md:items-center md:justify-between">
          {/* Section Indicator Label */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFF1F2] text-[#881337] border border-[#881337]/20 dark:bg-[#881337]/20 dark:text-[#FDA4AF] dark:border-[#881337]/35 shadow-xs">
              <Filter className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground dark:text-[#9AA7AE]">
                Filter Exams
              </span>
              <p className="text-xs text-muted-foreground/70 dark:text-[#5C6A72]">
                Showing {filteredExams.length} of {typeFilteredExams.length} {selectedType === "all" ? "live exams" : getTypeLabel(selectedType).toLowerCase()}
                {Object.keys(userAttempts).length > 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold ml-1.5">
                    • {Object.keys(userAttempts).length} completed
                  </span>
                )}
                {(selectedType !== "all" || selectedSubject !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedType("all");
                      setSelectedSubject("all");
                    }}
                    className="ml-2 text-[#BE123C] hover:text-[#881337] dark:text-[#FDA4AF] dark:hover:text-[#FFE4E6] font-semibold cursor-pointer"
                  >
                    Reset filters
                  </button>
                )}
              </p>
            </div>
          </div>

          {/* Interactive Dropdown Boxes: Exam Type & Subject */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
            {/* 1. Exam Type Dropdown */}
            <div className="relative min-w-0 w-full sm:w-56 md:w-60" ref={typeDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setIsTypeOpen((prev) => !prev);
                  setIsSubjectOpen(false);
                }}
                aria-expanded={isTypeOpen}
                aria-haspopup="listbox"
                className={cn(
                  "flex w-full items-center justify-between gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs font-medium transition-all duration-200 min-h-[46px] select-none text-left active:scale-[0.99] cursor-pointer",
                  isTypeOpen
                    ? "border-[#881337] bg-card ring-2 ring-[#881337]/15 dark:border-[#BE123C] dark:bg-[#111820]"
                    : selectedType !== "all"
                    ? "border-[#881337]/40 bg-[#FFF1F2] text-[#27272A] dark:border-[#881337]/50 dark:bg-[#881337]/15 dark:text-[#E8EDF0] shadow-2xs"
                    : "border-border/70 bg-card/90 hover:border-[#881337]/40 hover:bg-card dark:border-[#1F2C34] dark:bg-[#111820] dark:hover:border-[#BE123C]/50 shadow-2xs"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#FFF1F2] text-[#881337] border border-[#881337]/15 dark:bg-[#881337]/25 dark:text-[#FDA4AF] dark:border-[#881337]/35">
                    {getTypeIcon(selectedType)}
                  </div>

                  <span className="truncate font-semibold text-foreground dark:text-[#E8EDF0]">
                    {getTypeLabel(selectedType)}
                  </span>

                  <span className="shrink-0 rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground dark:bg-[#141E28] dark:text-[#9AA7AE]">
                    ({counts[selectedType]})
                  </span>
                </div>

                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                    isTypeOpen && "rotate-180 text-[#881337] dark:text-[#FDA4AF]"
                  )}
                />
              </button>

              {/* Exam Type Popover */}
              {isTypeOpen && (
                <div
                  role="listbox"
                  className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-80 overflow-y-auto rounded-2xl border border-border/80 bg-card/95 p-1.5 shadow-2xl backdrop-blur-xl animate-fade-in-up dark:border-[#1F2C34] dark:bg-[#111820]/95"
                >
                  {/* All Types */}
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedType === "all"}
                    onClick={() => {
                      setSelectedType("all");
                      setSelectedSubject("all");
                      setIsTypeOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-xs transition-all duration-150 text-left min-h-[42px] cursor-pointer",
                      selectedType === "all"
                        ? "bg-[#FFF1F2] text-[#881337] font-semibold border border-[#881337]/20 dark:bg-[#881337]/25 dark:text-[#FFE4E6] dark:border-[#881337]/40"
                        : "text-[#27272A] hover:bg-[#FFF1F2]/60 dark:text-[#E8EDF0] dark:hover:bg-[#141E28]"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Layers className="h-3.5 w-3.5 shrink-0 text-[#881337] dark:text-[#FDA4AF]" />
                      <span className="truncate">All Exam Types</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[11px] opacity-75">
                        ({counts.all} exams)
                      </span>
                      {selectedType === "all" && (
                        <Check className="h-3.5 w-3.5 text-[#881337] dark:text-[#FDA4AF]" />
                      )}
                    </div>
                  </button>

                  <div className="my-1 border-t border-border/40 dark:border-[#1F2C34]/60" />

                  {/* Daily Live Exams */}
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedType === "daily"}
                    onClick={() => {
                      setSelectedType("daily");
                      setSelectedSubject("all");
                      setIsTypeOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-xs transition-all duration-150 text-left min-h-[42px] cursor-pointer",
                      selectedType === "daily"
                        ? "bg-[#FFF1F2] text-[#881337] font-semibold border border-[#881337]/20 dark:bg-[#881337]/25 dark:text-[#FFE4E6] dark:border-[#881337]/40"
                        : "text-[#27272A] hover:bg-[#FFF1F2]/60 dark:text-[#E8EDF0] dark:hover:bg-[#141E28]"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Tv className="h-3.5 w-3.5 shrink-0 text-[#881337] dark:text-[#FDA4AF]" />
                      <span className="truncate">Daily Live Exams</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[11px] opacity-75">
                        ({counts.daily})
                      </span>
                      {selectedType === "daily" && (
                        <Check className="h-3.5 w-3.5 text-[#881337] dark:text-[#FDA4AF]" />
                      )}
                    </div>
                  </button>

                  {/* Weekly Exams */}
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedType === "weekly"}
                    onClick={() => {
                      setSelectedType("weekly");
                      setSelectedSubject("all");
                      setIsTypeOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-xs transition-all duration-150 text-left min-h-[42px] cursor-pointer",
                      selectedType === "weekly"
                        ? "bg-[#FFF1F2] text-[#881337] font-semibold border border-[#881337]/20 dark:bg-[#881337]/25 dark:text-[#FFE4E6] dark:border-[#881337]/40"
                        : "text-[#27272A] hover:bg-[#FFF1F2]/60 dark:text-[#E8EDF0] dark:hover:bg-[#141E28]"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Flame className="h-3.5 w-3.5 shrink-0 text-[#881337] dark:text-[#FDA4AF]" />
                      <span className="truncate">Weekly Exams</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[11px] opacity-75">
                        ({counts.weekly})
                      </span>
                      {selectedType === "weekly" && (
                        <Check className="h-3.5 w-3.5 text-[#881337] dark:text-[#FDA4AF]" />
                      )}
                    </div>
                  </button>

                  {/* Written Exams */}
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedType === "written"}
                    onClick={() => {
                      setSelectedType("written");
                      setSelectedSubject("all");
                      setIsTypeOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-xs transition-all duration-150 text-left min-h-[42px] cursor-pointer",
                      selectedType === "written"
                        ? "bg-[#FFF1F2] text-[#881337] font-semibold border border-[#881337]/20 dark:bg-[#881337]/25 dark:text-[#FFE4E6] dark:border-[#881337]/40"
                        : "text-[#27272A] hover:bg-[#FFF1F2]/60 dark:text-[#E8EDF0] dark:hover:bg-[#141E28]"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-[#881337] dark:text-[#FDA4AF]" />
                      <span className="truncate">Written Exams</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[11px] opacity-75">
                        ({counts.written})
                      </span>
                      {selectedType === "written" && (
                        <Check className="h-3.5 w-3.5 text-[#881337] dark:text-[#FDA4AF]" />
                      )}
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* 2. Subject Dropdown (Matching Image 2 style) */}
            <div className="relative min-w-0 w-full sm:w-64 md:w-72" ref={subjectDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setIsSubjectOpen((prev) => !prev);
                  setIsTypeOpen(false);
                }}
                aria-expanded={isSubjectOpen}
                aria-haspopup="listbox"
                className={cn(
                  "flex w-full items-center justify-between gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs font-medium transition-all duration-200 min-h-[46px] select-none text-left active:scale-[0.99] cursor-pointer",
                  isSubjectOpen
                    ? "border-[#881337] bg-card ring-2 ring-[#881337]/15 dark:border-[#BE123C] dark:bg-[#111820]"
                    : selectedSubject !== "all"
                    ? "border-[#881337]/40 bg-[#FFF1F2] text-[#27272A] dark:border-[#881337]/50 dark:bg-[#881337]/15 dark:text-[#E8EDF0] shadow-2xs"
                    : "border-border/70 bg-card/90 hover:border-[#881337]/40 hover:bg-card dark:border-[#1F2C34] dark:bg-[#111820] dark:hover:border-[#BE123C]/50 shadow-2xs"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#FFF1F2] text-[#881337] border border-[#881337]/15 dark:bg-[#881337]/25 dark:text-[#FDA4AF] dark:border-[#881337]/35">
                    {selectedSubject === "all" ? (
                      <Layers className="h-3.5 w-3.5" />
                    ) : (
                      <BookOpen className="h-3.5 w-3.5" />
                    )}
                  </div>

                  <span className="truncate font-semibold text-foreground dark:text-[#E8EDF0]">
                    {selectedSubject === "all" ? "All Subjects" : selectedSubject}
                  </span>

                  <span className="shrink-0 rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground dark:bg-[#141E28] dark:text-[#9AA7AE]">
                    {selectedSubject === "all"
                      ? `(${subjectList.length})`
                      : `(${subjectList.find((s) => s.name === selectedSubject)?.count ?? 0})`}
                  </span>
                </div>

                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                    isSubjectOpen && "rotate-180 text-[#881337] dark:text-[#FDA4AF]"
                  )}
                />
              </button>

              {/* Subject Popover Menu with Scroll Options (Image 2 style) */}
              {isSubjectOpen && (
                <div
                  role="listbox"
                  className="absolute left-0 right-0 sm:right-0 sm:left-auto sm:w-80 top-full z-50 mt-1.5 max-h-80 overflow-y-auto rounded-2xl border border-border/80 bg-card/95 p-1.5 shadow-2xl backdrop-blur-xl animate-fade-in-up dark:border-[#1F2C34] dark:bg-[#111820]/95"
                >
                  {/* All Subjects Option */}
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedSubject === "all"}
                    onClick={() => {
                      setSelectedSubject("all");
                      setIsSubjectOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-xs transition-all duration-150 text-left min-h-[42px] cursor-pointer",
                      selectedSubject === "all"
                        ? "bg-[#FFF1F2] text-[#881337] font-semibold border border-[#881337]/20 dark:bg-[#881337]/25 dark:text-[#FFE4E6] dark:border-[#881337]/40"
                        : "text-[#27272A] hover:bg-[#FFF1F2]/60 dark:text-[#E8EDF0] dark:hover:bg-[#141E28]"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Layers className="h-3.5 w-3.5 shrink-0 text-[#881337] dark:text-[#FDA4AF]" />
                      <span className="truncate font-semibold">All Subjects</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[11px] opacity-75">
                        ({subjectList.length} {subjectList.length === 1 ? "subject" : "subjects"} • {typeFilteredExams.length} exams)
                      </span>
                      {selectedSubject === "all" && (
                        <Check className="h-3.5 w-3.5 text-[#881337] dark:text-[#FDA4AF]" />
                      )}
                    </div>
                  </button>

                  <div className="my-1 border-t border-border/40 dark:border-[#1F2C34]/60" />

                  {/* Individual Subjects List with Scroll */}
                  {subjectList.map((sub) => {
                    const isSelected = selectedSubject === sub.name;
                    return (
                      <button
                        key={sub.name}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          setSelectedSubject(sub.name);
                          setIsSubjectOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-xs transition-all duration-150 text-left min-h-[42px] cursor-pointer",
                          isSelected
                            ? "bg-[#FFF1F2] text-[#881337] font-semibold border border-[#881337]/20 dark:bg-[#881337]/25 dark:text-[#FFE4E6] dark:border-[#881337]/40"
                            : "text-[#27272A] hover:bg-[#FFF1F2]/60 dark:text-[#E8EDF0] dark:hover:bg-[#141E28]"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <BookOpen className="h-3.5 w-3.5 shrink-0 opacity-60 text-[#881337] dark:text-[#FDA4AF]" />
                          <span className="truncate">{sub.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-[11px] opacity-75">
                            ({sub.count})
                          </span>
                          {isSelected && (
                            <Check className="h-3.5 w-3.5 text-[#881337] dark:text-[#FDA4AF]" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Exams Grid ── */}
      {filteredExams.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 p-12 text-center space-y-3 dark:border-[#1F2C34]">
          <BookOpen className="h-10 w-10 text-muted-foreground/50" />
          <div className="space-y-1">
            <h3 className="font-heading font-bold text-base text-foreground dark:text-[#E8EDF0]">
              No exams found
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              No exams match your current filters. Try changing your subject filter or search term.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredExams.map((exam) => {
            const isDaily = exam.category === "daily";
            const isWeekly = exam.category === "weekly";
            const isWritten = exam.category === "written";
            const attempt = userAttempts[exam.id];
            const isAttempted = !!attempt;

            return (
              <div
                key={exam.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-white p-4.5 space-y-4 shadow-xs backdrop-blur-md transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-[#881337]/35 dark:border-[#1F2C34] dark:bg-[#111820] dark:hover:border-[#881337]/45"
              >
                {/* Header Row: Type Badge + Subject Tag */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-[#FFF1F2] text-[#881337] border border-[#881337]/15 dark:bg-[#881337]/20 dark:text-[#FDA4AF] dark:border-[#881337]/30">
                      {isDaily ? (
                        <>
                          <Tv className="h-2.5 w-2.5 text-[#881337] dark:text-[#FDA4AF]" />
                          <span>Daily Live</span>
                        </>
                      ) : isWeekly ? (
                        <>
                          <Flame className="h-2.5 w-2.5 text-[#881337] dark:text-[#FDA4AF]" />
                          <span>Weekly Live</span>
                        </>
                      ) : (
                        <>
                          <FileText className="h-2.5 w-2.5 text-[#881337] dark:text-[#FDA4AF]" />
                          <span>Written Biweekly</span>
                        </>
                      )}
                    </span>

                    <span className="text-[11px] font-semibold text-muted-foreground/80 truncate max-w-[130px]">
                      {exam.subject}
                    </span>
                  </div>

                  {/* Title: Dark Charcoal Text with Burgundy Hover */}
                  <h3 className="font-heading text-sm sm:text-base font-bold tracking-tight text-[#27272A] dark:text-[#E8EDF0] line-clamp-2 leading-snug transition-colors group-hover:text-[#881337] dark:group-hover:text-[#FDA4AF]">
                    {exam.title}
                  </h3>
                </div>

                {/* Status Badges Row (Duration + Total Questions) */}
                <div className="space-y-3 pt-2 border-t border-border/40 dark:border-[#1F2C34]/80">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Duration Badge */}
                    <div className="flex items-center gap-1.5 rounded-lg bg-muted/30 p-2 dark:bg-[#0A0F12]/60 border border-border/40 dark:border-[#1F2C34]">
                      <Clock className="h-3.5 w-3.5 text-[#BE123C] dark:text-[#FDA4AF] shrink-0" />
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-muted-foreground">Duration</span>
                        <span className="font-mono text-xs font-bold text-[#27272A] dark:text-[#E8EDF0]">
                          {exam.duration}
                        </span>
                      </div>
                    </div>

                    {/* Total Questions Badge */}
                    <div className="flex items-center gap-1.5 rounded-lg bg-muted/30 p-2 dark:bg-[#0A0F12]/60 border border-border/40 dark:border-[#1F2C34]">
                      <FileQuestion className="h-3.5 w-3.5 text-[#BE123C] dark:text-[#FDA4AF] shrink-0" />
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-muted-foreground">Questions</span>
                        <span className="font-mono text-xs font-bold text-[#27272A] dark:text-[#E8EDF0]">
                          {isWritten ? "Written" : `${exam.totalQuestions} MCQs`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* User Score & Completion Badge (if attempted) */}
                  {isAttempted && (
                    <div className="flex items-center justify-between text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                      <span className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        Completed
                      </span>
                      <span className="font-mono font-bold">
                        Score: {attempt.score}/{attempt.total} ({Math.round((attempt.score / attempt.total) * 100)}%)
                      </span>
                    </div>
                  )}

                  {/* Action CTA Button: Burgundy (#881337) with Crimson Hover (#BE123C) */}
                  <button
                    type="button"
                    onClick={() => setActiveExam(exam)}
                    className={cn(
                      "group/btn w-full inline-flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-bold transition-all duration-200 cursor-pointer active:scale-98 shadow-xs",
                      isAttempted
                        ? "bg-muted/70 hover:bg-[#FFF1F2] text-[#27272A] border border-border/80 hover:border-[#881337]/30 hover:text-[#881337] dark:bg-[#141E28] dark:text-[#E8EDF0] dark:hover:bg-[#881337]/20 dark:hover:text-[#FDA4AF] dark:hover:border-[#881337]/40 shadow-none"
                        : "text-white bg-[#881337] hover:bg-[#BE123C] shadow-xs active:bg-[#70102e]"
                    )}
                  >
                    <span>{isAttempted ? "Review & Retake" : "View Exam & Solutions"}</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/btn:translate-x-1" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Question & Solution Modal ── */}
      <ExamModal
        exam={activeExam}
        initialAttempt={activeExam ? userAttempts[activeExam.id] : undefined}
        onClose={() => setActiveExam(null)}
        onAttemptSaved={(score, total, selectedAnswers) => {
          if (activeExam) {
            setUserAttempts((prev) => ({
              ...prev,
              [activeExam.id]: { score, total, selectedAnswers },
            }));
          }
        }}
      />
    </div>
  );
}
