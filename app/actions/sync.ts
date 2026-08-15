"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export interface SyncActionResult {
  success: boolean;
  message: string;
  synced?: number;
}

export async function syncNow(
  playlistId?: string
): Promise<SyncActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Unauthorized. Please sign in." };
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  // If ADMIN_EMAIL is set, enforce that user.email matches it
  if (adminEmail && user.email?.toLowerCase() !== adminEmail.toLowerCase()) {
    return {
      success: false,
      message: "Forbidden. Only the project owner can trigger manual sync.",
    };
  }

  const syncSecret = process.env.SYNC_SECRET;
  if (!syncSecret) {
    return {
      success: false,
      message: "Server configuration error: SYNC_SECRET not found.",
    };
  }

  // Construct absolute local or production URL for internal sync call
  const targetPlaylist = playlistId || process.env.YT_PLAYLIST_ID || "";
  const host =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const endpoint = new URL(`${protocol}://${host}/api/sync`);

  if (targetPlaylist) {
    endpoint.searchParams.set("playlistId", targetPlaylist);
  }

  try {
    const response = await fetch(endpoint.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${syncSecret}`,
      },
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.error || `Sync failed with status ${response.status}`,
      };
    }

    revalidatePath("/", "layout");
    revalidatePath("/dashboard");

    return {
      success: true,
      synced: data.synced,
      message: `Successfully synced ${data.synced} video(s) for playlist ${data.playlistId}!`,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Sync failed";
    return { success: false, message: `Sync error: ${msg}` };
  }
}
