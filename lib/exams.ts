import rawExams from "@/data/exams.json";

export interface ExamQuestion {
  number: number;
  question: string;
  questionImages?: string[];
  options?: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  optionImages?: {
    A?: string;
    B?: string;
    C?: string;
    D?: string;
  };
  correctAnswer?: "A" | "B" | "C" | "D";
  hasImage?: boolean;
  solution?: string;
  solutionImages?: string[];
  solutionPdfs?: string[];
  content?: string; // for written exams
}

export type ExamCategory = "daily" | "weekly" | "written";

export interface ExamItem {
  id: string;
  title: string;
  type: "MCQ" | "Written";
  category: ExamCategory;
  subject: string;
  dateTime: string;
  duration: string;
  course: string;
  pdfUrl?: string;
  totalQuestions: number;
  questions: ExamQuestion[];
}

export const SUBJECTS = [
  "General Science",
  "Bangladesh Affairs",
  "International Affairs",
  "Math",
  "Mental Ability",
  "English",
  "Bangla",
  "ICT",
  "Ethics",
  "Geography",
] as const;

export type SubjectType = (typeof SUBJECTS)[number] | "Comprehensive";

export function getExamCategory(title: string, type?: string): ExamCategory {
  const t = title.toLowerCase();
  if (type === "Written" || t.includes("written") || t.includes("biweekly")) {
    return "written";
  }
  if (t.includes("weekly")) {
    return "weekly";
  }
  return "daily";
}

export function getExamSubject(title: string): SubjectType {
  const t = title.toLowerCase();
  if (t.includes("science")) return "General Science";
  if (t.includes("bangladesh affairs")) return "Bangladesh Affairs";
  if (t.includes("international affairs")) return "International Affairs";
  if (t.includes("math")) return "Math";
  if (t.includes("mental ability")) return "Mental Ability";
  if (t.includes("english")) return "English";
  if (t.includes("bangla")) return "Bangla";
  if (t.includes("computer") || t.includes("ict")) return "ICT";
  if (t.includes("ethics")) return "Ethics";
  if (t.includes("geography")) return "Geography";
  return "Comprehensive";
}

let cachedExams: ExamItem[] | null = null;
let cachedDbExams: ExamItem[] | null = null;

export function getAllExams(): ExamItem[] {
  if (cachedExams) return cachedExams;

  cachedExams = (rawExams as any[]).map((e, index) => {
    const title = (e.title || "Exam").replace(/^Live\s*\n?/i, "").trim();
    const type = e.type === "Written" ? "Written" : "MCQ";
    const category = getExamCategory(title, type);
    const subject = getExamSubject(title);

    return {
      id: `exam-${index + 1}`,
      title,
      type,
      category,
      subject,
      dateTime: e.dateTime || "",
      duration: e.duration || "15 min",
      course: e.course || "",
      pdfUrl: e.pdfUrl || undefined,
      totalQuestions: e.totalQuestions || e.questions?.length || 0,
      questions: e.questions || [],
    };
  });

  return cachedExams;
}

export async function getAllExamsFromDb(): Promise<ExamItem[]> {
  if (cachedDbExams) return cachedDbExams;

  try {
    const { sql } = await import("@/lib/db");
    const rows = await sql`
      SELECT id, title, category, subject, type, duration, date_time, course, pdf_url, total_questions, questions
      FROM exams
      ORDER BY id ASC
    `;

    if (rows && rows.length > 0) {
      cachedDbExams = rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        category: r.category as ExamCategory,
        subject: r.subject,
        type: r.type as "MCQ" | "Written",
        duration: r.duration || "15 min",
        dateTime: r.date_time || "",
        course: r.course || "",
        pdfUrl: r.pdf_url || undefined,
        totalQuestions: r.total_questions || 0,
        questions: r.questions || [],
      }));

      // Sort numerically by id (e.g. exam-1, exam-2, ..., exam-100)
      cachedDbExams.sort((a, b) => {
        const numA = parseInt(a.id.replace(/\D/g, ""), 10) || 0;
        const numB = parseInt(b.id.replace(/\D/g, ""), 10) || 0;
        return numA - numB;
      });

      return cachedDbExams;
    }
  } catch (err) {
    console.warn("[Exams] Failed to fetch from Neon DB, falling back to local JSON:", err);
  }

  return getAllExams();
}

export function getExamStats() {
  const exams = getAllExams();
  const total = exams.length;
  const daily = exams.filter((e) => e.category === "daily").length;
  const weekly = exams.filter((e) => e.category === "weekly").length;
  const written = exams.filter((e) => e.category === "written").length;
  const totalQuestions = exams.reduce((acc, e) => acc + (e.totalQuestions || 0), 0);

  return { total, daily, weekly, written, totalQuestions };
}
