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

/**
 * Fetches all PDFs for a specific video, cached at the Next.js server level.
 * Prevents repetitive DB hits on routine watch page visits.
 * Invalidate with revalidateTag("video-pdfs", "default") or revalidateTag(`video-pdfs-${videoId}`, "default").
 */
export async function getCachedVideoPdfs(videoId: string) {
  if (!videoId) return [];

  const fetcher = unstable_cache(
    async () => {
      const rows = await sql`
        SELECT * FROM video_pdfs
        WHERE video_id = ${videoId}
        ORDER BY created_at ASC
      `;
      return rows;
    },
    [`video-pdfs-${videoId}`],
    {
      revalidate: 3600, // 1 hour TTL
      tags: ["videos-catalog", "video-pdfs", `video-pdfs-${videoId}`],
    }
  );

  return fetcher();
}

/**
 * Fetches a user's watched video IDs, cached at the Next.js server level.
 * Avoids repeated Neon wakeups when navigating between Dashboard and Class pages.
 * Invalidate with revalidateTag(`user-progress-${userId}`, "default").
 */
export async function getCachedWatchedVideoIds(userId: string): Promise<string[]> {
  if (!userId) return [];

  const fetcher = unstable_cache(
    async () => {
      const rows = await sql`
        SELECT video_id FROM watch_progress
        WHERE user_id = ${userId} AND watched = true
      `;
      return rows.map((r: any) => r.video_id as string);
    },
    [`user-watched-${userId}`],
    {
      revalidate: 300, // 5 minutes TTL
      tags: [`user-progress-${userId}`],
    }
  );

  return fetcher();
}
