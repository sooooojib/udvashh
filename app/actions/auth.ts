"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { createSession, clearSession } from "@/lib/auth/session";

export type AuthActionResult = {
  error?: string;
  success?: string;
};

// ── LOGIN ────────────────────────────────────────────────────────────────────

export async function login(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirectTo") as string) || "/dashboard";

  if (!email || !password) {
    return { error: "Please enter both email and password." };
  }

  try {
    // Look up user in Neon
    const rows = await sql`
      SELECT id, email, password_hash FROM users WHERE email = ${email} LIMIT 1
    `;

    if (rows.length === 0) {
      return { error: "Invalid email or password." };
    }

    const user = rows[0];

    if (!user.password_hash) {
      return { error: "Invalid email or password." };
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash as string);
    if (!passwordMatch) {
      return { error: "Invalid email or password." };
    }

    // Check approval status
    const profileRows = await sql`
      SELECT is_approved FROM profiles WHERE id = ${user.id} LIMIT 1
    `;

    if (profileRows.length === 0 || profileRows[0].is_approved === false) {
      return {
        error:
          "Your account is pending admin approval. Once the administrator approves your account, you will be able to sign in.",
      };
    }

    // Create session cookie
    await createSession({ id: user.id as string, email: user.email as string });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Database error occurred";
    console.error("[login] error:", msg);
    return { error: `Login failed: ${msg}` };
  }

  revalidatePath("/", "layout");
  redirect(redirectTo);
}


// ── SIGNUP ───────────────────────────────────────────────────────────────────

export async function signup(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const fullName = (formData.get("fullName") as string)?.trim();
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!email || !password || !confirmPassword) {
    return { error: "Please fill in all fields." };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters long." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  // Check if user already exists
  const existing = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
  if (existing.length > 0) {
    return {
      error:
        "An account with this email already exists. Please sign in or use another email.",
    };
  }

  // Hash password and create user
  const passwordHash = await bcrypt.hash(password, 12);

  const newUserRows = await sql`
    INSERT INTO users (email, password_hash, role)
    VALUES (${email}, ${passwordHash}, 'user')
    RETURNING id
  `;

  const newUserId = newUserRows[0].id;

  // Create profile with is_approved = false
  await sql`
    INSERT INTO profiles (id, email, full_name, is_approved)
    VALUES (${newUserId}, ${email}, ${fullName || ""}, false)
    ON CONFLICT (id) DO NOTHING
  `;

  return {
    success:
      "Your account was created successfully. Please wait for the administrator to approve your access.",
  };
}

// ── LOGOUT ───────────────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  await clearSession();
  revalidatePath("/", "layout");
  redirect("/login");
}
