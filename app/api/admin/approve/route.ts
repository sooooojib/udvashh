import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendUserApprovedEmail } from "@/lib/email/resend";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const userId = searchParams.get("userId");

  // ── Validate inputs ──────────────────────────────────────────────
  if (!token || !userId) {
    return htmlResponse("error", "Invalid Link", "The approval link is missing required parameters.");
  }

  const supabase = createAdminClient();

  // ── Look up the profile by userId AND token ──────────────────────
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("id, email, full_name, is_approved, approval_token")
    .eq("id", userId)
    .eq("approval_token", token)
    .single();

  if (fetchError || !profile) {
    return htmlResponse(
      "error",
      "Invalid or Expired Link",
      "This approval link is invalid, has already been used, or has expired."
    );
  }

  if (profile.is_approved) {
    return htmlResponse(
      "info",
      "Already Approved",
      `The user <strong>${profile.email}</strong> has already been approved.`
    );
  }

  // ── Approve the user ─────────────────────────────────────────────
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      is_approved: true,
      approval_token: null,
    })
    .eq("id", userId);

  if (updateError) {
    console.error("[approve] Update failed:", updateError);
    return htmlResponse("error", "Server Error", "Failed to approve the user. Please try again.");
  }

  // ── Send confirmation email to user ─────────────────────────────
  try {
    await sendUserApprovedEmail({
      userEmail: profile.email,
      userName: profile.full_name || undefined,
    });
  } catch (emailError) {
    // Non-fatal — still return success to admin even if user email fails
    console.error("[approve] Failed to send approval email to user:", emailError);
  }

  return htmlResponse(
    "success",
    "User Approved",
    `<strong>${profile.email}</strong> has been approved successfully. They will receive a confirmation email shortly.`
  );
}

// ── HTML response factory ────────────────────────────────────────────────────

function htmlResponse(
  type: "success" | "error" | "info",
  title: string,
  message: string
): NextResponse {
  const colors = {
    success: { bg: "#25A8A2", icon: "✓", border: "#1F9E99" },
    error:   { bg: "#E63B2E", icon: "✕", border: "#CC2F24" },
    info:    { bg: "#6B7280", icon: "ℹ", border: "#4B5563" },
  }[type];

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — অবনতি Admin</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0A0F12;
      font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
      padding: 24px;
    }
    .card {
      background: #111820;
      border: 1px solid #1F2C34;
      border-radius: 20px;
      padding: 48px 40px;
      max-width: 440px;
      width: 100%;
      text-align: center;
    }
    .icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: ${colors.bg};
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 28px;
      color: white;
      font-weight: 700;
      box-shadow: 0 0 24px ${colors.bg}55;
    }
    .brand {
      font-size: 13px;
      font-weight: 700;
      color: #5C6A72;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 24px;
      font-weight: 800;
      color: #E8EDF0;
      letter-spacing: -0.025em;
      margin-bottom: 12px;
    }
    p {
      font-size: 14px;
      color: #9AA7AE;
      line-height: 1.6;
    }
    p strong {
      color: #E8EDF0;
    }
    .divider {
      border: none;
      border-top: 1px solid #1F2C34;
      margin: 28px 0;
    }
    .footer {
      font-size: 12px;
      color: #5C6A72;
    }
  </style>
</head>
<body>
  <div class="card">
    <p class="brand">অবনতি · Admin Panel</p>
    <div class="icon">${colors.icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <hr class="divider" />
    <p class="footer">You can close this tab.</p>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: type === "error" ? 400 : 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
