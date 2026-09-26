/**
 * Google Drive API Client & Direct Uploader
 */

function cleanEnv(val?: string): string {
  if (!val) return "";
  return val.trim().replace(/^["']|["']$/g, "");
}

export function getDriveConfig() {
  const clientId = cleanEnv(
    process.env.GOOGLE_DRIVE_CLIENT_ID ||
      process.env.YT_OAUTH_CLIENT_ID ||
      process.env.GOOGLE_CLIENT_ID
  );
  const clientSecret = cleanEnv(
    process.env.GOOGLE_DRIVE_CLIENT_SECRET ||
      process.env.YT_OAUTH_CLIENT_SECRET ||
      process.env.GOOGLE_CLIENT_SECRET
  );
  const refreshToken = cleanEnv(
    process.env.GOOGLE_DRIVE_REFRESH_TOKEN ||
      process.env.YT_OAUTH_REFRESH_TOKEN
  );
  const folderId = cleanEnv(process.env.GOOGLE_DRIVE_FOLDER_ID);

  return { clientId, clientSecret, refreshToken, folderId };
}

const REDIRECT_URI = "http://localhost:3000/api/oauth/callback";
const SCOPE = "https://www.googleapis.com/auth/drive.file";

/**
 * Generates the Google OAuth authorization URL for Drive permissions
 */
export function getGoogleDriveAuthUrl(): string {
  const { clientId } = getDriveConfig();
  if (!clientId) throw new Error("Missing Google OAuth Client ID");
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
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
  const { clientId, clientSecret } = getDriveConfig();
  if (!clientId || !clientSecret) {
    throw new Error("Missing Google OAuth credentials");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
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
  const { clientId, clientSecret, refreshToken } = getDriveConfig();

  if (!refreshToken) {
    throw new Error("Missing Google Drive Refresh Token. Please authorize first.");
  }
  if (!clientId || !clientSecret) {
    throw new Error("Missing Google OAuth Client ID or Secret");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Failed to refresh Google token:", {
      status: res.status,
      data,
      clientIdPrefix: clientId.slice(0, 15),
      clientIdLength: clientId.length,
    });
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

  const { folderId } = getDriveConfig();
  if (folderId) {
    metadata.parents = [folderId];
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
  if (fileId) {
    await setDriveFilePublic(fileId);
  }

  return {
    fileId,
    webViewLink: fileData.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
  };
}

/**
 * Sets public view permissions on a Drive file
 */
export async function setDriveFilePublic(fileId: string): Promise<void> {
  const accessToken = await getDriveAccessToken();
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

/**
 * Initiates a Google Drive Resumable Upload session.
 * Returns the session URL (Location header) where chunks can be PUT.
 */
export async function createDriveResumableSession({
  fileName,
  fileSize,
}: {
  fileName: string;
  fileSize: number;
}): Promise<string> {
  const accessToken = await getDriveAccessToken();

  const metadata: Record<string, unknown> = {
    name: fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`,
    mimeType: "application/pdf",
  };

  const { folderId } = getDriveConfig();
  if (folderId) {
    metadata.parents = [folderId];
  }

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": "application/pdf",
        "X-Upload-Content-Length": String(fileSize),
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      `Failed to initiate Drive upload: ${(data as { error?: { message?: string } })?.error?.message || `HTTP ${res.status}`}`
    );
  }

  const sessionUrl = res.headers.get("location");
  if (!sessionUrl) {
    throw new Error("Google Drive did not return a resumable session URL.");
  }

  return sessionUrl;
}

/**
 * Sends a single chunk to the Google Drive resumable session URL.
 */
export async function sendDriveChunk({
  sessionUrl,
  chunkBuffer,
  rangeStart,
  rangeEnd,
  totalSize,
}: {
  sessionUrl: string;
  chunkBuffer: Buffer;
  rangeStart: number;
  rangeEnd: number;
  totalSize: number;
}): Promise<{
  done: boolean;
  fileId?: string;
  webViewLink?: string;
}> {
  if (!sessionUrl.startsWith("https://www.googleapis.com/upload/drive/v3/files")) {
    throw new Error("Invalid Drive upload session URL.");
  }

  const res = await fetch(sessionUrl, {
    method: "PUT",
    headers: {
      "Content-Range": `bytes ${rangeStart}-${rangeEnd}/${totalSize}`,
      "Content-Length": String(chunkBuffer.length),
      "Content-Type": "application/pdf",
    },
    body: new Uint8Array(chunkBuffer),
  });

  // 308 Resume Incomplete = chunk received, more chunks needed
  if (res.status === 308) {
    return { done: false };
  }

  // 200 or 201 = upload finished successfully
  if (res.ok) {
    const fileData = await res.json();
    const fileId = fileData.id;
    if (fileId) {
      await setDriveFilePublic(fileId);
    }
    return {
      done: true,
      fileId,
      webViewLink:
        fileData.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
    };
  }

  const errData = await res.json().catch(() => ({}));
  throw new Error(
    `Drive chunk upload failed: ${(errData as { error?: { message?: string } })?.error?.message || `HTTP ${res.status}`}`
  );
}

