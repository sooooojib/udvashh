import { unstable_cache } from "next/cache";
import { sql } from "@/lib/db";
import { type Video } from "@/components/dashboard/video-card";

/**
 * Fetches all videos for a list of playlists with PDF existence & count,
 * cached at the Next.js server level.
 * Invalidate with revalidateTag("videos-catalog").
 */
export async function getCachedVideosByPlaylists(playlistIds: string[]): Promise<Video[]> {
  if (!playlistIds || playlistIds.length === 0) return [];

  // Sort IDs so the cache key is stable regardless of array order
  const sortedIds = [...playlistIds].sort();
  const cacheKey = `videos-${sortedIds.join(",")}`;

  const fetcher = unstable_cache(
    async () => {
      const rows = await sql`
        SELECT 
          v.*,
          EXISTS(SELECT 1 FROM video_pdfs vp WHERE vp.video_id = v.id) AS has_pdf,
          (SELECT COUNT(*)::int FROM video_pdfs vp WHERE vp.video_id = v.id) AS pdf_count
        FROM videos v
        WHERE v.playlist_id = ANY(${sortedIds})
        ORDER BY v.position ASC
      `;
      return rows as unknown as Video[];
    },
    [cacheKey],
    {
      revalidate: 3600, // 1 hour TTL
      tags: ["videos-catalog"],
    }
  );

  return fetcher();
}

/**
 * Lightweight query for the Dashboard (id, duration, playlist_id only).
 * Invalidate with revalidateTag("videos-catalog").
 */
export async function getCachedDashboardVideos(playlistIds: string[]) {
  if (!playlistIds || playlistIds.length === 0) return [];

  const sortedIds = [...playlistIds].sort();
  const cacheKey = `dashboard-videos-${sortedIds.join(",")}`;

  const fetcher = unstable_cache(
    async () => {
      const rows = await sql`
        SELECT id, duration, playlist_id FROM videos
        WHERE playlist_id = ANY(${sortedIds})
      `;
      return rows;
    },
    [cacheKey],
    {
      revalidate: 3600, // 1 hour TTL
      tags: ["videos-catalog"],
    }
  );

  return fetcher();
}

/**
 * Fetches a single video by its YouTube video ID.
 * Caches metadata and details to avoid repeated DB hits on re-watches.
 */
export async function getCachedVideoByYoutubeId(youtubeVideoId: string) {
  if (!youtubeVideoId) return null;

  const fetcher = unstable_cache(
    async () => {
      const rows = await sql`
        SELECT * FROM videos WHERE youtube_video_id = ${youtubeVideoId} LIMIT 1
      `;
      return rows[0] || null;
    },
    [`video-detail-${youtubeVideoId}`],
    {
      revalidate: 3600,
      tags: ["videos-catalog", `video-${youtubeVideoId}`],
    }
  );

  return fetcher();
}

/**
 * Fetches playlist sibling videos for the watch page navigation list.
 */
export async function getCachedPlaylistVideos(playlistId: string) {
  if (!playlistId) return [];

  const fetcher = unstable_cache(
    async () => {
      const rows = await sql`
        SELECT youtube_video_id, title, position FROM videos
        WHERE playlist_id = ${playlistId}
        ORDER BY position ASC
      `;
      return rows;
    },
    [`playlist-videos-${playlistId}`],
    {
      revalidate: 3600,
      tags: ["videos-catalog", `playlist-${playlistId}`],
    }
  );

  return fetcher();
}
