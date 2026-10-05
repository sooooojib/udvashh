import { sql } from "@/lib/db";
import { parseISO8601Duration } from "@/lib/youtube/duration";
import { compareVideos } from "@/lib/utils/format";

interface YouTubePlaylistItem {
  snippet?: {
    title?: string;
    description?: string;
    position?: number;
    publishedAt?: string;
    resourceId?: {
      videoId?: string;
    };
    thumbnails?: {
      default?: { url?: string };
      medium?: { url?: string };
      high?: { url?: string };
      standard?: { url?: string };
      maxres?: { url?: string };
    };
  };
  contentDetails?: {
    videoId?: string;
    videoPublishedAt?: string;
  };
}

interface YouTubeVideoItem {
  id: string;
  contentDetails?: {
    duration?: string;
  };
  status?: {
    privacyStatus?: string;
    uploadStatus?: string;
  };
}

export interface SyncResult {
  synced: number;
  playlistId: string;
  message?: string;
}

export async function syncPlaylist(playlistId: string): Promise<SyncResult> {
  const apiKey = process.env.YT_API_KEY || process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    throw new Error("Missing YT_API_KEY or YOUTUBE_API_KEY in environment variables.");
  }

  if (!playlistId) {
    throw new Error("Missing playlist ID.");
  }

  // 1. Paginate through all playlistItems from YouTube Data API v3 (strictly guarded)
  const rawItems: YouTubePlaylistItem[] = [];
  let nextPageToken: string | undefined = undefined;
  const seenPageTokens = new Set<string>();
  const MAX_PAGES = 10; // Max 500 videos per playlist; protects against YouTube circular pagination
  let pageCount = 0;

  do {
    pageCount++;
    if (nextPageToken) {
      if (seenPageTokens.has(nextPageToken)) {
        console.warn(`[Sync] Detected circular nextPageToken "${nextPageToken}" for playlist ${playlistId}. Terminating pagination.`);
        break;
      }
      seenPageTokens.add(nextPageToken);
    }

    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("part", "snippet,contentDetails");
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("playlistId", playlistId);
    url.searchParams.set("key", apiKey);
    if (nextPageToken) {
      url.searchParams.set("pageToken", nextPageToken);
    }

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData?.error?.message || response.statusText || "YouTube API error";

      if (response.status === 403) {
        const cleanMsg = (errorMessage || "").replace(/<[^>]*>/g, "").trim();
        if (cleanMsg.toLowerCase().includes("quota")) {
          throw new Error("YouTube API daily quota (10,000 units/day) exceeded. Google resets this at midnight Pacific Time (PT). You can provide a fresh YT_API_KEY in .env.local to continue.");
        }
        throw new Error(`YouTube API access forbidden (403): ${cleanMsg}`);
      }

      if (response.status === 404) {
        throw new Error(`YouTube Playlist not found: ${playlistId}`);
      }

      throw new Error(`YouTube Data API error (${response.status}): ${errorMessage}`);
    }

    const data = await response.json();
    const fetchedItems = Array.isArray(data.items) ? data.items : [];
    rawItems.push(...fetchedItems);

    // Guard 1: If YouTube returned fewer items than maxResults (50), we have reached
    // the end of the playlist. This completely ignores YouTube's phantom nextPageToken
    // bug caused by private/deleted video placeholders.
    if (fetchedItems.length < 50) {
      break;
    }

    // Guard 2: If we've collected at least totalResults items, stop immediately.
    if (data.pageInfo?.totalResults && rawItems.length >= data.pageInfo.totalResults) {
      break;
    }

    // Guard 3: Stop if token is missing or identical to previous token
    if (!data.nextPageToken || data.nextPageToken === nextPageToken) {
      break;
    }

    nextPageToken = data.nextPageToken;
  } while (nextPageToken && pageCount < MAX_PAGES);

  // Filter out deleted/private placeholders from playlist items
  const candidateItems = rawItems.filter((item) => {
    const videoId =
      item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
    const title = item.snippet?.title;
    return (
      Boolean(videoId) &&
      title !== "Private video" &&
      title !== "Deleted video"
    );
  });

  // 2. Batch fetch video status & durations from videos.list (batches of 50 in parallel)
  // This verifies whether the videos are actually live, playable, and not deleted on YouTube.
  const videoIds = candidateItems.map(
    (item) =>
      (item.contentDetails?.videoId ||
        item.snippet?.resourceId?.videoId) as string
  );

  const durationMap = new Map<string, number>();
  const privacyMap = new Map<string, string>();
  const activeVideoIds = new Set<string>();
  const batchSize = 50;

  const chunks: string[][] = [];
  for (let i = 0; i < videoIds.length; i += batchSize) {
    chunks.push(videoIds.slice(i, i + batchSize));
  }

  await Promise.all(
    chunks.map(async (chunk) => {
      const videoUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
      videoUrl.searchParams.set("part", "contentDetails,status");
      videoUrl.searchParams.set("id", chunk.join(","));
      videoUrl.searchParams.set("key", apiKey);

      const videoRes = await fetch(videoUrl.toString(), {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!videoRes.ok) {
        const errorData = await videoRes.json().catch(() => ({}));
        const errorMessage =
          errorData?.error?.message || videoRes.statusText || "YouTube API error";
        if (videoRes.status === 403) {
          const cleanMsg = (errorMessage || "").replace(/<[^>]*>/g, "").trim();
          if (cleanMsg.toLowerCase().includes("quota")) {
            throw new Error(
              "YouTube API daily quota (10,000 units/day) exceeded. Google resets this at midnight Pacific Time (PT). You can provide a fresh YT_API_KEY in .env.local to continue."
            );
          }
          throw new Error(`YouTube API access forbidden (403): ${cleanMsg}`);
        }
        throw new Error(
          `YouTube videos.list API error (${videoRes.status}): ${errorMessage}`
        );
      }

      const videoData = await videoRes.json();
      if (Array.isArray(videoData.items)) {
        videoData.items.forEach((vItem: YouTubeVideoItem) => {
          // Skip if explicitly marked private or rejected/deleted
          if (vItem.status?.privacyStatus === "private") return;
          if (
            vItem.status?.uploadStatus === "rejected" ||
            vItem.status?.uploadStatus === "deleted"
          ) {
            return;
          }

          activeVideoIds.add(vItem.id);
          const rawDuration = vItem.contentDetails?.duration;
          durationMap.set(vItem.id, parseISO8601Duration(rawDuration));
          if (vItem.status?.privacyStatus) {
            privacyMap.set(vItem.id, vItem.status.privacyStatus);
          }
        });
      }
    })
  );

  // Only keep items that are confirmed active & available by YouTube
  const validItems = candidateItems.filter((item) => {
    const videoId = (item.contentDetails?.videoId ||
      item.snippet?.resourceId?.videoId) as string;
    return videoId && activeVideoIds.has(videoId);
  });

  // If YouTube explicitly returned 0 candidate videos, prune all videos for this playlist
  if (candidateItems.length === 0) {
    await sql`
      DELETE FROM videos
      WHERE playlist_id = ${playlistId}
    `;
    return {
      synced: 0,
      playlistId,
      message: "Playlist is empty on YouTube. Removed any old videos from database.",
    };
  }

  // Safety guard: if candidate items exist but valid items is 0, do NOT delete database records
  if (validItems.length === 0) {
    throw new Error(
      `Could not verify active videos for playlist ${playlistId}. Aborting sync to prevent data loss.`
    );
  }

  // 3. Sort items naturally by class number (e.g. 01, 02, 03) and prepare records for upsert
  validItems.sort((a, b) =>
    compareVideos(
      { title: a.snippet?.title, position: a.snippet?.position },
      { title: b.snippet?.title, position: b.snippet?.position }
    )
  );

  const videoRecords = validItems.map((item, idx) => {
    const videoId = (item.contentDetails?.videoId ||
      item.snippet?.resourceId?.videoId) as string;
    const title = item.snippet?.title || "Untitled";
    const description = item.snippet?.description || "";
    const thumbnailUrl =
      item.snippet?.thumbnails?.medium?.url ||
      item.snippet?.thumbnails?.high?.url ||
      item.snippet?.thumbnails?.default?.url ||
      "";
    const position = idx;
    const publishedAt =
      item.contentDetails?.videoPublishedAt ||
      item.snippet?.publishedAt ||
      null;
    const duration = durationMap.get(videoId) || 0;
    const privacyStatus = privacyMap.get(videoId) || "unlisted";

    return {
      youtube_video_id: videoId,
      playlist_id: playlistId,
      title,
      description,
      thumbnail_url: thumbnailUrl,
      position,
      duration,
      privacy_status: privacyStatus,
      published_at: publishedAt ? new Date(publishedAt).toISOString() : null,
      updated_at: new Date().toISOString(),
    };
  });

  // 4. Bulk upsert valid records into Neon in a single round-trip using unnest
  const videoIdsList = videoRecords.map((r) => r.youtube_video_id);
  const playlistIdsList = videoRecords.map((r) => r.playlist_id);
  const titlesList = videoRecords.map((r) => r.title);
  const descriptionsList = videoRecords.map((r) => r.description);
  const thumbnailUrlsList = videoRecords.map((r) => r.thumbnail_url);
  const positionsList = videoRecords.map((r) => r.position);
  const durationsList = videoRecords.map((r) => r.duration);
  const privacyStatusesList = videoRecords.map((r) => r.privacy_status);
  const publishedAtsList = videoRecords.map((r) => r.published_at);
  const updatedAtsList = videoRecords.map((r) => r.updated_at);

  await sql`
    INSERT INTO videos (
      youtube_video_id, playlist_id, title, description,
      thumbnail_url, position, duration, privacy_status, published_at, updated_at
    )
    SELECT * FROM unnest(
      ${videoIdsList}::text[],
      ${playlistIdsList}::text[],
      ${titlesList}::text[],
      ${descriptionsList}::text[],
      ${thumbnailUrlsList}::text[],
      ${positionsList}::int[],
      ${durationsList}::int[],
      ${privacyStatusesList}::text[],
      ${publishedAtsList}::timestamptz[],
      ${updatedAtsList}::timestamptz[]
    )
    ON CONFLICT (youtube_video_id) DO UPDATE SET
      playlist_id    = EXCLUDED.playlist_id,
      title          = EXCLUDED.title,
      description    = EXCLUDED.description,
      thumbnail_url  = EXCLUDED.thumbnail_url,
      position       = EXCLUDED.position,
      duration       = EXCLUDED.duration,
      privacy_status = EXCLUDED.privacy_status,
      published_at   = EXCLUDED.published_at,
      updated_at     = EXCLUDED.updated_at
  `;

  // 5. Clean up removed/deleted videos:
  // Delete any records currently in the database for this playlist that are no longer in YouTube's active list
  const currentVideoIds = videoRecords.map((r) => r.youtube_video_id);
  await sql`
    DELETE FROM videos
    WHERE playlist_id = ${playlistId}
      AND NOT (youtube_video_id = ANY(${currentVideoIds}))
  `;

  return {
    synced: videoRecords.length,
    playlistId,
  };
}

export interface MultiSyncResult {
  totalSynced: number;
  succeeded: number;
  failed: number;
  results: {
    id: string;
    name?: string;
    synced?: number;
    error?: string;
  }[];
  errors: { id: string; name?: string; error: string }[];
}

/**
 * Concurrently syncs multiple playlists with a worker pool (default concurrency: 4).
 * This prevents sequential waterfalls while keeping YouTube API requests and DB connections well within limits.
 */
export async function syncMultiplePlaylists(
  playlists: { id: string; name?: string }[],
  concurrency = 4
): Promise<MultiSyncResult> {
  const queue = [...playlists];
  const results: {
    id: string;
    name?: string;
    synced?: number;
    error?: string;
  }[] = [];
  const errors: { id: string; name?: string; error: string }[] = [];

  const workerCount = Math.min(concurrency, Math.max(1, playlists.length));
  const workers = Array.from({ length: workerCount }, async () => {
    while (queue.length > 0) {
      const pl = queue.shift();
      if (!pl) break;

      try {
        const res = await syncPlaylist(pl.id);
        results.push({ id: pl.id, name: pl.name, synced: res.synced });
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error ? err.message : "Unknown sync error";
        console.warn(
          `[Sync] Failed to sync playlist ${pl.id} (${pl.name || "unnamed"}): ${errorMsg}`
        );
        errors.push({ id: pl.id, name: pl.name, error: errorMsg });
        results.push({ id: pl.id, name: pl.name, error: errorMsg });
      }
    }
  });

  await Promise.all(workers);

  const totalSynced = results.reduce((acc, r) => acc + (r.synced || 0), 0);
  const succeeded = results.filter((r) => typeof r.synced === "number").length;

  return {
    totalSynced,
    succeeded,
    failed: errors.length,
    results,
    errors,
  };
}
