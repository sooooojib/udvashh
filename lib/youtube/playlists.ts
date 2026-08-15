export interface PlaylistInfo {
  id: string;
  name: string;
  order: number;
}

export const KNOWN_PLAYLISTS: PlaylistInfo[] = [
  {
    id: "PLFrZE8Zvdygk",
    name: "Live Class International Affairs",
    order: 1,
  },
  {
    id: "PLK1y2_naWSd8",
    name: "Live Class Bangladesh Affairs",
    order: 2,
  },
  {
    id: "PLAGl1YvIlysU",
    name: "Live Class Mathematical Reasoning",
    order: 3,
  },
  {
    id: "PLQt32jtf0y2o",
    name: "Live Class Mental Ability",
    order: 4,
  },
  {
    id: "PLY5ga8LFlsGk",
    name: "Live Class Computer and Information Technology",
    order: 5,
  },
  {
    id: "PLDJLm9cIb9hg",
    name: "Live Class General Science",
    order: 6,
  },
  {
    id: "PLO7MJY6H3NDM",
    name: "Live Class Geography, Environment and Disaster Management",
    order: 7,
  },
];

export function getPlaylistName(playlistId?: string | null): string {
  if (!playlistId) return "Uncategorized Playlist";
  const found = KNOWN_PLAYLISTS.find((p) => p.id === playlistId);
  return found ? found.name : `Playlist ${playlistId}`;
}
