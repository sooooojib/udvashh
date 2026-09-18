import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/utils/supabase/admin";
import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";

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

    const { videoId, title, storagePath, fileSize } = await request.json();

    if (!videoId || !storagePath) {
      return NextResponse.json(
        { success: false, message: "Missing videoId or storagePath." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const {
      data: { publicUrl },
    } = supabase.storage.from("video-pdfs").getPublicUrl(storagePath);

    const pdfTitle = title?.trim() || "Lecture PDF";

    const inserted = await sql`
      INSERT INTO video_pdfs (
        video_id, title, source_type, file_url, file_size, storage_path, file_id
      )
      VALUES (
        ${videoId}, ${pdfTitle}, 'upload', ${publicUrl}, ${fileSize || 0}, ${storagePath}, NULL
      )
      RETURNING *
    `;

    revalidatePath(`/watch/[videoId]`, "page");
    revalidatePath(`/dashboard`, "page");

    return NextResponse.json({
      success: true,
      pdf: inserted[0],
    });
  } catch (err: unknown) {
    console.error("Error completing Supabase upload:", err);
    const msg =
      err instanceof Error ? err.message : "Failed to record upload in database.";
    return NextResponse.json(
      { success: false, message: msg },
      { status: 500 }
    );
  }
}
