import { neon } from "@neondatabase/serverless";

function getSql() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL environment variable. Set it in .env.local");
  }
  return neon(connectionString);
}

export const sql = getSql();

