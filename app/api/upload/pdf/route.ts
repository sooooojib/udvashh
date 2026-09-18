import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { sql } from "@/lib/db";
import { createAdminClient } from "@/utils/supabase/admin";
import { uploadPdfToGoogleDrive } from "@/lib/drive/drive-upload";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      const allowedEmails = adminEmail
        .split(",")
        .map((e) => e.trim().toLowerCase());
      if (!allowedEmails.includes(session.email?.toLowerCase() || "")) {
        return NextResponse.json(
          { success: false, message: "Forbidden. Admin access required." },
          { status: 403 }
        );
      }
    }

    const formData = await request.formData();
    const videoId = formData.get("videoId") as string;
    const file = formData.get("file") as File;
    const customTitle = formData.get("title") as string;
    const destination = (formData.get("destination") as string) || "drive";

    if (!videoId || !file) {
      return NextResponse.json(
        { success: false, message: "Missing file or video ID." },
        { status: 400 }
      );
    }

    const cleanName = file.name
      .replace(/\.pdf$/i, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_");
    const title = customTitle?.trim() || cleanName.replace(/[_-]+/g, " ");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let newPdf;

    if (destination === "drive") {
      // Direct upload to Google Drive folder
      const { fileId, webViewLink } = await uploadPdfToGoogleDrive({
        fileName: file.name,
        fileBuffer: buffer,
      });

      const inserted = await sql`
        INSERT INTO video_pdfs (
          video_id, title, source_type, file_url, file_size, storage_path, file_id
        )
        VALUES (
          ${videoId}, ${title}, 'drive', ${webViewLink}, ${file.size}, NULL, ${fileId}
        )
        RETURNING *
      `;
      newPdf = inserted[0];
    } else {
      // Direct upload to Supabase Storage
      const storagePath = `${videoId}/${Date.now()}-${cleanName}.pdf`;
      const supabase = createAdminClient();
      const { error: uploadError } = await supabase.storage
        .from("video-pdfs")
        .upload(storagePath, buffer, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) {
        return NextResponse.json(
          { success: false, message: `Supabase upload error: ${uploadError.message}` },
          { status: 500 }
        );
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("video-pdfs").getPublicUrl(storagePath);

      const inserted = await sql`
        INSERT INTO video_pdfs (
          video_id, title, source_type, file_url, file_size, storage_path, file_id
        )
        VALUES (
          ${videoId}, ${title}, 'upload', ${publicUrl}, ${file.size}, ${storagePath}, NULL
        )
        RETURNING *
      `;
      newPdf = inserted[0];
    }

    revalidatePath(`/watch/[videoId]`, "page");
    revalidatePath(`/dashboard`, "page");

    return NextResponse.json({ success: true, pdf: newPdf });
  } catch (err: unknown) {
    console.error("API Upload error:", err);
    const msg = err instanceof Error ? err.message : "Upload failed.";
    return NextResponse.json(
      { success: false, message: msg },
      { status: 500 }
    );
  }
}
