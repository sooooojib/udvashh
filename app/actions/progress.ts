"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function toggleWatched(
  videoId: string,
  watched: boolean
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  await supabase.from("watch_progress").upsert(
    {
      user_id: user.id,
      video_id: videoId,
      watched,
      watched_at: watched ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id,video_id",
    }
  );

  revalidatePath("/dashboard");
  revalidatePath("/live-classes");
  revalidatePath("/intensive-classes");
}
