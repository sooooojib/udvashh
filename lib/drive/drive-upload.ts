/**
 * Google Drive API Client & Direct Uploader
 */

const CLIENT_ID = process.env.YT_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.YT_OAUTH_CLIENT_SECRET;
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const REDIRECT_URI = "http://localhost:3000/api/oauth/callback";
const SCOPE = "https://www.googleapis.com/auth/drive.file";

/**
 * Generates the Google OAuth authorization URL for Drive permissions
 */
export function getGoogleDriveAuthUrl(): string {
  if (!CLIENT_ID) throw new Error("Missing YT_OAUTH_CLIENT_ID");
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPE);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  return authUrl.toString();
}

/**
 * Exchanges authorization code for refresh token & access token
 */
export async function exchangeGoogleCodeForTokens(code: string): Promise<{
  refreshToken?: string;
  accessToken: string;
}> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("Missing Google OAuth credentials");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${data.error_description || data.error || "Unknown error"}`);
  }

  return {
    refreshToken: data.refresh_token,
    accessToken: data.access_token,
  };
}

/**
 * Gets a fresh access token using the stored refresh token
 */
export async function getDriveAccessToken(): Promise<string> {
  const refreshToken =
    process.env.GOOGLE_DRIVE_REFRESH_TOKEN || process.env.YT_OAUTH_REFRESH_TOKEN;

  if (!refreshToken) {
    throw new Error("Missing Google Drive Refresh Token. Please authorize first.");
  }
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("Missing Google OAuth Client ID or Secret");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Failed to refresh token: ${data.error_description || data.error}`);
  }

  return data.access_token;
}

/**
 * Directly uploads a PDF buffer to your Google Drive folder
 * and sets public view permission so students can view & download it.
 */
export async function uploadPdfToGoogleDrive({
  fileName,
  fileBuffer,
}: {
  fileName: string;
  fileBuffer: Buffer;
}): Promise<{ fileId: string; webViewLink: string }> {
  const accessToken = await getDriveAccessToken();

  const metadata: Record<string, unknown> = {
    name: fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`,
    mimeType: "application/pdf",
  };

  if (FOLDER_ID) {
    metadata.parents = [FOLDER_ID];
  }

  const boundary = "-------314159265358979323846";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartBody = Buffer.concat([
    Buffer.from(
      delimiter +
        "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
        JSON.stringify(metadata) +
        delimiter +
        "Content-Type: application/pdf\r\n\r\n"
    ),
    fileBuffer,
    Buffer.from(closeDelimiter),
  ]);

  // 1. Upload to Google Drive
  const uploadRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );

  const fileData = await uploadRes.json();
  if (!uploadRes.ok) {
    throw new Error(
      `Drive upload failed: ${fileData.error?.message || "Unknown error"}`
    );
  }

  const fileId = fileData.id;

  // 2. Set file permissions to 'anyone with the link can view'
  try {
    await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: "reader",
          type: "anyone",
        }),
      }
    );
  } catch (permErr) {
    console.warn("Could not set public permission on Drive file:", permErr);
  }

  return {
    fileId,
    webViewLink: fileData.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
  };
}

/**
 * Deletes a file from Google Drive by its file ID.
 */
export async function deleteFileFromGoogleDrive(fileId: string): Promise<void> {
  const accessToken = await getDriveAccessToken();

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  // 204 No Content = success, 404 = already gone (both are fine)
  if (!res.ok && res.status !== 404) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      `Drive delete failed: ${(data as Record<string, { message?: string }>).error?.message || `HTTP ${res.status}`}`
    );
  }
}
