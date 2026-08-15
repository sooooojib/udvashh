export interface PlaylistInfo {
  id: string;
  name: string;
  order: number;
}

export const KNOWN_PLAYLISTS: PlaylistInfo[] = [
  {
    id: "PLW__FszJXkME",
    name: "Live Class Bengali Language",
    order: 1,
  },
  {
    id: "PLJwQeUHBD7fg",
    name: "Live Class Bengali Literature",
    order: 2,
  },
  {
    id: "PLIAsi3-TmJVg",
    name: "Live Class English Language",
    order: 3,
  },
  {
    id: "PLA2-0aEeTSr8",
    name: "Live Class English Literature",
    order: 4,
  },
  {
    id: "PLAGl1YvIlysU",
    name: "Live Class Mathematical Reasoning",
    order: 5,
  },
  {
    id: "PLQt32jtf0y2o",
    name: "Live Class Mental Ability",
    order: 6,
  },
  {
    id: "PLFrZE8Zvdygk",
    name: "Live Class International Affairs",
    order: 7,
  },
  {
    id: "PLK1y2_naWSd8",
    name: "Live Class Bangladesh Affairs",
    order: 8,
  },
  {
    id: "PLY5ga8LFlsGk",
    name: "Live Class Computer and Information Technology",
    order: 9,
  },
  {
    id: "PLDJLm9cIb9hg",
    name: "Live Class General Science",
    order: 10,
  },
  {
    id: "PLO7MJY6H3NDM",
    name: "Live Class Geography, Environment and Disaster Management",
    order: 11,
  },
  {
    id: "PLBtJehYpCMFU",
    name: "Live Class Ethics, Values and Good Governance",
    order: 12,
  },
];

export function getPlaylistName(playlistId?: string | null): string {
  if (!playlistId) return "Uncategorized Playlist";
  const found = KNOWN_PLAYLISTS.find((p) => p.id === playlistId);
  return found ? found.name : `Playlist ${playlistId}`;
}
