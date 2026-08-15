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
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  UserPlus,
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

  return (
    <Card className="w-full max-w-md border-zinc-200/80 bg-white/90 shadow-xl shadow-zinc-950/5 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/90">
      <CardHeader className="space-y-2 text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-md dark:bg-zinc-50 dark:text-zinc-900">
          <UserPlus className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">
          Create an account
        </CardTitle>
        <CardDescription className="text-zinc-500 dark:text-zinc-400">
          Enter your details below to create your account
        </CardDescription>
      </CardHeader>

      <CardContent>
        {state?.success ? (
          <div className="space-y-4 text-center">
            <div
              role="status"
              className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-left text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <p className="leading-snug">{state.success}</p>
            </div>
            <Button asChild className="w-full">
              <Link href="/login">Proceed to Sign in</Link>
            </Button>
          </div>
        ) : (
          <form
            action={formAction}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
              >
                <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                <p className="leading-snug">{errorMessage}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  className="pl-10"
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  disabled={isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 focus:outline-none dark:hover:text-zinc-200"
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10"
                  disabled={isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 focus:outline-none dark:hover:text-zinc-200"
                  tabIndex={-1}
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full font-semibold shadow-md"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        )}
      </CardContent>

      <CardFooter className="flex flex-col items-center justify-center border-t border-zinc-100 pt-6 dark:border-zinc-900">
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
