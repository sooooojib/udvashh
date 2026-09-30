import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/utils/supabase/admin";
import { sql } from "@/lib/db";

function isAdmin(sessionEmail?: string): boolean {
  if (process.env.NODE_ENV !== "production") return true;
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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const examId = (formData.get("examId") as string)?.trim();
    const questionNumber = parseInt((formData.get("questionNumber") as string) || "0", 10);
    const target = ((formData.get("target") as string) || "solution").trim();

    if (!file || !examId || !questionNumber) {
      return NextResponse.json(
        { success: false, message: "Missing file, examId, or questionNumber." },
        { status: 400 }
      );
    }

    // 1. Prepare file buffer & extension
    const ext = file.name?.split(".").pop()?.toLowerCase() || "webp";
    const safeExt = ["png", "jpg", "jpeg", "webp", "gif"].includes(ext) ? ext : "webp";
    const storagePath = `questions/${examId}/q${questionNumber}-${target}-${Date.now()}.${safeExt}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Upload to Supabase Storage
    const supabase = createAdminClient();
    const { error: uploadError } = await supabase.storage
      .from("exam-media")
      .upload(storagePath, buffer, {
        contentType: file.type || "image/webp",
        upsert: true,
      });

    if (uploadError) {
      console.error("[Supabase Storage] Upload error:", uploadError);
      return NextResponse.json(
        { success: false, message: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("exam-media").getPublicUrl(storagePath);

    // 3. Update question in Neon PostgreSQL
    let updatedQuestion: any = null;
    try {
      const rows = await sql`
        SELECT questions FROM exams WHERE id = ${examId} LIMIT 1
      `;

      if (rows && rows.length > 0 && rows[0].questions) {
        const questions = rows[0].questions;
        const qIdx = questions.findIndex((q: any) => q.number === questionNumber);

        if (qIdx !== -1) {
          const q = { ...questions[qIdx] };
          if (target.startsWith("option-")) {
            const optKey = target.replace("option-", "") as "A" | "B" | "C" | "D";
            q.optionImages = { ...(q.optionImages || {}), [optKey]: publicUrl };
          } else if (target === "question") {
            const current = Array.isArray(q.questionImages) ? q.questionImages : [];
            q.questionImages = [...current, publicUrl];
          } else {
            const current = Array.isArray(q.solutionImages) ? q.solutionImages : [];
            q.solutionImages = [...current, publicUrl];
          }
          q.hasImage = true;
          questions[qIdx] = q;
          updatedQuestion = q;

          await sql`
            UPDATE exams
            SET questions = ${JSON.stringify(questions)}::jsonb,
                updated_at = NOW()
            WHERE id = ${examId}
          `;
        }
      }
    } catch (dbErr) {
      console.error("[NeonDB] Failed to update exam questions:", dbErr);
    }

    return NextResponse.json({
      success: true,
      imageUrl: publicUrl,
      storagePath,
      question: updatedQuestion,
    });
  } catch (error: any) {
    console.error("[Exam Upload API] Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    const { examId, questionNumber, target = "solution", imageUrl } = await request.json();

    if (!examId || !questionNumber || !imageUrl) {
      return NextResponse.json(
        { success: false, message: "Missing examId, questionNumber, or imageUrl." },
        { status: 400 }
      );
    }

    // 1. Delete from Supabase Storage if path can be extracted
    const supabase = createAdminClient();
    const parts = imageUrl.split("/exam-media/");
    if (parts.length > 1) {
      const storagePath = parts[1];
      const { error: removeError } = await supabase.storage
        .from("exam-media")
        .remove([storagePath]);
      if (removeError) {
        console.warn("[Supabase Storage] Delete warning:", removeError);
      }
    }

    // 2. Remove from Neon PostgreSQL
    let updatedQuestion: any = null;
    try {
      const rows = await sql`
        SELECT questions FROM exams WHERE id = ${examId} LIMIT 1
      `;

      if (rows && rows.length > 0 && rows[0].questions) {
        const questions = rows[0].questions;
        const qIdx = questions.findIndex((q: any) => q.number === questionNumber);

        if (qIdx !== -1) {
          const q = { ...questions[qIdx] };
          if (target.startsWith("option-")) {
            const optKey = target.replace("option-", "") as "A" | "B" | "C" | "D";
            if (q.optionImages) {
              delete q.optionImages[optKey];
            }
          } else if (target === "question") {
            q.questionImages = (q.questionImages || []).filter((u: string) => u !== imageUrl);
          } else {
            q.solutionImages = (q.solutionImages || []).filter((u: string) => u !== imageUrl);
          }

          const hasRemainingImages =
            (q.questionImages && q.questionImages.length > 0) ||
            (q.solutionImages && q.solutionImages.length > 0) ||
            (q.optionImages && Object.keys(q.optionImages).length > 0);
          if (!hasRemainingImages && !q.solution?.includes("[images]")) {
            q.hasImage = false;
          }

          questions[qIdx] = q;
          updatedQuestion = q;

          await sql`
            UPDATE exams
            SET questions = ${JSON.stringify(questions)}::jsonb,
                updated_at = NOW()
            WHERE id = ${examId}
          `;
        }
      }
    } catch (dbErr) {
      console.error("[NeonDB] Failed to remove image from questions:", dbErr);
    }

    return NextResponse.json({
      success: true,
      question: updatedQuestion,
    });
  } catch (error: any) {
    console.error("[Exam Delete API] Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
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

    const { examId, questionNumber, target = "solution", oldUrl, newUrl } = await request.json();

    if (!examId || !questionNumber || !oldUrl || !newUrl) {
      return NextResponse.json(
        { success: false, message: "Missing required parameters." },
        { status: 400 }
      );
    }

    // 1. Update in Neon PostgreSQL
    let updatedQuestion: any = null;
    try {
      const rows = await sql`
        SELECT questions FROM exams WHERE id = ${examId} LIMIT 1
      `;

      if (rows && rows.length > 0 && rows[0].questions) {
        const questions = rows[0].questions;
        const qIdx = questions.findIndex((q: any) => q.number === questionNumber);

        if (qIdx !== -1) {
          const q = { ...questions[qIdx] };
          const normalize = (u: string) => u.split("#")[0];
          const targetBase = normalize(oldUrl);

          if (typeof target === "string" && target.startsWith("option-")) {
            const optKey = target.replace("option-", "") as "A" | "B" | "C" | "D";
            if (!q.optionImages) q.optionImages = {};
            q.optionImages[optKey] = newUrl;
          } else if (target === "question" && Array.isArray(q.questionImages)) {
            q.questionImages = q.questionImages.map((u: string) =>
              normalize(u) === targetBase ? newUrl : u
            );
          } else if (Array.isArray(q.solutionImages)) {
            q.solutionImages = q.solutionImages.map((u: string) =>
              normalize(u) === targetBase ? newUrl : u
            );
          }

          questions[qIdx] = q;
          updatedQuestion = q;

          await sql`
            UPDATE exams
            SET questions = ${JSON.stringify(questions)}::jsonb,
                updated_at = NOW()
            WHERE id = ${examId}
          `;

          // In local dev, also keep data/exams.json in sync in the background without blocking the HTTP response
          if (process.env.NODE_ENV !== "production") {
            setImmediate(async () => {
              try {
                const fs = await import("fs/promises");
                const path = await import("path");
                const localPath = path.join(process.cwd(), "data", "exams.json");
                const raw = await fs.readFile(localPath, "utf-8");
                const allExams = JSON.parse(raw);
                const eIdx = allExams.findIndex((e: any) => e.id === examId);
                if (eIdx !== -1) {
                  allExams[eIdx].questions = questions;
                  await fs.writeFile(localPath, JSON.stringify(allExams, null, 2), "utf-8");
                }
              } catch {
                // Non-blocking in dev
              }
            });
          }
        }
      }
    } catch (dbErr) {
      console.error("[NeonDB] Failed to update image resize in questions:", dbErr);
    }

    return NextResponse.json({
      success: true,
      newUrl,
      question: updatedQuestion,
    });
  } catch (error: any) {
    console.error("[Exam Resize API] Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
