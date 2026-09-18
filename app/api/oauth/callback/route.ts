import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCodeForTokens } from "@/lib/drive/drive-upload";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:40px;text-align:center;">
        <h1 style="color:#ef4444;">Authorization Denied</h1>
        <p>${error}</p>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  if (!code) {
    return new NextResponse("Missing authorization code", { status: 400 });
  }

  try {
    const { refreshToken } = await exchangeGoogleCodeForTokens(code);

    if (refreshToken) {
      // Automatically update .env.local
      try {
        const envPath = resolve(process.cwd(), ".env.local");
        let content = readFileSync(envPath, "utf-8");

        if (content.includes("GOOGLE_DRIVE_REFRESH_TOKEN=")) {
          content = content.replace(
            /GOOGLE_DRIVE_REFRESH_TOKEN=.*/,
            `GOOGLE_DRIVE_REFRESH_TOKEN=${refreshToken}`
          );
        } else {
          content += `\nGOOGLE_DRIVE_REFRESH_TOKEN=${refreshToken}\n`;
        }

        writeFileSync(envPath, content, "utf-8");
        process.env.GOOGLE_DRIVE_REFRESH_TOKEN = refreshToken;
      } catch (fileErr) {
        console.warn("Could not write to .env.local automatically:", fileErr);
      }
    }

    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Google Drive Connected</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0f172a; color: #f8fafc;">
          <div style="background: #1e293b; padding: 40px; border-radius: 20px; text-align: center; max-width: 440px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); border: 1px solid #334155;">
            <div style="font-size: 50px; margin-bottom: 16px;">🎉</div>
            <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 10px;">Google Drive Connected!</h1>
            <p style="color: #94a3b8; font-size: 14px; line-height: 1.5; margin: 0 0 24px;">
              Your website is now authorized to upload PDFs straight to your Google Drive folder.
            </p>
            <a href="/watch/PlCPOnjp2HU" style="display: inline-block; background: #25a8a2; color: #fff; padding: 10px 24px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 14px;">
              Return to Website
            </a>
          </div>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Authentication error";
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:40px;text-align:center;">
        <h1 style="color:#ef4444;">Connection Failed</h1>
        <p>${msg}</p>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }
}
