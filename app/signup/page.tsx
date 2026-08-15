import { Suspense } from "react";
import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Create an Account | Udvash",
  description: "Sign up for a new account",
};

export default function SignupPage() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-1 items-center justify-center p-4 sm:p-6 md:p-8 bg-zinc-50/50 dark:bg-zinc-950/50">
      <Suspense
        fallback={
          <div className="h-96 w-full max-w-md animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
        }
      >
        <SignupForm />
      </Suspense>
    </main>
  );
}
