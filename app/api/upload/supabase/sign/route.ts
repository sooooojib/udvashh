import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/utils/supabase/admin";

function isAdmin(sessionEmail?: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return true;
  const allowedEmails = adminEmail.split(",").map((e) => e.trim().toLowerCase());
  return allowedEmails.includes(sessionEmail?.toLowerCase() || "");
}

export async function POST(request: NextRequest) {
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

    const { videoId, fileName } = await request.json();

    if (!videoId || !fileName) {
      return NextResponse.json(
        { success: false, message: "Missing videoId or fileName." },
        { status: 400 }
      );
    }

    const cleanName = fileName
      .replace(/\.pdf$/i, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${videoId}/${Date.now()}-${cleanName}.pdf`;

    const supabase = createAdminClient();
    const { data, error } = await supabase.storage
      .from("video-pdfs")
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      console.error("Supabase signed upload URL error:", error);
      const isFetchFailed = error?.message === "fetch failed";
      return NextResponse.json(
        {
          success: false,
          message: isFetchFailed
            ? "Cannot connect to Supabase. Check NEXT_PUBLIC_SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY in Vercel."
            : error?.message || "Failed to create signed upload URL.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      signedUrl: data.signedUrl,
      token: data.token,
      storagePath,
    });
  } catch (err: unknown) {
    console.error("Error generating Supabase signed upload URL:", err);
    const msg =
      err instanceof Error ? err.message : "Failed to generate upload URL.";
    return NextResponse.json(
      { success: false, message: msg },
      { status: 500 }
    );
  }
}
