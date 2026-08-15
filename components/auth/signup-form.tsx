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
  ShieldCheck,
  UserPlus,
  User,
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

  // ── Pending Approval Success State ────────────────────────────────────────
  if (state?.success) {
    return (
      <Card className="w-full max-w-md border-border/80 bg-card/90 shadow-xl backdrop-blur-sm dark:border-[#1F2C34] dark:bg-[#111820]">
        <CardContent className="pt-8 pb-8 px-8">
          <div className="flex flex-col items-center text-center space-y-5">
            {/* Icon */}
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#25A8A2]/15 ring-1 ring-[#25A8A2]/30 dark:bg-[#25A8A2]/10">
                <ShieldCheck className="h-8 w-8 text-[#25A8A2]" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 shadow-md">
                <Clock className="h-3 w-3 text-white" />
              </span>
            </div>

            {/* Heading */}
            <div className="space-y-1.5">
              <h2 className="font-heading text-xl font-bold tracking-tight text-foreground dark:text-[#E8EDF0]">
                Request Submitted!
              </h2>
              <p className="text-sm text-muted-foreground dark:text-[#9AA7AE] leading-relaxed max-w-[300px]">
                {state.success}
              </p>
            </div>

            {/* Status badge */}
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-500/20 dark:bg-amber-500/10">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                Awaiting admin approval
              </span>
            </div>

            {/* Info steps */}
            <div className="w-full space-y-2.5 text-left rounded-xl border border-border/60 bg-muted/30 p-4 dark:border-[#1F2C34] dark:bg-[#0A0F12]/40">
              {[
                "Your account has been registered successfully.",
                "The administrator will approve your account from the dashboard.",
                "Once approved, you can sign in directly with your email and password.",
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#25A8A2]/15 text-[10px] font-bold text-[#25A8A2]">
                    {i + 1}
                  </span>
                  <p className="text-xs text-muted-foreground dark:text-[#9AA7AE] leading-relaxed">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-center justify-center border-t border-border/40 pt-5 pb-5 dark:border-[#1F2C34]">
          <p className="text-center text-sm text-muted-foreground dark:text-[#9AA7AE]">
            Already approved?{" "}
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

  // ── Signup Form ───────────────────────────────────────────────────────────
  return (
    <Card className="w-full max-w-md border-border/80 bg-card/90 shadow-xl backdrop-blur-sm dark:border-[#1F2C34] dark:bg-[#111820]">
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
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
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
                className="pl-10 dark:border-[#1F2C34] dark:bg-[#0A0F12]/50 dark:text-[#E8EDF0] dark:placeholder:text-[#5C6A72]"
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
                className="pl-10 dark:border-[#1F2C34] dark:bg-[#0A0F12]/50 dark:text-[#E8EDF0] dark:placeholder:text-[#5C6A72]"
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
                className="pl-10 pr-10 dark:border-[#1F2C34] dark:bg-[#0A0F12]/50 dark:text-[#E8EDF0] dark:placeholder:text-[#5C6A72]"
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
                className="pl-10 pr-10 dark:border-[#1F2C34] dark:bg-[#0A0F12]/50 dark:text-[#E8EDF0] dark:placeholder:text-[#5C6A72]"
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
            className="w-full font-semibold shadow-md dark:bg-[#25A8A2] dark:text-white dark:hover:bg-[#20928D]"
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
