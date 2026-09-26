import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

function isAdmin(sessionEmail?: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return true;
  const allowedEmails = adminEmail.split(",").map((e) => e.trim().toLowerCase());
  return allowedEmails.includes(sessionEmail?.toLowerCase() || "");
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    if (!isAdmin(session.email)) {
      return NextResponse.json(
        { success: false, message: "Forbidden. Admin access required." },
        { status: 403 }
      );
    }

    const scriptUrl =
      process.env.GOOGLE_APPS_SCRIPT_URL ||
      process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL;

    if (!scriptUrl) {
      return NextResponse.json(
        { success: false, message: "Google Apps Script URL is not configured." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      scriptUrl: scriptUrl.trim().replace(/^["']|["']$/g, ""),
    });
  } catch (err: unknown) {
    console.error("Error fetching drive config:", err);
    return NextResponse.json(
      { success: false, message: "Failed to fetch drive upload config." },
      { status: 500 }
    );
  }
}
