import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
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

export async function GET(request: NextRequest) {
  // 1. Authorization: Require Bearer <SYNC_SECRET>
  const authHeader = request.headers.get("Authorization");
  const syncSecret = process.env.SYNC_SECRET;

  if (!syncSecret || !authHeader || authHeader !== `Bearer ${syncSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized. Missing or invalid Authorization Bearer header." },
      { status: 401 }
    );
  }

  // 2. Target Playlist ID and YouTube API Key
  const { searchParams } = new URL(request.url);
  const playlistId = searchParams.get("playlistId") || process.env.YT_PLAYLIST_ID;
  const apiKey = process.env.YT_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing YT_API_KEY in environment variables." },
      { status: 500 }
    );
  }

  if (!playlistId) {
    return NextResponse.json(
      {
        error:
          "Missing playlist ID. Provide ?playlistId=<id> or set YT_PLAYLIST_ID in environment variables.",
      },
      { status: 400 }
    );
  }

  try {
    // 3. Paginate through all playlistItems from YouTube Data API v3
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
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData?.error?.message || response.statusText || "YouTube API error";

        if (response.status === 403) {
          return NextResponse.json(
            {
              error: `YouTube API quota exceeded or forbidden: ${errorMessage}`,
              status: 403,
            },
            { status: 403 }
          );
        }

        if (response.status === 404) {
          return NextResponse.json(
            {
              error: `YouTube Playlist not found: ${playlistId}`,
              status: 404,
            },
            { status: 404 }
          );
        }

        return NextResponse.json(
          {
            error: `YouTube Data API error (${response.status}): ${errorMessage}`,
          },
          { status: response.status }
        );
      }

      const data = await response.json();
      if (Array.isArray(data.items)) {
        rawItems.push(...data.items);
      }

      nextPageToken = data.nextPageToken;
    } while (nextPageToken);

    // Filter out deleted/private videos where videoId is missing or title is unavailable
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
      return NextResponse.json({
        synced: 0,
        playlistId,
        message: "No valid videos found in this playlist.",
      });
    }

    // 4. Batch fetch video durations from videos.list (batches of 50)
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

    // 5. Prepare video records for upsert
    const videoRecords = validItems.map((item) => {
      const videoId = (item.contentDetails?.videoId ||
        item.snippet?.resourceId?.videoId) as string;
      const title = item.snippet?.title || "Untitled";
      const description = item.snippet?.description || "";
      const thumbnailUrl =
        item.snippet?.thumbnails?.medium?.url ||
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.default?.url ||
        "";
      const position = item.snippet?.position ?? 0;
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

    // 6. Upsert records into Supabase using the Service Role admin client
    const supabase = createAdminClient();
    const { error: upsertError } = await supabase
      .from("videos")
      .upsert(videoRecords, {
        onConflict: "youtube_video_id",
      });

    if (upsertError) {
      return NextResponse.json(
        {
          error: `Supabase database error: ${upsertError.message}`,
          details: upsertError.details,
          hint: upsertError.hint,
        },
        { status: 500 }
      );
    }

    // 7. Return summary response
    return NextResponse.json({
      synced: videoRecords.length,
      playlistId,
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
