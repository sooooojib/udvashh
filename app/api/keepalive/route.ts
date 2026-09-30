import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();

  // Ping Supabase Storage + Neon DB in parallel
  const [supabaseResult, neonResult] = await Promise.allSettled([
    // 1. Supabase Storage ping
    (async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase.storage.listBuckets();
      if (error) throw new Error(error.message);
      return { buckets: data?.length ?? 0 };
    })(),

    // 2. Neon DB ping
    (async () => {
      const rows = await sql`SELECT COUNT(*) AS total FROM exams`;
      return { examCount: Number(rows[0]?.total ?? 0) };
    })(),
  ]);

  const elapsed = Date.now() - started;

  const supabase = supabaseResult.status === "fulfilled"
    ? { ok: true, ...supabaseResult.value }
    : { ok: false, error: (supabaseResult.reason as Error)?.message };

  const neon = neonResult.status === "fulfilled"
    ? { ok: true, ...neonResult.value }
    : { ok: false, error: (neonResult.reason as Error)?.message };

  const allHealthy = supabase.ok && neon.ok;

  return NextResponse.json(
    {
      success: allHealthy,
      timestamp: new Date().toISOString(),
      elapsedMs: elapsed,
      services: { supabase, neon },
    },
    { status: allHealthy ? 200 : 502 }
  );
}
