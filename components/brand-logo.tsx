import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  href?: string;
}

export function BrandLogo({ className, href = "/dashboard" }: BrandLogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2.5 cursor-pointer select-none transition-transform duration-200 hover:scale-105 active:scale-95",
        className
      )}
      aria-label="অবনতি Home"
    >
      {/* Custom Geometric SVG Icon: 2 identical stacked tiers (each with baseline + 3 upright pillars) */}
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        className="h-7 w-7 shrink-0 text-[#7A2E7A] dark:text-[#E8EDF0] transition-colors duration-200 group-hover:text-[#9333EA] dark:group-hover:text-[#25A8A2] drop-shadow-sm dark:group-hover:drop-shadow-[0_0_10px_rgba(37,168,162,0.5)]"
      >
        {/* Tier 1 (Top) */}
        {/* 3 Upright Pillars */}
        <rect x="4" y="2.5" width="3.2" height="8.5" rx="0.8" />
        <rect x="12.4" y="2.5" width="3.2" height="8.5" rx="0.8" />
        <rect x="20.8" y="2.5" width="3.2" height="8.5" rx="0.8" />
        {/* Baseline Bar */}
        <rect x="2" y="11" width="24" height="2.5" rx="0.8" />

        {/* Tier 2 (Bottom) */}
        {/* 3 Upright Pillars */}
        <rect x="4" y="15.5" width="3.2" height="8.5" rx="0.8" />
        <rect x="12.4" y="15.5" width="3.2" height="8.5" rx="0.8" />
        <rect x="20.8" y="15.5" width="3.2" height="8.5" rx="0.8" />
        {/* Baseline Bar */}
        <rect x="2" y="24" width="24" height="2.5" rx="0.8" />
      </svg>

      {/* Brand Name Typography ("অবনতি") */}
      <span className="font-bengali text-2xl font-bold tracking-tight leading-none text-[#7A2E7A] dark:text-[#E8EDF0] transition-colors duration-200 group-hover:text-[#9333EA] dark:group-hover:text-[#25A8A2]">
        অবনতি
      </span>
    </Link>
  );
}
