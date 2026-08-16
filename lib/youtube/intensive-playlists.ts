export interface IntensivePlaylistInfo {
  id: string;
  name: string;
  order: number;
}

/**
 * Intensive Class YouTube playlist IDs.
 * Add your actual Intensive Class playlist IDs here.
 * These are kept separate from the Live Class playlists
 * so each module has its own independent set of content.
 */
export const INTENSIVE_PLAYLISTS: IntensivePlaylistInfo[] = [
  {
    id: "PLFoyJMtARF44",
    name: "Intensive Class Bangla",
    order: 1,
  },
  {
    id: "PLVJOsXEESFf8",
    name: "Intensive Class English",
    order: 2,
  },
];

export function getIntensivePlaylistName(
  playlistId?: string | null
): string {
  if (!playlistId) return "Uncategorized Playlist";
  const found = INTENSIVE_PLAYLISTS.find((p) => p.id === playlistId);
  return found ? found.name : `Playlist ${playlistId}`;
}
