"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendAdminApprovalEmail } from "@/lib/email/resend";

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

  // ── Approval gate: check profiles table ────────────────────────────────
  const adminClient = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await adminClient
      .from("profiles")
      .select("is_approved")
      .eq("id", user.id)
      .single();

    if (!profile || profile.is_approved === false) {
      // Sign out the session immediately — they are not approved yet
      await supabase.auth.signOut();
      return {
        error:
          "Your account is pending admin approval. You will receive an email once your account has been approved.",
      };
    }
  }
  // ──────────────────────────────────────────────────────────────────────────

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

  const userId = data.user?.id;

  if (userId) {
    // ── Fetch the auto-generated approval_token from profiles ───────────────
    // Small delay to let the DB trigger fire
    await new Promise((r) => setTimeout(r, 800));

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("profiles")
      .select("approval_token")
      .eq("id", userId)
      .single();

    const approvalToken = profile?.approval_token;

    // ── Send admin notification email ───────────────────────────────────────
    if (approvalToken) {
      const adminEmailEnv = process.env.ADMIN_EMAIL || "";
      const adminEmails = adminEmailEnv
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);

      try {
        await sendAdminApprovalEmail({
          adminEmails,
          userName: fullName || "",
          userEmail: email,
          approvalToken,
          userId,
        });
      } catch (emailErr) {
        // Non-fatal — user still gets pending message
        console.error("[signup] Failed to send admin email:", emailErr);
      }
    }
  }

  // Sign out any auto-created session so they can't bypass the approval gate
  await supabase.auth.signOut();

  return {
    success:
      "Request submitted! Your account is pending admin approval. You will receive an email once your request has been approved.",
  };
}

// ── LOGOUT ───────────────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
