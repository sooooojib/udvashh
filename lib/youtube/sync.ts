import { sql } from "@/lib/db";
import { parseISO8601Duration } from "@/lib/youtube/duration";


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
}

export interface SyncResult {
  synced: number;
  playlistId: string;
  message?: string;
}

export async function syncPlaylist(playlistId: string): Promise<SyncResult> {
  const apiKey = process.env.YT_API_KEY;

  if (!apiKey) {
    throw new Error("Missing YT_API_KEY in environment variables.");
  }

  if (!playlistId) {
    throw new Error("Missing playlist ID.");
  }

  // 1. Paginate through all playlistItems from YouTube Data API v3
  const rawItems: YouTubePlaylistItem[] = [];
  let nextPageToken: string | undefined = undefined;

  do {
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
        throw new Error(`YouTube API quota exceeded or forbidden: ${errorMessage}`);
      }

      if (response.status === 404) {
        throw new Error(`YouTube Playlist not found: ${playlistId}`);
      }

      throw new Error(`YouTube Data API error (${response.status}): ${errorMessage}`);
    }

    const data = await response.json();
    if (Array.isArray(data.items)) {
      rawItems.push(...data.items);
    }

    nextPageToken = data.nextPageToken;
  } while (nextPageToken);

  // Filter out deleted/private videos
  const validItems = rawItems.filter((item) => {
    const videoId =
      item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
    const title = item.snippet?.title;
    return (
      Boolean(videoId) &&
      title !== "Private video" &&
      title !== "Deleted video"
    );
  });

  if (validItems.length === 0) {
    return {
      synced: 0,
      playlistId,
      message: "No valid videos found in this playlist.",
    };
  }

  // 2. Batch fetch video durations from videos.list (batches of 50)
  const videoIds = validItems.map(
    (item) =>
      (item.contentDetails?.videoId ||
        item.snippet?.resourceId?.videoId) as string
  );

  const durationMap = new Map<string, number>();
  const batchSize = 50;

  for (let i = 0; i < videoIds.length; i += batchSize) {
    const chunk = videoIds.slice(i, i + batchSize);
    const videoUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    videoUrl.searchParams.set("part", "contentDetails");
    videoUrl.searchParams.set("id", chunk.join(","));
    videoUrl.searchParams.set("key", apiKey);

    const videoRes = await fetch(videoUrl.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (videoRes.ok) {
      const videoData = await videoRes.json();
      if (Array.isArray(videoData.items)) {
        videoData.items.forEach((vItem: YouTubeVideoItem) => {
          const rawDuration = vItem.contentDetails?.duration;
          durationMap.set(vItem.id, parseISO8601Duration(rawDuration));
        });
      }
    }
  }

  // 3. Sort items naturally by class number (e.g. 01, 02, 03) and prepare records for upsert
  const { compareVideos } = await import("@/lib/utils/format");
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

    return {
      youtube_video_id: videoId,
      playlist_id: playlistId,
      title,
      description,
      thumbnail_url: thumbnailUrl,
      position,
      duration,
      published_at: publishedAt,
      updated_at: new Date().toISOString(),
    };
  });

  // 4. Upsert records into Neon using SQL
  for (const record of videoRecords) {
    await sql`
      INSERT INTO videos (
        youtube_video_id, playlist_id, title, description,
        thumbnail_url, position, duration, published_at, updated_at
      ) VALUES (
        ${record.youtube_video_id},
        ${record.playlist_id},
        ${record.title},
        ${record.description},
        ${record.thumbnail_url},
        ${record.position},
        ${record.duration},
        ${record.published_at ? new Date(record.published_at).toISOString() : null},
        ${record.updated_at}
      )
      ON CONFLICT (youtube_video_id) DO UPDATE SET
        playlist_id   = EXCLUDED.playlist_id,
        title         = EXCLUDED.title,
        description   = EXCLUDED.description,
        thumbnail_url = EXCLUDED.thumbnail_url,
        position      = EXCLUDED.position,
        duration      = EXCLUDED.duration,
        published_at  = EXCLUDED.published_at,
        updated_at    = EXCLUDED.updated_at
    `;
  }

  return {
    synced: videoRecords.length,
    playlistId,
  };
}

