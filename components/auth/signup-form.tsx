"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { signup, type AuthActionResult } from "@/app/actions/auth";
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
import {
  AlertCircle,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  UserPlus,
  User,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export function SignupForm() {
  const [state, formAction, isPending] = useActionState<
    AuthActionResult | null,
    FormData
  >(signup, null);

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [clientError, setClientError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    setClientError(null);

    if (password.length < 6) {
      event.preventDefault();
      setClientError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      event.preventDefault();
      setClientError("Passwords do not match.");
      return;
    }
  };

  const errorMessage = clientError || state?.error;

  // ── Premium Redesigned Approval Screen (Matches Screenshot text exactly) ───────
  if (state?.success) {
    return (
      <div className="relative w-full max-w-[420px] animate-fade-in-up">
        {/* Ambient background glow */}
        <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-primary/10 to-teal-500/20 blur-xl opacity-75 dark:opacity-40" />

        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/95 p-8 sm:p-9 shadow-2xl backdrop-blur-xl dark:border-[#1F2C34] dark:bg-[#111820]/95 transition-all duration-300">
          {/* Subtle top ambient accent line */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-teal-400 opacity-80" />

          <div className="flex flex-col items-center text-center space-y-6">
            {/* Status Badge with pulsing aura */}
            <div className="relative">
              <div className="absolute -inset-2 rounded-2xl bg-amber-500/20 blur-md animate-pulse" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/15 to-amber-500/5 text-amber-500 shadow-inner dark:border-amber-400/20 dark:from-amber-400/20 dark:to-amber-500/5 dark:text-amber-400">
                <Clock className="h-7 w-7 stroke-[2.2] animate-[spin_12s_linear_infinite]" />
              </div>
            </div>

            {/* Typography */}
            <div className="space-y-2.5">
              <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground dark:text-[#E8EDF0]">
                Awaiting Admin Approval
              </h2>
              <p className="text-xs sm:text-[13px] leading-relaxed text-muted-foreground dark:text-[#9AA7AE] max-w-[300px]">
                Your account was created successfully. Please wait for the administrator to approve your access.
              </p>
            </div>

            {/* Action Button */}
            <div className="w-full pt-1">
              <Button
                asChild
                className="group relative w-full h-11 rounded-xl font-semibold shadow-md bg-foreground text-background hover:bg-foreground/90 dark:bg-[#25A8A2] dark:text-white dark:hover:bg-[#20928D] transition-all duration-200 active:scale-[0.98] text-xs sm:text-sm overflow-hidden"
              >
                <Link href="/login" className="flex items-center justify-center gap-2">
                  <span>Go to Sign in</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Signup Form ───────────────────────────────────────────────────────────
  return (
    <Card className="w-full max-w-md border-border/80 bg-card/90 shadow-xl backdrop-blur-sm dark:border-[#1F2C34] dark:bg-[#111820] animate-fade-in-up transition-all duration-300">
      <CardHeader className="space-y-2 text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background shadow-md dark:bg-[#E8EDF0] dark:text-[#0A0F12]">
          <UserPlus className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-foreground dark:text-[#E8EDF0]">
          Request Access
        </CardTitle>
        <CardDescription className="text-muted-foreground dark:text-[#9AA7AE]">
          Sign up and wait for admin approval to access the platform
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 animate-fade-in-up"
            >
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
              <p className="leading-snug">{errorMessage}</p>
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="dark:text-[#E8EDF0]">
              Full Name
            </Label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Your full name"
                autoComplete="name"
                className="pl-10 dark:border-[#1F2C34] dark:bg-[#0A0F12]/50 dark:text-[#E8EDF0] dark:placeholder:text-[#5C6A72] transition-colors"
                disabled={isPending}
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="dark:text-[#E8EDF0]">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                autoComplete="email"
                required
                className="pl-10 dark:border-[#1F2C34] dark:bg-[#0A0F12]/50 dark:text-[#E8EDF0] dark:placeholder:text-[#5C6A72] transition-colors"
                disabled={isPending}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="dark:text-[#E8EDF0]">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 dark:border-[#1F2C34] dark:bg-[#0A0F12]/50 dark:text-[#E8EDF0] dark:placeholder:text-[#5C6A72] transition-colors"
                disabled={isPending}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground focus:outline-none"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="dark:text-[#E8EDF0]">
              Confirm Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 pr-10 dark:border-[#1F2C34] dark:bg-[#0A0F12]/50 dark:text-[#E8EDF0] dark:placeholder:text-[#5C6A72] transition-colors"
                disabled={isPending}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground focus:outline-none"
                tabIndex={-1}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full font-semibold shadow-md dark:bg-[#25A8A2] dark:text-white dark:hover:bg-[#20928D] transition-all active:scale-[0.98]"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting request...
              </>
            ) : (
              "Request Access"
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col items-center justify-center border-t border-border/40 pt-6 dark:border-[#1F2C34]">
        <p className="text-center text-sm text-muted-foreground dark:text-[#9AA7AE]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-foreground underline-offset-4 hover:underline dark:text-[#E8EDF0]"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
