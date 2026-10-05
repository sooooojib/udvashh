"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { syncPlaylist, syncMultiplePlaylists } from "@/lib/youtube/sync";

export interface SubjectHacksSyncResult {
  success: boolean;
  message: string;
  synced?: number;
  failed?: number;
}

export async function syncSubjectHacksNow(
  playlistId?: string
): Promise<SubjectHacksSyncResult> {
  // 1. Verify authenticated session
  const session = await getSession();

  if (!session) {
    return { success: false, message: "Unauthorized. Please sign in." };
  }

  // 2. Verify caller is an owner
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    const allowedEmails = adminEmail
      .split(",")
      .map((e) => e.trim().toLowerCase());
    const userEmail = session.email?.toLowerCase() || "";

    if (!allowedEmails.includes(userEmail)) {
      return {
        success: false,
        message: "Forbidden. Only the project owner can trigger a manual sync.",
      };
    }
  }

  const targetPlaylist = playlistId || "all";

  // 3. Call syncPlaylist (reuses the same sync engine)
  try {
    if (targetPlaylist === "all") {
      const { SUBJECT_HACKS_PLAYLISTS } = await import(
        "@/lib/youtube/subject-hacks-playlists"
      );

      if (SUBJECT_HACKS_PLAYLISTS.length === 0) {
        return {
          success: false,
          message:
            "No Subject Hacks playlists configured. Add playlist IDs in lib/youtube/subject-hacks-playlists.ts.",
        };
      }

      const { totalSynced, succeeded, failed, errors } = await syncMultiplePlaylists(SUBJECT_HACKS_PLAYLISTS, 2);

      revalidateTag("videos-catalog", "default");

      if (failed > 0 && succeeded === 0) {
        return {
          success: false,
          synced: 0,
          failed,
          message: `Failed to sync Subject Hacks playlists: ${errors[0]?.error || "Unknown error"}`,
        };
      }

      const statusMsg = failed > 0
        ? `Synced ${succeeded}/${SUBJECT_HACKS_PLAYLISTS.length} Subject Hacks playlists (${totalSynced} total videos). ${failed} failed.`
        : `Synced all ${SUBJECT_HACKS_PLAYLISTS.length} Subject Hacks playlist${SUBJECT_HACKS_PLAYLISTS.length !== 1 ? "s" : ""} (${totalSynced} total videos).`;

      return {
        success: true,
        synced: totalSynced,
        failed,
        message: statusMsg,
      };
    }

    const result = await syncPlaylist(targetPlaylist);

    revalidateTag("videos-catalog", "default");

    return {
      success: true,
      synced: result.synced,
      message: `Synced ${result.synced} video${result.synced !== 1 ? "s" : ""}.`,
    };
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return { success: false, message: msg };
  }
}
