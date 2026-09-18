import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { sendDriveChunk } from "@/lib/drive/drive-upload";
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

    const searchParams = request.nextUrl.searchParams;
    const sessionUrl =
      searchParams.get("sessionUrl") || request.headers.get("x-session-url");
    const rangeStart = Number(
      searchParams.get("rangeStart") ?? request.headers.get("x-range-start")
    );
    const rangeEnd = Number(
      searchParams.get("rangeEnd") ?? request.headers.get("x-range-end")
    );
    const totalSize = Number(
      searchParams.get("totalSize") ?? request.headers.get("x-total-size")
    );
    const videoId =
      searchParams.get("videoId") || request.headers.get("x-video-id");
    const title =
      searchParams.get("title") ||
      request.headers.get("x-title") ||
      "Lecture Note";

    if (!sessionUrl || isNaN(rangeStart) || isNaN(rangeEnd) || isNaN(totalSize)) {
      return NextResponse.json(
        { success: false, message: "Missing chunk upload parameters." },
        { status: 400 }
      );
    }

    const arrayBuffer = await request.arrayBuffer();
    const chunkBuffer = Buffer.from(arrayBuffer);

    const result = await sendDriveChunk({
      sessionUrl,
      chunkBuffer,
      rangeStart,
      rangeEnd,
      totalSize,
    });

    if (result.done && result.fileId) {
      if (!videoId) {
        return NextResponse.json(
          { success: false, message: "Missing video ID for database record." },
          { status: 400 }
        );
      }

      const inserted = await sql`
        INSERT INTO video_pdfs (
          video_id, title, source_type, file_url, file_size, storage_path, file_id
        )
        VALUES (
          ${videoId}, ${title}, 'drive', ${result.webViewLink}, ${totalSize}, NULL, ${result.fileId}
        )
        RETURNING *
      `;

      revalidatePath("/", "layout");
      revalidatePath("/live-classes", "page");
      revalidatePath("/intensive-classes", "page");
      revalidatePath("/subject-hacks", "page");
      revalidatePath(`/watch/[videoId]`, "page");
      revalidatePath(`/dashboard`, "page");

      return NextResponse.json({
        success: true,
        done: true,
        pdf: inserted[0],
      });
    }

    return NextResponse.json({
      success: true,
      done: false,
    });
  } catch (err: unknown) {
    console.error("Error in Drive chunk upload:", err);
    const msg =
      err instanceof Error ? err.message : "Chunk upload failed.";
    return NextResponse.json(
      { success: false, message: msg },
      { status: 500 }
    );
  }
}
