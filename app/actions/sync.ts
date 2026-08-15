"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { syncPlaylist } from "@/lib/youtube/sync";

export interface SyncActionResult {
  success: boolean;
  message: string;
  synced?: number;
}

export async function syncNow(
  playlistId?: string
): Promise<SyncActionResult> {
  // 1. Verify authenticated session
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Unauthorized. Please sign in." };
  }

  // 2. Verify caller is the owner
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && user.email?.toLowerCase() !== adminEmail.toLowerCase()) {
    return {
      success: false,
      message: "Forbidden. Only the project owner can trigger a manual sync.",
    };
  }

  const targetPlaylist = playlistId || process.env.YT_PLAYLIST_ID || "";

  if (!targetPlaylist) {
    return {
      success: false,
      message:
        "No playlist ID provided. Select a playlist or set YT_PLAYLIST_ID in your environment.",
    };
  }

  // 3. Call syncPlaylist directly on the server — no HTTP round-trip needed
  try {
    const result = await syncPlaylist(targetPlaylist);

    revalidatePath("/dashboard");

    return {
      success: true,
      synced: result.synced,
      message: `✓ Synced ${result.synced} video${result.synced !== 1 ? "s" : ""} from playlist ${result.playlistId}`,
    };
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return { success: false, message: msg };
  }
}
