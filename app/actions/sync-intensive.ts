"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { syncPlaylist } from "@/lib/youtube/sync";

export interface IntensiveSyncResult {
  success: boolean;
  message: string;
  synced?: number;
}

export async function syncIntensiveNow(
  playlistId?: string
): Promise<IntensiveSyncResult> {
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

  // 3. Call syncPlaylist (reuses the same sync engine as Live Classes)
  try {
    if (targetPlaylist === "all") {
      const { INTENSIVE_PLAYLISTS } = await import(
        "@/lib/youtube/intensive-playlists"
      );

      if (INTENSIVE_PLAYLISTS.length === 0) {
        return {
          success: false,
          message:
            "No Intensive Class playlists configured. Add playlist IDs in lib/youtube/intensive-playlists.ts.",
        };
      }

      let totalSynced = 0;
      for (const pl of INTENSIVE_PLAYLISTS) {
        try {
          const res = await syncPlaylist(pl.id);
          totalSynced += res.synced || 0;
        } catch {
          // continue with other playlists
        }
      }
      revalidatePath("/dashboard");
      revalidatePath("/intensive-classes");
      return {
        success: true,
        synced: totalSynced,
        message: `Synced all ${INTENSIVE_PLAYLISTS.length} intensive playlists (${totalSynced} total videos).`,
      };
    }

    const result = await syncPlaylist(targetPlaylist);

    revalidatePath("/dashboard");
    revalidatePath("/intensive-classes");

    return {
      success: true,
      synced: result.synced,
      message: `Synced ${result.synced} video${result.synced !== 1 ? "s" : ""} from playlist ${result.playlistId}`,
    };
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return { success: false, message: msg };
  }
}
