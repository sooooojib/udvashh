"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export interface ExamAttempt {
  id: string;
  userId: string;
  examId: string;
  score: number;
  totalQuestions: number;
  selectedAnswers: Record<string, string>;
  completedAt: string;
}

/**
 * Saves or updates a user's exam attempt in Neon Database.
 */
export async function submitExamAttempt(
  examId: string,
  score: number,
  totalQuestions: number,
  selectedAnswers: Record<string | number, string>
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const answersJson = JSON.stringify(selectedAnswers);

    await sql`
      INSERT INTO exam_attempts (
        user_id,
        exam_id,
        score,
        total_questions,
        selected_answers,
        completed_at,
        updated_at
      ) VALUES (
        ${session.id},
        ${examId},
        ${score},
        ${totalQuestions},
        ${answersJson}::jsonb,
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id, exam_id) DO UPDATE SET
        score = EXCLUDED.score,
        total_questions = EXCLUDED.total_questions,
        selected_answers = EXCLUDED.selected_answers,
        completed_at = NOW(),
        updated_at = NOW()
    `;

    revalidatePath("/exams");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err) {
    console.error("[Neon] Failed to save exam attempt:", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Retrieves all exam attempts for the currently logged-in user.
 */
export async function getUserExamAttempts(): Promise<Record<string, { score: number; total: number; selectedAnswers: Record<string, string> }>> {
  try {
    const session = await getSession();
    if (!session) return {};

    const rows = await sql`
      SELECT exam_id, score, total_questions, selected_answers
      FROM exam_attempts
      WHERE user_id = ${session.id}
    `;

    const result: Record<string, { score: number; total: number; selectedAnswers: Record<string, string> }> = {};
    for (const row of rows) {
      result[row.exam_id] = {
        score: row.score,
        total: row.total_questions,
        selectedAnswers: row.selected_answers || {},
      };
    }

    return result;
  } catch (err) {
    console.error("[Neon] Failed to fetch user exam attempts:", err);
    return {};
  }
}

/**
 * Loads questions for a single exam on-demand from local server memory (0 DB queries).
 * Eliminates embedding 5.09 MB of question JSON in the initial /exams page load.
 */
export async function getExamQuestions(examId: string) {
  try {
    const { sql } = await import("@/lib/db");
    const rows = await sql`
      SELECT questions FROM exams WHERE id = ${examId} LIMIT 1
    `;
    if (rows && rows.length > 0 && Array.isArray(rows[0].questions)) {
      return rows[0].questions;
    }
  } catch (err) {
    console.warn(`[Neon] Failed to fetch questions for ${examId}, falling back to local:`, err);
  }

  const { getAllExams } = await import("@/lib/exams");
  const exams = getAllExams();
  const exam = exams.find((e) => e.id === examId);
  return exam?.questions || [];
}

