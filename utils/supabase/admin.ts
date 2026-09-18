import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const rawUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabaseUrl = rawUrl
    ?.trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\/+$/, "");
  const serviceRoleKey = rawKey?.trim().replace(/^["']|["']$/g, "");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
