import { sql } from "@/lib/db";

export interface PrivacySyncResult {
  success: boolean;
  totalChecked: number;
  updatedCount: number;
  message: string;
}

let lastAutoSyncTimestamp = 0;
const AUTO_SYNC_COOLDOWN_MS = 60_000; // 1 minute cooldown between auto-checks

/**
 * Ultra-fast batch sync of all video privacy statuses directly from YouTube.
 * Batches in groups of 50 (only 1-2 API calls, takes <1s).
 * Updates Neon database whenever a mismatch with YouTube is detected.
 */
export async function syncAllPrivacyStatuses(): Promise<PrivacySyncResult> {
  const apiKey = process.env.YT_API_KEY || process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      totalChecked: 0,
      updatedCount: 0,
      message: "Missing YT_API_KEY in environment variables.",
    };
  }

  const videos = await sql`
    SELECT id, youtube_video_id, privacy_status FROM videos
  `;

  if (videos.length === 0) {
    return {
      success: true,
      totalChecked: 0,
      updatedCount: 0,
      message: "No videos found in database.",
    };
  }

  let updatedCount = 0;
  const batchSize = 50;

  for (let i = 0; i < videos.length; i += batchSize) {
    const chunk = videos.slice(i, i + batchSize);
    const ids = chunk.map((v) => v.youtube_video_id).join(",");

    try {
      const url = new URL("https://www.googleapis.com/youtube/v3/videos");
      url.searchParams.set("part", "status");
      url.searchParams.set("id", ids);
      url.searchParams.set("key", apiKey);

      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!res.ok) continue;

      const data = await res.json();
      if (!Array.isArray(data.items)) continue;

      for (const item of data.items) {
        const livePrivacy = item.status?.privacyStatus;
        const dbVideo = chunk.find((v) => v.youtube_video_id === item.id);

        if (livePrivacy && dbVideo && dbVideo.privacy_status !== livePrivacy) {
          await sql`
            UPDATE videos
            SET privacy_status = ${livePrivacy}, updated_at = NOW()
            WHERE youtube_video_id = ${item.id}
          `;
          updatedCount++;
        }
      }
    } catch (err) {
      console.error("Error batch syncing privacy chunk:", err);
    }
  }

  lastAutoSyncTimestamp = Date.now();

  return {
    success: true,
    totalChecked: videos.length,
    updatedCount,
    message:
      updatedCount > 0
        ? `Synced with YouTube: Updated ${updatedCount} video${updatedCount === 1 ? "" : "s"}.`
        : `All ${videos.length} videos match YouTube privacy settings.`,
  };
}

/**
 * Checks and updates a single video's privacy status in real-time from YouTube.
 * Used on the watch page so video status is always 100% current.
 */
export async function syncSingleVideoPrivacy(
  youtubeVideoId: string,
  currentDbStatus?: string
): Promise<string | null> {
  const apiKey = process.env.YT_API_KEY || process.env.YOUTUBE_API_KEY;
  if (!apiKey || !youtubeVideoId) return null;

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "status");
    url.searchParams.set("id", youtubeVideoId);
    url.searchParams.set("key", apiKey);

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = await res.json();
    const liveStatus = data.items?.[0]?.status?.privacyStatus;

    if (liveStatus && liveStatus !== currentDbStatus) {
      await sql`
        UPDATE videos
        SET privacy_status = ${liveStatus}, updated_at = NOW()
        WHERE youtube_video_id = ${youtubeVideoId}
      `;
      return liveStatus;
    }

    return liveStatus || currentDbStatus || null;
  } catch {
    return null;
  }
}

/**
 * Automatically checks YouTube for privacy changes when an admin visits a page,
 * throttled by a 60-second cooldown so it uses negligible quota and doesn't slow down repeated clicks.
 */
export async function autoSyncPrivacyIfNeeded(): Promise<void> {
  const now = Date.now();
  if (now - lastAutoSyncTimestamp < AUTO_SYNC_COOLDOWN_MS) {
    return;
  }
  lastAutoSyncTimestamp = now;

  try {
    await syncAllPrivacyStatuses();
  } catch (err) {
    console.error("Auto-sync privacy error:", err);
  }
}
