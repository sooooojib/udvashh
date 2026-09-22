"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  href?: string;
}

const themeStyles = {
  teal: {
    svg: "text-teal-600 dark:text-[#25A8A2]",
    text: "text-teal-600 dark:text-[#25A8A2]",
    hover: "group-hover:text-teal-700 dark:group-hover:text-[#38D2CB]",
    glow: "dark:drop-shadow-[0_0_10px_rgba(37,168,162,0.35)] dark:group-hover:drop-shadow-[0_0_16px_rgba(37,168,162,0.6)]",
  },
  emerald: {
    svg: "text-emerald-600 dark:text-emerald-400",
    text: "text-emerald-600 dark:text-emerald-400",
    hover: "group-hover:text-emerald-700 dark:group-hover:text-emerald-300",
    glow: "dark:drop-shadow-[0_0_10px_rgba(16,185,129,0.35)] dark:group-hover:drop-shadow-[0_0_16px_rgba(16,185,129,0.6)]",
  },
  amber: {
    svg: "text-amber-600 dark:text-amber-400",
    text: "text-amber-600 dark:text-amber-400",
    hover: "group-hover:text-amber-700 dark:group-hover:text-amber-300",
    glow: "dark:drop-shadow-[0_0_10px_rgba(245,158,11,0.35)] dark:group-hover:drop-shadow-[0_0_16px_rgba(245,158,11,0.6)]",
  },
  blue: {
    svg: "text-blue-600 dark:text-blue-400",
    text: "text-blue-600 dark:text-blue-400",
    hover: "group-hover:text-blue-700 dark:group-hover:text-blue-300",
    glow: "dark:drop-shadow-[0_0_10px_rgba(59,130,246,0.35)] dark:group-hover:drop-shadow-[0_0_16px_rgba(59,130,246,0.6)]",
  },
  purple: {
    svg: "text-purple-600 dark:text-purple-400",
    text: "text-purple-600 dark:text-purple-400",
    hover: "group-hover:text-purple-700 dark:group-hover:text-purple-300",
    glow: "dark:drop-shadow-[0_0_10px_rgba(168,85,247,0.35)] dark:group-hover:drop-shadow-[0_0_16px_rgba(168,85,247,0.6)]",
  },
  red: {
    svg: "text-rose-600 dark:text-rose-400",
    text: "bg-gradient-to-r from-red-600 via-rose-500 to-red-600 bg-clip-text text-transparent dark:from-red-400 dark:via-rose-400 dark:to-red-400",
    hover: "group-hover:opacity-90",
    glow: "dark:drop-shadow-[0_0_12px_rgba(225,29,72,0.45)] dark:group-hover:drop-shadow-[0_0_18px_rgba(244,63,94,0.7)]",
  },
} as const;

export function BrandLogo({ className, href = "/dashboard" }: BrandLogoProps) {
  const pathname = usePathname() || "";
  const [watchModule, setWatchModule] = React.useState<string | null>(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.dataset.currentModule || null;
    }
    return null;
  });

  React.useEffect(() => {
    if (typeof document !== "undefined" && document.documentElement.dataset.currentModule) {
      setWatchModule(document.documentElement.dataset.currentModule);
    }

    const handleModule = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setWatchModule(customEvent.detail);
    };

    window.addEventListener("app:module", handleModule);
    return () => window.removeEventListener("app:module", handleModule);
  }, []);

  React.useEffect(() => {
    if (!pathname.startsWith("/watch")) {
      setWatchModule(null);
      if (typeof document !== "undefined") {
        delete document.documentElement.dataset.currentModule;
      }
    }
  }, [pathname]);

  let activeTheme: keyof typeof themeStyles = "teal";

  if (pathname.startsWith("/live-classes")) {
    activeTheme = "emerald";
  } else if (pathname.startsWith("/intensive-classes")) {
    activeTheme = "amber";
  } else if (pathname.startsWith("/subject-hacks")) {
    activeTheme = "blue";
  } else if (pathname.startsWith("/exams")) {
    activeTheme = "red";
  } else if (pathname.startsWith("/watch")) {
    if (watchModule === "intensive") activeTheme = "amber";
    else if (watchModule === "subject-hacks") activeTheme = "blue";
    else if (watchModule === "live") activeTheme = "emerald";
  }

  const t = themeStyles[activeTheme];

  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2.5 cursor-pointer select-none transition-all duration-200 hover:scale-105 active:scale-95",
        className
      )}
      aria-label="অবনতি Home"
    >
      {/* Bamboo Logo SVG */}
      <svg
        width="28"
        height="28"
        viewBox="0 0 380 440"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          "h-7 w-7 shrink-0 overflow-visible transition-colors duration-200 drop-shadow-sm",
          t.svg,
          t.hover,
          t.glow
        )}
      >
        {/* Bamboo Stalks */}
        <g fill="currentColor" stroke="currentColor" strokeWidth="1" opacity="0.6">
          <rect x="92" y="60" width="22" height="370" rx="4" />
          <rect x="172" y="20" width="28" height="410" rx="5" />
          <rect x="262" y="90" width="20" height="340" rx="4" />
        </g>
        {/* Bamboo Nodes */}
        <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.8">
          <path d="M90 110h26M90 170h26M90 230h26M90 290h26M90 350h26" />
          <path d="M169 70h34M169 130h34M169 190h34M169 250h34M169 310h34M169 370h34" />
          <path d="M260 140h24M260 200h24M260 260h24M260 320h24M260 380h24" />
        </g>
        {/* Bamboo Leaves */}
        <g fill="currentColor" stroke="currentColor" strokeWidth="1" opacity="0.85">
          <path d="M114 170 Q150 140 190 150 Q150 175 114 170Z" />
          <path d="M114 230 Q140 215 165 235 Q135 240 114 230Z" />
          <path d="M92 110 Q55 85 25 95 Q55 120 92 110Z" />
          <path d="M92 290 Q60 265 30 275 Q60 300 92 290Z" />
          <path d="M200 130 Q240 100 285 112 Q240 140 200 130Z" />
          <path d="M200 250 Q235 225 270 235 Q235 262 200 250Z" />
          <path d="M172 190 Q135 165 105 175 Q140 200 172 190Z" />
          <path d="M282 200 Q315 175 350 185 Q315 212 282 200Z" />
          <path d="M262 320 Q230 295 205 305 Q235 332 262 320Z" />
          <path d="M172 70 Q150 35 118 30 Q140 65 172 70Z" />
          <path d="M200 70 Q225 35 260 32 Q235 68 200 70Z" />
        </g>
      </svg>

      {/* Brand Name Typography ("অবনতি") */}
      <span
        className={cn(
          "font-bengali text-2xl font-bold tracking-tight inline-block pt-1 pb-1 leading-normal transition-all duration-200 overflow-visible",
          t.text,
          t.hover
        )}
      >
        অবনতি
      </span>
    </Link>
  );
}
