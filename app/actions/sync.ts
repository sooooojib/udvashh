"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { syncPlaylist } from "@/lib/youtube/sync";

export interface SyncActionResult {
  success: boolean;
  message: string;
  synced?: number;
}

export async function syncNow(
  playlistId?: string,
  playlistIds?: string[]
): Promise<SyncActionResult> {
  // 1. Verify authenticated session
  const session = await getSession();

  if (!session) {
    return { success: false, message: "Unauthorized. Please sign in." };
  }

  // 2. Verify caller is an owner (supports comma-separated admin emails)
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


  const targetPlaylist = playlistId || process.env.YT_PLAYLIST_ID || "";

  if (!targetPlaylist) {
    return {
      success: false,
      message:
        "No playlist ID provided. Select a playlist or set YT_PLAYLIST_ID in your environment.",
    };
  }

  // 3. Call syncPlaylist directly on the server
  try {
    if (playlistId === "all") {
      let targetList: { id: string; name?: string }[] = [];

      if (playlistIds && playlistIds.length > 0) {
        targetList = playlistIds.map((id) => ({ id }));
      } else {
        const { KNOWN_PLAYLISTS } = await import("@/lib/youtube/playlists");
        const { INTENSIVE_PLAYLISTS } = await import(
          "@/lib/youtube/intensive-playlists"
        );
        const { SUBJECT_HACKS_PLAYLISTS } = await import(
          "@/lib/youtube/subject-hacks-playlists"
        );
        targetList = [...KNOWN_PLAYLISTS, ...INTENSIVE_PLAYLISTS, ...SUBJECT_HACKS_PLAYLISTS];
      }

      let totalSynced = 0;
      for (const pl of targetList) {
        try {
          const res = await syncPlaylist(pl.id);
          totalSynced += res.synced || 0;
        } catch {
          // continue with other playlists
        }
      }
      revalidatePath("/dashboard");
      revalidatePath("/live-classes");
      revalidatePath("/intensive-classes");
      revalidatePath("/subject-hacks");
      return {
        success: true,
        synced: totalSynced,
        message: `Synced ${targetList.length} playlist${targetList.length === 1 ? "" : "s"} (${totalSynced} total videos).`,
      };
    }

    const result = await syncPlaylist(targetPlaylist);

    revalidatePath("/dashboard");
    revalidatePath("/live-classes");
    revalidatePath("/intensive-classes");
    revalidatePath("/subject-hacks");

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
