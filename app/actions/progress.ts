"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export async function toggleWatched(
  videoId: string,
  watched: boolean
): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  await sql`
    INSERT INTO watch_progress (
      user_id,
      video_id,
      watched,
      watched_at,
      last_watched_at,
      updated_at
    )
    VALUES (
      ${session.id},
      ${videoId},
      ${watched},
      ${watched ? new Date().toISOString() : null},
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id, video_id) DO UPDATE SET
      watched = EXCLUDED.watched,
      watched_at = EXCLUDED.watched_at,
      last_watched_at = EXCLUDED.last_watched_at,
      updated_at = EXCLUDED.updated_at
  `;

  revalidatePath("/dashboard");
  revalidatePath("/live-classes");
  revalidatePath("/intensive-classes");
  revalidatePath("/subject-hacks");
}

export async function updatePlaybackProgress(
  videoId: string,
  progressSeconds: number,
  duration?: number
): Promise<void> {
  const session = await getSession();
  if (!session) return;

  const cleanSeconds = Math.max(0, Math.floor(progressSeconds));
  const isNearlyFinished = Boolean(
    duration && duration > 0 && cleanSeconds / duration >= 0.95
  );

  await sql`
    INSERT INTO watch_progress (
      user_id,
      video_id,
      watched,
      progress_seconds,
      watched_at,
      last_watched_at,
      updated_at
    )
    VALUES (
      ${session.id},
      ${videoId},
      ${isNearlyFinished},
      ${cleanSeconds},
      ${isNearlyFinished ? new Date().toISOString() : null},
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id, video_id) DO UPDATE SET
      progress_seconds = EXCLUDED.progress_seconds,
      last_watched_at = EXCLUDED.last_watched_at,
      updated_at = EXCLUDED.updated_at,
      watched = CASE
        WHEN watch_progress.watched = true THEN true
        WHEN ${isNearlyFinished} = true THEN true
        ELSE watch_progress.watched
      END,
      watched_at = CASE
        WHEN watch_progress.watched = true THEN watch_progress.watched_at
        WHEN ${isNearlyFinished} = true THEN COALESCE(watch_progress.watched_at, NOW())
        ELSE watch_progress.watched_at
      END
  `;

  revalidatePath("/dashboard");
}

export async function removeFromCurrentlyWatching(
  videoId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Unauthorized" };

    // Reset progress_seconds to 0 so video is removed from Currently Watching
    await sql`
      UPDATE watch_progress
      SET progress_seconds = 0,
          updated_at = NOW()
      WHERE user_id = ${session.id}
        AND video_id = ${videoId}
    `;

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Failed to remove from currently watching:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove",
    };
  }
}
