/**
 * Formats a duration in seconds to a human-readable string.
 * e.g. 3665 → "1:01:05", 125 → "2:05", 45 → "0:45"
 */
export function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return "0:00";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Formats a duration in seconds to "Xh Ym" or "Ym".
 * e.g. 10200 → "2h 50m", 1800 → "30m"
 */
export function formatHoursMinutes(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return "0m";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);

  if (h > 0) {
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${m}m`;
}
