"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { sql } from "@/lib/db";
import { updateVideoPrivacy } from "@/lib/youtube/youtube-oauth";
import type { VideoPrivacyStatus } from "@/lib/youtube/youtube-oauth";

export interface TogglePrivacyResult {
  success: boolean;
  message: string;
  newStatus?: VideoPrivacyStatus;
}

export async function toggleVideoPrivacy(
  youtubeVideoId: string,
  newStatus: "public" | "unlisted"
): Promise<TogglePrivacyResult> {
  // 1. Verify authenticated session
  const session = await getSession();
  if (!session) {
    return { success: false, message: "Unauthorized. Please sign in." };
  }

  // 2. Verify caller is an admin / owner
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    const allowedEmails = adminEmail
      .split(",")
      .map((e) => e.trim().toLowerCase());
    const userEmail = session.email?.toLowerCase() || "";

    if (!allowedEmails.includes(userEmail)) {
      return {
        success: false,
        message: "Forbidden. Only admins can toggle video privacy.",
      };
    }
  }

  if (!youtubeVideoId) {
    return { success: false, message: "Missing YouTube video ID." };
  }

  if (newStatus !== "public" && newStatus !== "unlisted") {
    return {
      success: false,
      message: "Invalid privacy status. Must be 'public' or 'unlisted'.",
    };
  }

  try {
    // 3. Update privacy status on YouTube via OAuth API
    const ytResult = await updateVideoPrivacy(youtubeVideoId, newStatus);

    // 4. Update the record in Neon database
    await sql`
      UPDATE videos
      SET privacy_status = ${ytResult.privacyStatus},
          updated_at = NOW()
      WHERE youtube_video_id = ${youtubeVideoId}
    `;

    // 5. Revalidate cache on all pages displaying videos
    revalidatePath("/dashboard");
    revalidatePath("/live-classes");
    revalidatePath("/intensive-classes");
    revalidatePath("/subject-hacks");
    revalidatePath(`/watch/${youtubeVideoId}`);

    return {
      success: true,
      newStatus: ytResult.privacyStatus,
      message: `Video is now ${ytResult.privacyStatus === "public" ? "Public" : "Unlisted"}.`,
    };
  } catch (error: unknown) {
    console.error("Error toggling video privacy:", error);
    const msg =
      error instanceof Error ? error.message : "Failed to update video privacy.";
    return { success: false, message: msg };
  }
}
