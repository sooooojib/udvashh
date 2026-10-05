import { NextResponse, type NextRequest } from "next/server";
import { syncPlaylist, syncMultiplePlaylists } from "@/lib/youtube/sync";
import { KNOWN_PLAYLISTS } from "@/lib/youtube/playlists";

export const maxDuration = 60;

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

    // Otherwise sync all known, intensive, and subject hacks playlists
    const { INTENSIVE_PLAYLISTS } = await import(
      "@/lib/youtube/intensive-playlists"
    );
    const { SUBJECT_HACKS_PLAYLISTS } = await import(
      "@/lib/youtube/subject-hacks-playlists"
    );
    const allPlaylists = [
      ...KNOWN_PLAYLISTS,
      ...INTENSIVE_PLAYLISTS,
      ...SUBJECT_HACKS_PLAYLISTS,
    ];

    const { totalSynced, succeeded, failed, results, errors } =
      await syncMultiplePlaylists(allPlaylists, 4);

    return NextResponse.json({
      success: failed === 0 || succeeded > 0,
      totalSynced,
      succeeded,
      failed,
      playlistsProcessed: results.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
