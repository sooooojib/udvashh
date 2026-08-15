/**
 * Parses an ISO 8601 duration string (e.g., 'PT1H2M30S', 'PT15M', 'P1DT2H') into total seconds.
 * @param duration ISO 8601 duration string returned from YouTube Data API
 * @returns Total duration in seconds
 */
export function parseISO8601Duration(duration?: string | null): number {
  if (!duration) return 0;

  const match = duration.match(
    /P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/
  );

  if (!match) return 0;

  const days = parseInt(match[1] || "0", 10);
  const hours = parseInt(match[2] || "0", 10);
  const minutes = parseInt(match[3] || "0", 10);
  const seconds = parseInt(match[4] || "0", 10);

  return days * 86400 + hours * 3600 + minutes * 60 + seconds;
}
