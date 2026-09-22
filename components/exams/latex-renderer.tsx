"use client";

import * as React from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface LatexRendererProps {
  content: string;
  className?: string;
  as?: React.ElementType;
}

interface ParsedToken {
  type: "text" | "math";
  content?: string;
  html?: string;
  isBlock?: boolean;
}

export function LatexRenderer({
  content,
  className,
  as: Component = "span",
}: LatexRendererProps) {
  const tokens = React.useMemo(() => {
    if (!content) return [];

    // Normalize non-breaking spaces
    const normalized = content.replace(/\u00a0/g, " ");

    // Quick check: if no math delimiters, return single text token
    if (
      !normalized.includes("\\(") &&
      !normalized.includes("\\[") &&
      !normalized.includes("$$") &&
      !normalized.includes("$")
    ) {
      return [{ type: "text" as const, content: normalized }];
    }

    // Regex matching:
    // 1. \\[ ... \\] (display math block)
    // 2. $$ ... $$ (display math block)
    // 3. \\( ... \\) (inline math)
    // 4. $ ... $ (inline math)
    const regex =
      /(\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$|\\\([\s\S]*?\\\)|\$(?!\$)[\s\S]*?\$)/g;

    const result: ParsedToken[] = [];
    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(normalized)) !== null) {
      if (match.index > lastIdx) {
        result.push({
          type: "text",
          content: normalized.slice(lastIdx, match.index),
        });
      }

      const raw = match[0];
      let isBlock = false;
      let math = "";

      if (raw.startsWith("\\[") && raw.endsWith("\\]")) {
        isBlock = true;
        math = raw.slice(2, -2);
      } else if (raw.startsWith("$$") && raw.endsWith("$$")) {
        isBlock = true;
        math = raw.slice(2, -2);
      } else if (raw.startsWith("\\(") && raw.endsWith("\\)")) {
        isBlock = false;
        math = raw.slice(2, -2);
      } else if (raw.startsWith("$") && raw.endsWith("$")) {
        isBlock = false;
        math = raw.slice(1, -1);
      }

      let cleanMath = math.trim();
      // Remove trailing backslashes left by portal space escaping like "\ \)"
      while (cleanMath.endsWith("\\")) {
        cleanMath = cleanMath.slice(0, -1).trim();
      }
      // Escape unescaped dollar signs in math mode (e.g. keyboard symbols)
      cleanMath = cleanMath.replace(/(^|[^\\])\$/g, "$1\\$");

      if (!cleanMath) {
        lastIdx = regex.lastIndex;
        continue;
      }

      try {
        const html = katex.renderToString(cleanMath, {
          displayMode: isBlock,
          throwOnError: false,
          strict: false,
        });
        result.push({ type: "math", html, isBlock });
      } catch {
        result.push({ type: "text", content: raw });
      }

      lastIdx = regex.lastIndex;
    }

    if (lastIdx < normalized.length) {
      result.push({
        type: "text",
        content: normalized.slice(lastIdx),
      });
    }

    return result;
  }, [content]);

  if (!content) return null;

  return (
    <Component className={className}>
      {tokens.map((token, idx) => {
        if (token.type === "math" && token.html) {
          if (token.isBlock) {
            return (
              <span
                key={idx}
                className="my-1.5 block overflow-x-auto overflow-y-hidden text-center"
                dangerouslySetInnerHTML={{ __html: token.html }}
              />
            );
          }
          return (
            <span
              key={idx}
              className="inline-math inline-block align-middle"
              dangerouslySetInnerHTML={{ __html: token.html }}
            />
          );
        }

        // Text token: split by newline to preserve line breaks
        const lines = (token.content || "").split("\n");
        return (
          <React.Fragment key={idx}>
            {lines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {lIdx > 0 && <br />}
                {line}
              </React.Fragment>
            ))}
          </React.Fragment>
        );
      })}
    </Component>
  );
}
