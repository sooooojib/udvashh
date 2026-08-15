"use client";

import { Toaster as SonnerToaster } from "sonner";
import { useTheme } from "next-themes";

export function Toaster() {
  const { theme } = useTheme();

  return (
    <SonnerToaster
      theme={(theme as "light" | "dark" | "system") || "system"}
      position="bottom-right"
      toastOptions={{
        className:
          "font-sans text-xs font-medium border border-border/80 bg-card/95 text-foreground backdrop-blur-md shadow-lg rounded-2xl dark:border-[#1F2C34] dark:bg-[#111820]/95 dark:text-[#E8EDF0]",
        descriptionClassName: "text-muted-foreground dark:text-[#9AA7AE] text-[11px]",
      }}
      richColors={false}
      closeButton
    />
  );
}
