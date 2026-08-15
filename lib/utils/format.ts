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

/**
 * Extracts class / lecture sequence number from titles like:
 * "Live Class General Science 02" → 2
 * "Live Class Bangla 01" → 1
 * "Physics Class 12" → 12
 */
export function extractClassNumber(title: string): number | null {
  if (!title) return null;
  // Match trailing number or number preceded by space/punctuation/words
  const match = title.match(/(?:class|lecture|no|part|episode|#|\s|^)[-–:]?\s*0*(\d+)(?!.*\d)/i)
    || title.match(/0*(\d+)\b/);
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    return isNaN(num) ? null : num;
  }
  return null;
}

/**
 * Natural comparator function to sort videos ascending by their class number:
 * e.g. "Live Class 01", "Live Class 02", "Live Class 03" ...
 */
export function compareVideos(
  a: { title?: string | null; position?: number },
  b: { title?: string | null; position?: number }
): number {
  const numA = extractClassNumber(a.title || "");
  const numB = extractClassNumber(b.title || "");

  if (numA !== null && numB !== null) {
    if (numA !== numB) return numA - numB;
  } else if (numA !== null) {
    return -1;
  } else if (numB !== null) {
    return 1;
  }

  // Fallback to position
  if (
    typeof a.position === "number" &&
    typeof b.position === "number" &&
    a.position !== b.position
  ) {
    return a.position - b.position;
  }

  // Natural alphabetical fallback
  return (a.title || "").localeCompare(b.title || "", undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

