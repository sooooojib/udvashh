import { neon, neonConfig } from "@neondatabase/serverless";
import type { NeonQueryFunction } from "@neondatabase/serverless";

// Configure Neon client to be resilient against transient network drops,
// socket resets (keep-alive timeouts), and cold-start wakeups.
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 250;

neonConfig.fetchFunction = async (input: RequestInfo | URL, init?: RequestInit) => {
  let attempt = 0;
  while (true) {
    try {
      return await fetch(input, {
        cache: "no-store",
        ...init,
      });
    } catch (err: unknown) {
      attempt++;
      if (attempt > MAX_RETRIES) {
        console.error(
          `[NeonDB] Network request failed after ${MAX_RETRIES} retries:`,
          err
        );
        throw err;
      }

      // Exponential backoff with jitter
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1) + Math.random() * 100;
      console.warn(
        `[NeonDB] Fetch failed (attempt ${attempt}/${MAX_RETRIES}), retrying in ${Math.round(delay)}ms... Cause:`,
        (err as { cause?: unknown })?.cause || (err as Error)?.message || err
      );
      await new Promise((res) => setTimeout(res, delay));
    }
  }
};

// Lazily initialize the Neon client so it doesn't throw at build time.
// The client is created on first use, not on import.
let _sql: NeonQueryFunction<false, false> | null = null;

function getClient(): NeonQueryFunction<false, false> {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "Missing DATABASE_URL environment variable. Set it in .env.local or your deployment environment."
      );
    }
    _sql = neon(url);
  }
  return _sql;
}

// Proxy that lazily creates the Neon client on first call.
// Supports both tagged template literals (sql`...`) and method calls (sql.transaction).
export const sql: NeonQueryFunction<false, false> = new Proxy(
  (() => {}) as unknown as NeonQueryFunction<false, false>,
  {
    apply(_target, thisArg, args) {
      return (getClient() as unknown as (...a: unknown[]) => unknown).apply(thisArg, args);
    },
    get(_target, prop) {
      const client = getClient();
      const value = (client as unknown as Record<string | symbol, unknown>)[prop];
      return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(client) : value;
    },
  }
);

