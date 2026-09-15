"use server";

import { getSession } from "@/lib/auth/session";
import { syncAllPrivacyStatuses, type PrivacySyncResult } from "@/lib/youtube/privacy-sync";

export async function syncPrivacyStatusesAction(): Promise<PrivacySyncResult> {
  const session = await getSession();
  if (!session) {
    return {
      success: false,
      totalChecked: 0,
      updatedCount: 0,
      message: "Unauthorized. Please sign in.",
    };
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    const allowedEmails = adminEmail
      .split(",")
      .map((e) => e.trim().toLowerCase());
    const userEmail = session.email?.toLowerCase() || "";

    if (!allowedEmails.includes(userEmail)) {
      return {
        success: false,
        totalChecked: 0,
        updatedCount: 0,
        message: "Forbidden. Only admins can sync privacy statuses.",
      };
    }
  }

  const result = await syncAllPrivacyStatuses();

  if (result.success && result.updatedCount > 0) {
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/dashboard");
    revalidatePath("/live-classes");
    revalidatePath("/intensive-classes");
    revalidatePath("/subject-hacks");
  }

  return result;
}
