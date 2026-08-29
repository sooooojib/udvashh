import { neon } from "@neondatabase/serverless";
import type { NeonQueryFunction } from "@neondatabase/serverless";

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
