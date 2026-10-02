import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { sql } from "@/lib/db";
import { revalidatePath, revalidateTag } from "next/cache";

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

    const { videoId, title, fileId, webViewLink, fileSize } = await request.json();

    if (!videoId || !fileId || !webViewLink) {
      return NextResponse.json(
        { success: false, message: "Missing videoId, fileId, or webViewLink." },
        { status: 400 }
      );
    }

    const pdfTitle = title?.trim() || "Lecture PDF";

    const inserted = await sql`
      INSERT INTO video_pdfs (
        video_id, title, source_type, file_url, file_size, storage_path, file_id
      )
      VALUES (
        ${videoId}, ${pdfTitle}, 'drive', ${webViewLink}, ${fileSize || 0}, NULL, ${fileId}
      )
      RETURNING *
    `;

    revalidatePath("/", "layout");
    revalidatePath("/live-classes", "page");
    revalidatePath("/intensive-classes", "page");
    revalidatePath("/subject-hacks", "page");
    revalidatePath(`/watch/[videoId]`, "page");
    revalidatePath(`/watch/${videoId}`, "page");
    revalidatePath(`/dashboard`, "page");
    try {
      revalidateTag(`video-pdfs-${videoId}`, "default");
    } catch {}
    revalidateTag("videos-catalog", "default");
    revalidateTag("video-pdfs", "default");

    return NextResponse.json({
      success: true,
      pdf: inserted[0],
    });
  } catch (err: unknown) {
    console.error("Error completing Drive upload:", err);
    const msg =
      err instanceof Error ? err.message : "Failed to record Drive upload in database.";
    return NextResponse.json(
      { success: false, message: msg },
      { status: 500 }
    );
  }
}
