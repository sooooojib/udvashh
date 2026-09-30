"use client";

import * as React from "react";
import { LatexRenderer } from "./latex-renderer";
import { formatSolution } from "@/lib/format-solution";
import { cn } from "@/lib/utils";
import { Award } from "lucide-react";

interface WrittenQuestionBlock {
  text: string;
  mark: string | null;
}

interface WrittenQuestionRendererProps {
  content?: string | null;
  className?: string;
}

/**
 * Detects whether a line represents question marks/points allocation
 * e.g. "২.৫", "২. ৫", "৫", "১০", "২০", "1 × 5 = 5", "5 × 6 = 30", "15", "[৫]", "(২.৫)"
 */
export function isMarksLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // 1. Bengali / English decimals or integers: 2.5, ২.৫, ২. ৫, 5, ৫, 10, ১০, ২০
  if (/^(\d+|[০-৯]+)(\s*\.\s*(\d+|[০-৯]+))?$/.test(trimmed)) return true;

  // 2. Multiplication / distribution: 1 × 5 = 5, 5 × 6 = 30, ১ × ৫ = ৫, 1x5=5
  if (/^(\d+|[০-৯]+)\s*[x×*]\s*(\d+|[০-৯]+)\s*=\s*(\d+|[০-৯]+)$/i.test(trimmed)) return true;

  // 3. Bracketed marks: [৫], (৫), [২.৫], [10], [1 × 5 = 5]
  if (/^[\[\(](\d+|[০-৯]+)(\s*\.\s*(\d+|[০-৯]+))?[\]\)]$/.test(trimmed)) return true;
  if (/^[\[\(](\d+|[০-৯]+)\s*[x×*]\s*(\d+|[০-৯]+)\s*=\s*(\d+|[০-৯]+)[\]\)]$/i.test(trimmed)) return true;

  // 4. Words: [মান: ৫], নম্বর: ২.৫, [Marks: 5], Marks - 10
  if (/^[\[\(]?(নম্বর|মান|marks)\s*[:=\-]?\s*(\d+|[০-৯]+)(\s*\.\s*(\d+|[০-৯]+))?[\]\)]?$/i.test(trimmed)) return true;
  if (/^[\[\(]?(\d+|[০-৯]+)(\s*\.\s*(\d+|[০-৯]+))?\s*(নম্বর|marks|mark)?[\]\)]?$/i.test(trimmed) && trimmed.length <= 14) return true;

  return false;
}

/**
 * Cleans and normalizes marks strings:
 * "২. ৫" -> "২.৫", "1x5=5" -> "1 × 5 = 5", "[৫]" -> "৫"
 */
export function cleanMarks(raw: string): string {
  let m = raw.trim();
  // Normalize internal spaces in decimals: "২. ৫" -> "২.৫"
  m = m.replace(/([০-৯\d])\s*\.\s*([০-৯\d])/g, "$1.$2");
  // Normalize multiplication: "1x5=5" -> "1 × 5 = 5"
  m = m.replace(/([০-৯\d])\s*[x×*]\s*([০-৯\d])\s*=\s*([০-৯\d])/g, "$1 × $2 = $3");
  // Strip outer brackets if present: "[৫]" -> "৫"
  m = m.replace(/^[\[\(](.*?)[\]\)]$/, "$1").trim();
  // Strip redundant "মান:" or "Marks:" prefix if already in text
  m = m.replace(/^(মান|নম্বর|marks)\s*[:=\-]?\s*/i, "").trim();
  return m;
}

/**
 * Parses written question text into blocks where each sub-question
 * is paired with its designated marks badge.
 */
export function parseWrittenContent(rawText?: string | null): WrittenQuestionBlock[] {
  if (!rawText) return [];

  const lines = rawText.split("\n");
  const blocks: WrittenQuestionBlock[] = [];
  let currentTextLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isMarksLine(line)) {
      const mark = cleanMarks(line);
      const text = currentTextLines.join("\n").trim();
      blocks.push({ text, mark });
      currentTextLines = [];
    } else {
      currentTextLines.push(line);
    }
  }

  const remaining = currentTextLines.join("\n").trim();
  if (remaining) {
    blocks.push({ text: remaining, mark: null });
  }

  return blocks;
}

export function WrittenQuestionRenderer({
  content,
  className,
}: WrittenQuestionRendererProps) {
  const blocks = React.useMemo(() => parseWrittenContent(content), [content]);

  if (!blocks || blocks.length === 0) {
    return null;
  }

  // If there's only 1 block with no mark, render directly with LatexRenderer
  if (blocks.length === 1 && !blocks[0].mark) {
    return (
      <LatexRenderer
        content={formatSolution(blocks[0].text)}
        as="div"
        className={cn(
          "text-sm sm:text-base md:text-lg leading-relaxed text-[#27272A] dark:text-[#E8EDF0] whitespace-pre-wrap",
          className
        )}
      />
    );
  }

  return (
    <div className={cn("space-y-3.5 sm:space-y-4", className)}>
      {blocks.map((block, idx) => {
        const isBengali = /[০-৯]/.test(block.mark || "") || /[\u0980-\u09FF]/.test(block.text);
        const marksLabel = isBengali ? "মান:" : "Marks:";

        return (
          <div
            key={idx}
            className="group relative rounded-xl border border-border/50 bg-card/60 dark:bg-[#141E28]/40 p-3 sm:p-4.5 transition-all duration-200 hover:border-[#881337]/35 dark:hover:border-[#FDA4AF]/25 hover:bg-card/90 dark:hover:bg-[#141E28]/70"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 sm:gap-4">
              {/* Sub-question Text */}
              <div className="flex-1 min-w-0">
                <LatexRenderer
                  content={formatSolution(block.text)}
                  as="div"
                  className="text-sm sm:text-base md:text-lg leading-relaxed text-[#27272A] dark:text-[#E8EDF0] whitespace-pre-wrap font-normal"
                />
              </div>

              {/* Marks Item / Badge */}
              {block.mark && (
                <div className="shrink-0 self-end sm:self-start pt-0.5">
                  <span
                    className="exam-marks-badge"
                    title={`Marks: ${block.mark}`}
                  >
                    <Award className="h-3.5 w-3.5 opacity-80 shrink-0 text-[#881337] dark:text-[#FDA4AF]" />
                    <span className="marks-label">{marksLabel}</span>
                    <span className="marks-value">{block.mark}</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
