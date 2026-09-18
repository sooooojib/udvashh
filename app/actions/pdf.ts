"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { sql } from "@/lib/db";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  extractGoogleDriveFileId,
  getDriveDownloadUrl,
  getDriveViewUrl,
} from "@/lib/utils/google-drive";

export interface VideoPdfItem {
  id: string;
  video_id: string;
  title: string;
  source_type: "upload" | "drive";
  file_url: string;
  file_size: number | null;
  storage_path: string | null;
  file_id: string | null;
  created_at: string;
  updated_at: string;
}

function verifyAdmin(sessionEmail?: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return true; // Default to allow if not configured
  const allowedEmails = adminEmail
    .split(",")
    .map((e) => e.trim().toLowerCase());
  return allowedEmails.includes(sessionEmail?.toLowerCase() || "");
}

/**
 * Upload a PDF file directly to Supabase Storage bucket 'video-pdfs'
 */
export async function uploadDirectPdf(
  formData: FormData
): Promise<{ success: boolean; message: string; pdf?: VideoPdfItem }> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, message: "Unauthorized. Please sign in." };
    }

    if (!verifyAdmin(session.email)) {
      return {
        success: false,
        message: "Forbidden. Only admins can upload lecture PDFs.",
      };
    }

    const videoId = formData.get("videoId") as string;
    const file = formData.get("file") as File;
    const customTitle = formData.get("title") as string;

    if (!videoId) {
      return { success: false, message: "Missing video ID." };
    }

    if (!file || file.size === 0) {
      return { success: false, message: "Please select a valid PDF file." };
    }

    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      return { success: false, message: "Only PDF files are allowed." };
    }

    // Sanitize filename and construct storage path: {videoId}/{timestamp}-{sanitizedName}
    const cleanName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/\.pdf$/i, "");
    const storagePath = `${videoId}/${Date.now()}-${cleanName}.pdf`;
    const title = customTitle?.trim() || cleanName.replace(/[_-]+/g, " ");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const supabase = createAdminClient();
    const { error: uploadError } = await supabase.storage
      .from("video-pdfs")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase storage upload error:", uploadError);
      return {
        success: false,
        message: `Upload failed: ${uploadError.message}`,
      };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("video-pdfs").getPublicUrl(storagePath);

    // Save record to Neon DB
    const inserted = await sql`
      INSERT INTO video_pdfs (
        video_id, title, source_type, file_url, file_size, storage_path, file_id
      )
      VALUES (
        ${videoId}, ${title}, 'upload', ${publicUrl}, ${file.size}, ${storagePath}, NULL
      )
      RETURNING *
    `;

    const newPdf = inserted[0] as unknown as VideoPdfItem;

    revalidatePath(`/watch/[videoId]`, "page");
    revalidatePath(`/dashboard`, "page");

    return {
      success: true,
      message: "PDF uploaded successfully.",
      pdf: newPdf,
    };
  } catch (error: unknown) {
    console.error("Error in uploadDirectPdf:", error);
    const msg =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: msg };
  }
}

/**
 * Attach a Google Drive PDF link
 */
export async function addDrivePdf({
  videoId,
  title,
  driveUrl,
}: {
  videoId: string;
  title: string;
  driveUrl: string;
}): Promise<{ success: boolean; message: string; pdf?: VideoPdfItem }> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, message: "Unauthorized. Please sign in." };
    }

    if (!verifyAdmin(session.email)) {
      return {
        success: false,
        message: "Forbidden. Only admins can attach lecture PDFs.",
      };
    }

    if (!videoId || !title?.trim() || !driveUrl?.trim()) {
      return { success: false, message: "Please provide both title and Google Drive link." };
    }

    const fileId = extractGoogleDriveFileId(driveUrl);
    if (!fileId) {
      return {
        success: false,
        message:
          "Could not detect a valid Google Drive file ID. Please ensure the link is a valid Google Drive share link.",
      };
    }

    const publicViewUrl = getDriveViewUrl(fileId);

    // Save to Neon DB
    const inserted = await sql`
      INSERT INTO video_pdfs (
        video_id, title, source_type, file_url, file_size, storage_path, file_id
      )
      VALUES (
        ${videoId}, ${title.trim()}, 'drive', ${publicViewUrl}, NULL, NULL, ${fileId}
      )
      RETURNING *
    `;

    const newPdf = inserted[0] as unknown as VideoPdfItem;

    revalidatePath(`/watch/[videoId]`, "page");
    revalidatePath(`/dashboard`, "page");

    return {
      success: true,
      message: "Google Drive PDF attached successfully.",
      pdf: newPdf,
    };
  } catch (error: unknown) {
    console.error("Error in addDrivePdf:", error);
    const msg =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: msg };
  }
}

/**
 * Delete an attached PDF (and cleans up from Supabase Storage if uploaded)
 */
export async function deleteVideoPdf({
  pdfId,
  videoId,
}: {
  pdfId: string;
  videoId: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, message: "Unauthorized. Please sign in." };
    }

    if (!verifyAdmin(session.email)) {
      return {
        success: false,
        message: "Forbidden. Only admins can delete PDFs.",
      };
    }

    // 1. Fetch PDF record to see if it's an uploaded file with storage_path
    const rows = await sql`
      SELECT * FROM video_pdfs WHERE id = ${pdfId} LIMIT 1
    `;

    if (rows.length === 0) {
      return { success: false, message: "PDF not found." };
    }

    const pdf = rows[0] as unknown as VideoPdfItem;

    // 2. If it was uploaded to Supabase, delete from the bucket
    if (pdf.source_type === "upload" && pdf.storage_path) {
      try {
        const supabase = createAdminClient();
        await supabase.storage.from("video-pdfs").remove([pdf.storage_path]);
      } catch (storageErr) {
        console.warn("Could not delete file from Supabase storage:", storageErr);
      }
    }

    // 3. If it was uploaded to Google Drive, delete from Drive
    if (pdf.source_type === "drive" && pdf.file_id) {
      try {
        const { deleteFileFromGoogleDrive } = await import("@/lib/drive/drive-upload");
        await deleteFileFromGoogleDrive(pdf.file_id);
      } catch (driveErr) {
        console.warn("Could not delete file from Google Drive:", driveErr);
      }
    }

    // 4. Delete row from Neon DB
    await sql`DELETE FROM video_pdfs WHERE id = ${pdfId}`;

    revalidatePath(`/watch/[videoId]`, "page");
    revalidatePath(`/dashboard`, "page");

    return { success: true, message: "PDF removed successfully." };
  } catch (error: unknown) {
    console.error("Error in deleteVideoPdf:", error);
    const msg =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: msg };
  }
}

/**
 * Upload a PDF directly to Google Drive and attach to video
 */
export async function uploadPdfToDriveAction(
  formData: FormData
): Promise<{ success: boolean; message: string; pdf?: VideoPdfItem }> {
  try {
    const session = await getSession();
    if (!session) return { success: false, message: "Unauthorized." };
    if (!verifyAdmin(session.email)) {
      return { success: false, message: "Forbidden. Admin access required." };
    }

    const videoId = formData.get("videoId") as string;
    const file = formData.get("file") as File;
    const customTitle = formData.get("title") as string;

    if (!videoId || !file) {
      return { success: false, message: "Missing video ID or file." };
    }

    const cleanName = file.name
      .replace(/\.pdf$/i, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_");
    const title = customTitle?.trim() || cleanName.replace(/[_-]+/g, " ");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { uploadPdfToGoogleDrive } = await import("@/lib/drive/drive-upload");
    const { fileId, webViewLink } = await uploadPdfToGoogleDrive({
      fileName: file.name,
      fileBuffer: buffer,
    });

    // Save to Neon DB
    const inserted = await sql`
      INSERT INTO video_pdfs (
        video_id, title, source_type, file_url, file_size, storage_path, file_id
      )
      VALUES (
        ${videoId}, ${title}, 'drive', ${webViewLink}, ${file.size}, NULL, ${fileId}
      )
      RETURNING *
    `;

    const newPdf = inserted[0] as unknown as VideoPdfItem;

    revalidatePath(`/watch/[videoId]`, "page");
    revalidatePath(`/dashboard`, "page");

    return {
      success: true,
      message: "Uploaded directly to your Google Drive folder!",
      pdf: newPdf,
    };
  } catch (error: unknown) {
    console.error("Error in uploadPdfToDriveAction:", error);
    const msg =
      error instanceof Error ? error.message : "Google Drive upload failed.";
    return { success: false, message: msg };
  }
}

/**
 * Checks if Google Drive is authorized
 */
export async function isGoogleDriveLinked(): Promise<boolean> {
  return Boolean(
    process.env.GOOGLE_DRIVE_REFRESH_TOKEN || process.env.YT_OAUTH_REFRESH_TOKEN
  );
}

/**
 * Returns the authorization URL for connecting Google Drive
 */
export async function getGoogleDriveAuthLink(): Promise<string> {
  const { getGoogleDriveAuthUrl } = await import("@/lib/drive/drive-upload");
  return getGoogleDriveAuthUrl();
}
