import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createDriveResumableSession } from "@/lib/drive/drive-upload";

function isAdmin(sessionEmail?: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return true;
  const allowedEmails = adminEmail.split(",").map((e) => e.trim().toLowerCase());
  return allowedEmails.includes(sessionEmail?.toLowerCase() || "");
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    if (!isAdmin(session.email)) {
      return NextResponse.json(
        { success: false, message: "Forbidden. Admin access required." },
        { status: 403 }
      );
    }

    const { fileName, fileSize } = await request.json();

    if (!fileName || !fileSize) {
      return NextResponse.json(
        { success: false, message: "Missing fileName or fileSize." },
        { status: 400 }
      );
    }

    const sessionUrl = await createDriveResumableSession({
      fileName,
      fileSize: Number(fileSize),
    });

    return NextResponse.json({
      success: true,
      sessionUrl,
    });
  } catch (err: unknown) {
    console.error("Error creating Drive resumable session:", err);
    const msg =
      err instanceof Error ? err.message : "Failed to initiate Drive upload.";
    return NextResponse.json(
      { success: false, message: msg },
      { status: 500 }
    );
  }
}
