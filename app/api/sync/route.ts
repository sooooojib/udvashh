import { NextResponse, type NextRequest } from "next/server";
import { syncPlaylist } from "@/lib/youtube/sync";

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

  // 2. Target Playlist ID
  const { searchParams } = new URL(request.url);
  const playlistId =
    searchParams.get("playlistId") || process.env.YT_PLAYLIST_ID;

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
    const result = await syncPlaylist(playlistId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
