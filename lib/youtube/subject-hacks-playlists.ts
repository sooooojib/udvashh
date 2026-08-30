export interface SubjectHacksPlaylistInfo {
  id: string;
  name: string;
  order: number;
}

/**
 * Subject Hacks YouTube playlist IDs.
 * Add your actual Subject Hacks playlist IDs here.
 * These are kept separate from Live Class and Intensive Class playlists
 * so each module has its own independent set of content.
 */
export const SUBJECT_HACKS_PLAYLISTS: SubjectHacksPlaylistInfo[] = [
  {
    id: "PLUaODtrGf1xA",
    name: "Subject Hacks",
    order: 1,
  },
];

export function getSubjectHacksPlaylistName(
  playlistId?: string | null
): string {
  if (!playlistId) return "Uncategorized Playlist";
  const found = SUBJECT_HACKS_PLAYLISTS.find((p) => p.id === playlistId);
  return found ? found.name : `Playlist ${playlistId}`;
}
