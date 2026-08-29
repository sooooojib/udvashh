"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { login, type AuthActionResult } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail, ArrowRight } from "lucide-react";

export function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";
  const urlError = searchParams.get("error");

  const [state, formAction, isPending] = useActionState<
    AuthActionResult | null,
    FormData
  >(login, null);

  const [showPassword, setShowPassword] = React.useState(false);

  const errorMessage = state?.error || urlError;

  return (
    <div className="relative w-full max-w-md animate-fade-in-up">
      {/* Subtle ambient background glow */}
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-teal-500/10 via-primary/10 to-amber-500/10 blur-xl opacity-70 dark:opacity-30" />

      <Card className="relative w-full border-border/80 bg-card/95 shadow-2xl backdrop-blur-xl dark:border-[#1F2C34] dark:bg-[#111820]/95 transition-all duration-300">
        <CardHeader className="space-y-2 text-center pb-4">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-foreground to-foreground/90 text-background shadow-lg dark:from-[#E8EDF0] dark:to-[#C0CCD4] dark:text-[#0A0F12] transition-transform duration-300 hover:scale-105">
            <Lock className="h-6 w-6 stroke-[2.2]" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground dark:text-[#E8EDF0]">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-muted-foreground dark:text-[#9AA7AE] text-xs sm:text-sm">
            Enter your email and password to sign in to your account
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="redirectTo" value={redirectTo} />

            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/90 p-3.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300 animate-fade-in-up"
              >
                <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                <p className="leading-snug">{errorMessage}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-[#9AA7AE]">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground transition-colors" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  className="pl-10 h-11 rounded-xl dark:border-[#1F2C34] dark:bg-[#0A0F12]/60 dark:text-[#E8EDF0] dark:placeholder:text-[#5C6A72] transition-all focus-visible:ring-2 focus-visible:ring-primary/40"
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-[#9AA7AE]">
                  Password
                </Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground transition-colors" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="pl-10 pr-10 h-11 rounded-xl dark:border-[#1F2C34] dark:bg-[#0A0F12]/60 dark:text-[#E8EDF0] dark:placeholder:text-[#5C6A72] transition-all focus-visible:ring-2 focus-visible:ring-primary/40"
                  disabled={isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground focus:outline-none dark:hover:text-[#E8EDF0] transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="group relative w-full h-11 rounded-xl font-semibold shadow-md bg-foreground text-background hover:bg-foreground/90 dark:bg-[#25A8A2] dark:text-white dark:hover:bg-[#20928D] transition-all duration-200 active:scale-[0.98] mt-2 overflow-hidden"
              disabled={isPending}
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>Sign in</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </span>
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col items-center justify-center border-t border-border/40 pt-5 pb-5 dark:border-[#1F2C34]/80">
          <p className="text-center text-xs sm:text-sm text-muted-foreground dark:text-[#9AA7AE]">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-semibold text-foreground underline-offset-4 hover:underline dark:text-[#E8EDF0] transition-colors"
            >
              Request access
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
