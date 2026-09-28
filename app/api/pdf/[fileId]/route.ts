import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ fileId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { fileId } = await params;

  if (!fileId || !/^[a-zA-Z0-9_-]{10,60}$/.test(fileId)) {
    return NextResponse.json({ error: "Invalid file ID" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") || "document";
  const safeFilename =
    title.replace(/[^a-zA-Z0-9_\-\. ]/g, "_").trim() || "document";
  const filename = safeFilename.endsWith(".pdf")
    ? safeFilename
    : `${safeFilename}.pdf`;

  // Forward range header if client requested byte ranges
  const outgoingHeaders: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  };
  const clientRange = req.headers.get("range");
  if (clientRange) {
    outgoingHeaders["Range"] = clientRange;
  }

  // Google Direct Download URL
  const driveUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&authuser=0`;

  try {
    let driveRes = await fetch(driveUrl, {
      headers: outgoingHeaders,
      redirect: "follow",
    });

    // Fallback if needed
    if (!driveRes.ok && driveRes.status !== 206) {
      const fallbackUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      driveRes = await fetch(fallbackUrl, {
        headers: outgoingHeaders,
        redirect: "follow",
      });
    }

    if (!driveRes.ok && driveRes.status !== 206) {
      return NextResponse.json(
        { error: "Failed to stream PDF from Google Drive" },
        { status: driveRes.status }
      );
    }

    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", "application/pdf");
    responseHeaders.set(
      "Content-Disposition",
      `inline; filename="${filename}"`
    );
    responseHeaders.set("Accept-Ranges", "bytes");
    responseHeaders.set(
      "Cache-Control",
      "public, max-age=86400, stale-while-revalidate=604800"
    );

    const contentLength = driveRes.headers.get("content-length");
    if (contentLength) {
      responseHeaders.set("Content-Length", contentLength);
    }

    const contentRange = driveRes.headers.get("content-range");
    if (contentRange) {
      responseHeaders.set("Content-Range", contentRange);
    }

    return new Response(driveRes.body, {
      status: driveRes.status,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("PDF streaming error:", error);
    return NextResponse.json(
      { error: "Error streaming PDF: " + (error?.message || "Unknown error") },
      { status: 500 }
    );
  }
}

export async function HEAD(req: NextRequest, { params }: RouteParams) {
  const { fileId } = await params;
  if (!fileId || !/^[a-zA-Z0-9_-]{10,60}$/.test(fileId)) {
    return new Response(null, { status: 400 });
  }

  const driveUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&authuser=0`;
  try {
    const driveRes = await fetch(driveUrl, {
      method: "HEAD",
      redirect: "follow",
    });
    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set("Accept-Ranges", "bytes");
    const len = driveRes.headers.get("content-length");
    if (len) headers.set("Content-Length", len);
    return new Response(null, { status: 200, headers });
  } catch {
    return new Response(null, { status: 500 });
  }
}
