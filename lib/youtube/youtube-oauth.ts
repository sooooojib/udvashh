/**
 * YouTube OAuth 2.0 Client Helper
 * Handles automatic token refreshing and video privacy status updates.
 */

interface CachedToken {
  accessToken: string;
  expiresAt: number; // Unix timestamp in ms
}

let cachedToken: CachedToken | null = null;

/**
 * Retrieves a valid access token using the stored refresh token.
 * Reuses cached access tokens until 5 minutes before expiration.
 */
export async function getYouTubeAccessToken(): Promise<string> {
  const clientId = process.env.YT_OAUTH_CLIENT_ID;
  const clientSecret = process.env.YT_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.YT_OAUTH_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing YouTube OAuth credentials. Ensure YT_OAUTH_CLIENT_ID, YT_OAUTH_CLIENT_SECRET, and YT_OAUTH_REFRESH_TOKEN are set in .env.local"
    );
  }

  // Return cached token if valid (buffer of 5 minutes / 300,000 ms)
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 300_000) {
    return cachedToken.accessToken;
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      `Failed to refresh YouTube access token (${response.status}): ${
        errorBody.error_description || errorBody.error || response.statusText
      }`
    );
  }

  const data = await response.json();
  const accessToken = data.access_token as string;
  const expiresIn = (data.expires_in as number) || 3600;

  cachedToken = {
    accessToken,
    expiresAt: now + expiresIn * 1000,
  };

  return accessToken;
}

export type VideoPrivacyStatus = "public" | "unlisted" | "private";

/**
 * Updates the privacy status of a YouTube video using YouTube Data API v3.
 * Costs 50 quota units.
 */
export async function updateVideoPrivacy(
  videoId: string,
  privacyStatus: VideoPrivacyStatus
): Promise<{ success: boolean; videoId: string; privacyStatus: VideoPrivacyStatus }> {
  if (!videoId) {
    throw new Error("Video ID is required");
  }

  const accessToken = await getYouTubeAccessToken();

  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "status");

  const response = await fetch(url.toString(), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      id: videoId,
      status: {
        privacyStatus,
        embeddable: true,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage =
      errorData?.error?.message ||
      errorData?.error?.errors?.[0]?.message ||
      response.statusText;

    if (response.status === 403) {
      throw new Error(`YouTube API permission denied or quota exceeded: ${errorMessage}`);
    }

    if (response.status === 404) {
      throw new Error(`YouTube video not found: ${videoId}`);
    }

    throw new Error(`YouTube API update error (${response.status}): ${errorMessage}`);
  }

  const data = await response.json();
  const updatedStatus = data?.status?.privacyStatus || privacyStatus;

  return {
    success: true,
    videoId,
    privacyStatus: updatedStatus as VideoPrivacyStatus,
  };
}
