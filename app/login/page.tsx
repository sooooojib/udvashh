import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in | অবনতি",
  description: "Sign in to your account",
};

function LoginFormSkeleton() {
  return (
    <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card/90 p-6 shadow-xl backdrop-blur-sm dark:border-[#1F2C34] dark:bg-[#111820] space-y-6">
      <div className="flex flex-col items-center space-y-3">
        <div className="h-12 w-12 rounded-2xl bg-muted/60 dark:bg-[#141E28] animate-pulse" />
        <div className="h-7 w-36 rounded-md bg-muted/70 dark:bg-[#141E28] animate-pulse" />
        <div className="h-4 w-64 rounded-md bg-muted/40 dark:bg-[#141E28]/60 animate-pulse" />
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-4 w-12 rounded bg-muted/60 dark:bg-[#141E28] animate-pulse" />
          <div className="h-10 w-full rounded-xl bg-muted/40 dark:bg-[#141E28]/60 animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-16 rounded bg-muted/60 dark:bg-[#141E28] animate-pulse" />
          <div className="h-10 w-full rounded-xl bg-muted/40 dark:bg-[#141E28]/60 animate-pulse" />
        </div>
        <div className="h-11 w-full rounded-xl bg-muted/70 dark:bg-[#141E28] animate-pulse" />
      </div>
      <div className="border-t border-border/40 pt-4 flex justify-center dark:border-[#1F2C34]">
        <div className="h-4 w-48 rounded bg-muted/40 dark:bg-[#141E28] animate-pulse" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-1 items-center justify-center p-4 sm:p-6 md:p-8 bg-zinc-50/50 dark:bg-zinc-950/50">
      <Suspense fallback={<LoginFormSkeleton />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
