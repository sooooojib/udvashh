import { NextResponse, type NextRequest } from "next/server";
import { syncPlaylist } from "@/lib/youtube/sync";
import { KNOWN_PLAYLISTS } from "@/lib/youtube/playlists";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // 1. Authorization: Accept Bearer header OR ?secret query param
  const authHeader = request.headers.get("Authorization");
  const querySecret = searchParams.get("secret");
  const syncSecret = process.env.SYNC_SECRET;

  const isHeaderValid =
    Boolean(syncSecret) &&
    Boolean(authHeader) &&
    authHeader === `Bearer ${syncSecret}`;
  const isQueryValid = Boolean(syncSecret) && querySecret === syncSecret;

  if (!isHeaderValid && !isQueryValid) {
    return NextResponse.json(
      {
        error:
          "Unauthorized. Pass Authorization: Bearer <SYNC_SECRET> header or ?secret=<SYNC_SECRET> query parameter.",
      },
      { status: 401 }
    );
  }

  // 2. Determine target playlist(s)
  const targetPlaylistId = searchParams.get("playlistId");

  try {
    // If a specific playlist is requested
    if (targetPlaylistId && targetPlaylistId !== "all") {
      const result = await syncPlaylist(targetPlaylistId);
      return NextResponse.json({ success: true, ...result });
    }

    // Otherwise sync all known and intensive playlists
    const { INTENSIVE_PLAYLISTS } = await import(
      "@/lib/youtube/intensive-playlists"
    );
    const allPlaylists = [...KNOWN_PLAYLISTS, ...INTENSIVE_PLAYLISTS];
    const results = [];
    let totalSynced = 0;

    for (const pl of allPlaylists) {
      try {
        const res = await syncPlaylist(pl.id);
        results.push({ id: pl.id, name: pl.name, ...res });
        totalSynced += res.synced || 0;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Sync error";
        results.push({ id: pl.id, name: pl.name, error: errorMsg });
      }
    }

    return NextResponse.json({
      success: true,
      totalSynced,
      playlistsProcessed: results.length,
      results,
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
