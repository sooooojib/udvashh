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
    INSERT INTO watch_progress (user_id, video_id, watched, watched_at, updated_at)
    VALUES (
      ${session.id},
      ${videoId},
      ${watched},
      ${watched ? new Date().toISOString() : null},
      ${new Date().toISOString()}
    )
    ON CONFLICT (user_id, video_id) DO UPDATE SET
      watched = EXCLUDED.watched,
      watched_at = EXCLUDED.watched_at,
      updated_at = EXCLUDED.updated_at
  `;

  revalidatePath("/dashboard");
  revalidatePath("/live-classes");
  revalidatePath("/intensive-classes");
}
