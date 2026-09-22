import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ Error: Missing DATABASE_URL in environment.");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

export function getExamCategory(title, type) {
  const t = (title || "").toLowerCase();
  if (type === "Written" || t.includes("written") || t.includes("biweekly")) {
    return "written";
  }
  if (t.includes("weekly")) {
    return "weekly";
  }
  return "daily";
}

export function getExamSubject(title) {
  const t = (title || "").toLowerCase();
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

async function main() {
  console.log("🚀 Starting Neon Exams Migration...");

  // 1. Ensure uuid-ossp extension
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  // 2. Create exams table
  console.log("📦 Creating/verifying 'exams' table...");
  await sql`
    CREATE TABLE IF NOT EXISTS exams (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      subject TEXT NOT NULL,
      type TEXT NOT NULL,
      duration TEXT,
      date_time TEXT,
      course TEXT,
      pdf_url TEXT,
      total_questions INTEGER NOT NULL,
      questions JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_exams_category ON exams(category)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_exams_subject ON exams(subject)`;

  // 3. Create exam_attempts table
  console.log("📦 Creating/verifying 'exam_attempts' table...");
  await sql`
    CREATE TABLE IF NOT EXISTS exam_attempts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      exam_id TEXT REFERENCES exams(id) ON DELETE CASCADE NOT NULL,
      score INTEGER NOT NULL,
      total_questions INTEGER NOT NULL,
      selected_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
      completed_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, exam_id)
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_id ON exam_attempts(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam_id ON exam_attempts(exam_id)`;

  // 4. Read exams.json
  const dataPath = path.join(__dirname, "../data/exams.json");
  console.log(`📖 Reading exam dataset from: ${dataPath}`);
  const rawExams = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  console.log(`📊 Found ${rawExams.length} exams in data/exams.json.`);

  // 5. Batch insert / upsert into Neon
  console.log("⏳ Uploading exams to Neon Database...");
  let uploaded = 0;

  for (let i = 0; i < rawExams.length; i++) {
    const e = rawExams[i];
    const id = `exam-${i + 1}`;
    const title = (e.title || "Exam").replace(/^Live\s*\n?/i, "").trim();
    const type = e.type === "Written" ? "Written" : "MCQ";
    const category = getExamCategory(title, type);
    const subject = getExamSubject(title);
    const duration = e.duration || "15 min";
    const dateTime = e.dateTime || "";
    const course = e.course || "";
    const pdfUrl = e.pdfUrl || null;
    const questions = e.questions || [];
    const totalQuestions = e.totalQuestions || questions.length || 0;

    await sql`
      INSERT INTO exams (
        id,
        title,
        category,
        subject,
        type,
        duration,
        date_time,
        course,
        pdf_url,
        total_questions,
        questions,
        updated_at
      ) VALUES (
        ${id},
        ${title},
        ${category},
        ${subject},
        ${type},
        ${duration},
        ${dateTime},
        ${course},
        ${pdfUrl},
        ${totalQuestions},
        ${JSON.stringify(questions)}::jsonb,
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        category = EXCLUDED.category,
        subject = EXCLUDED.subject,
        type = EXCLUDED.type,
        duration = EXCLUDED.duration,
        date_time = EXCLUDED.date_time,
        course = EXCLUDED.course,
        pdf_url = EXCLUDED.pdf_url,
        total_questions = EXCLUDED.total_questions,
        questions = EXCLUDED.questions,
        updated_at = NOW()
    `;

    uploaded++;
    if (uploaded % 20 === 0 || uploaded === rawExams.length) {
      console.log(`✅ Uploaded ${uploaded} / ${rawExams.length} exams...`);
    }
  }

  // 6. Verify count in Neon
  const countResult = await sql`SELECT count(*)::int as count FROM exams`;
  const byCategory = await sql`
    SELECT category, count(*)::int as count FROM exams GROUP BY category ORDER BY count DESC
  `;

  console.log("\n🎉 Migration completed successfully!");
  console.log(`📊 Total exams in Neon: ${countResult[0].count}`);
  console.log("📂 Breakdown by category:", byCategory);
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
