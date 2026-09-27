import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();
    // Query storage buckets to register active compute & storage usage in Supabase
    const { data, error } = await supabase.storage.listBuckets();

    if (error) {
      console.warn("Supabase keep-alive ping returned error:", error);
      return NextResponse.json(
        {
          success: false,
          status: "Supabase returned an error (project may be paused)",
          error: error.message,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      status: "Supabase is active and healthy",
      timestamp: new Date().toISOString(),
      bucketCount: data?.length || 0,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Keep-alive exception:", err);
    return NextResponse.json(
      {
        success: false,
        status: "Cannot reach Supabase (check if project is restored in dashboard)",
        error: msg,
      },
      { status: 500 }
    );
  }
}
