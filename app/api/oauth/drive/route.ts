import { NextResponse } from "next/server";
import { getGoogleDriveAuthUrl } from "@/lib/drive/drive-upload";

export async function GET() {
  try {
    const url = getGoogleDriveAuthUrl();
    return NextResponse.redirect(url);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to generate Google Drive auth URL";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
