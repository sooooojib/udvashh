"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export type AuthActionResult = {
  error?: string;
  success?: string;
};

// ── LOGIN ────────────────────────────────────────────────────────────────────

export async function login(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirectTo") as string) || "/dashboard";

  if (!email || !password) {
    return { error: "Please enter both email and password." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  // ── Approval gate: check profiles table ──────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("profiles")
      .select("is_approved")
      .eq("id", user.id)
      .single();

    if (!profile || profile.is_approved === false) {
      await supabase.auth.signOut();
      return {
        error:
          "Your account is pending admin approval. Once the administrator approves your account, you will be able to sign in.",
      };
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  revalidatePath("/", "layout");
  redirect(redirectTo);
}

// ── SIGNUP ───────────────────────────────────────────────────────────────────

export async function signup(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = (formData.get("email") as string)?.trim();
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

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName || "" },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If user already exists in auth.users, Supabase returns empty identities array
  if (data?.user?.identities && data.user.identities.length === 0) {
    return {
      error:
        "An account with this email already exists. Please try signing in, or use another email.",
    };
  }

  // Guaranteed direct insert into profiles via service role admin client
  if (data?.user) {
    const adminClient = createAdminClient();
    await adminClient.from("profiles").upsert(
      {
        id: data.user.id,
        email: data.user.email,
        full_name: fullName || "",
        is_approved: false,
      },
      { onConflict: "id" }
    );
  }

  // Sign out any auto-created session — they must wait for approval
  await supabase.auth.signOut();

  return {
    success:
      "Request submitted! Your account is pending admin approval. You will be able to log in once the admin approves your request.",
  };
}

// ── LOGOUT ───────────────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
