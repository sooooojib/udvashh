import { Suspense } from "react";
import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Create an Account | অবনতি",
  description: "Sign up for a new account",
};

function SignupFormSkeleton() {
  return (
    <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card/90 p-6 shadow-xl backdrop-blur-sm dark:border-[#1F2C34] dark:bg-[#111820] space-y-5">
      <div className="flex flex-col items-center space-y-3">
        <div className="h-12 w-12 rounded-2xl bg-muted/60 dark:bg-[#141E28] animate-pulse" />
        <div className="h-7 w-40 rounded-md bg-muted/70 dark:bg-[#141E28] animate-pulse" />
        <div className="h-4 w-72 rounded-md bg-muted/40 dark:bg-[#141E28]/60 animate-pulse" />
      </div>
      <div className="space-y-3.5">
        <div className="space-y-1.5">
          <div className="h-4 w-16 rounded bg-muted/60 dark:bg-[#141E28] animate-pulse" />
          <div className="h-10 w-full rounded-xl bg-muted/40 dark:bg-[#141E28]/60 animate-pulse" />
        </div>
        <div className="space-y-1.5">
          <div className="h-4 w-12 rounded bg-muted/60 dark:bg-[#141E28] animate-pulse" />
          <div className="h-10 w-full rounded-xl bg-muted/40 dark:bg-[#141E28]/60 animate-pulse" />
        </div>
        <div className="space-y-1.5">
          <div className="h-4 w-16 rounded bg-muted/60 dark:bg-[#141E28] animate-pulse" />
          <div className="h-10 w-full rounded-xl bg-muted/40 dark:bg-[#141E28]/60 animate-pulse" />
        </div>
        <div className="space-y-1.5">
          <div className="h-4 w-28 rounded bg-muted/60 dark:bg-[#141E28] animate-pulse" />
          <div className="h-10 w-full rounded-xl bg-muted/40 dark:bg-[#141E28]/60 animate-pulse" />
        </div>
        <div className="h-11 w-full rounded-xl bg-muted/70 dark:bg-[#141E28] animate-pulse pt-1" />
      </div>
      <div className="border-t border-border/40 pt-4 flex justify-center dark:border-[#1F2C34]">
        <div className="h-4 w-48 rounded bg-muted/40 dark:bg-[#141E28] animate-pulse" />
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-1 items-center justify-center p-4 sm:p-6 md:p-8 bg-zinc-50/50 dark:bg-zinc-950/50">
      <Suspense fallback={<SignupFormSkeleton />}>
        <SignupForm />
      </Suspense>
    </main>
  );
}
