# Udvashh Exam System: Complete Audit, Schema & AI Knowledge Guide

> **MANDATORY READING FOR ALL AI ASSISTANTS**:
> This document is the single source of truth for all scraped exam data, database tables, LaTeX formatting rules, newline preservation, lecture-to-exam mapping, and performance rules in this repository.

---

## 1. Exam Inventory & Dataset Audit

### Current Dataset Overview
- **Storage Location**: `data/exams.json` (5.09 MB) & Neon PostgreSQL `exams` table.
- **Total Exams**: **100 exams**
- **Total Questions**: **4,343 questions**
- **Question Types**:
  - **MCQ Exams**: 91 exams (typically 30, 50, or 100 MCQs each, with 4 choices A–D and detailed explanations).
  - **Written Exams**: 9 exams (typically 10 comprehensive subjective questions each, with detailed written solutions).

### Categories Breakdown
1. **Daily Live Exams** (`category: "daily"`): **72 exams** (connected directly to Live Class lectures).
2. **Weekly Live Exams** (`category: "weekly"`): **19 exams** (multi-subject / milestone tests).
3. **Written / Biweekly Exams** (`category: "written"`): **9 exams** (subjective written tests with solve sheets).

### Scraper Metadata & Timeline
- **Course**: `51st BCS Progressive Service - 51st BCS Preli Written Combined Program`
- **Latest Scraped Exam**:
  - **Title**: `Daily Live Exam General Science-07`
  - **Date & Time**: `21 Sep, 2026 12:00 AM to 22 Sep, 2026 08:00 AM`
  - **Duration**: `15 min`
  - **Total Questions**: `30`
- **Earliest Scraped Exam in Dataset**:
  - **Title**: `Daily Live Exam International Affairs-01`
  - **Date & Time**: `16 May, 2026 12:00 AM to 17 May, 2026 06:00 AM`

---

## 2. Database Schema (Neon PostgreSQL)

### A. `exams` Table
```sql
CREATE TABLE exams (
  id TEXT PRIMARY KEY,               -- e.g. "exam-1", "exam-100"
  title TEXT NOT NULL,              -- e.g. "Daily Live Exam General Science-07"
  category TEXT NOT NULL,           -- "daily" | "weekly" | "written"
  subject TEXT NOT NULL,            -- e.g. "General Science", "Bangla", "Math", "Comprehensive"
  type TEXT NOT NULL,               -- "MCQ" | "Written"
  duration TEXT,                    -- e.g. "15 min", "40 min"
  date_time TEXT,                   -- e.g. "21 Sep, 2026 12:00 AM to 22 Sep, 2026 08:00 AM"
  course TEXT,                      -- e.g. "51st BCS Progressive Service..."
  pdf_url TEXT,                     -- nullable PDF link to official question/solution sheet
  total_questions INTEGER NOT NULL, -- e.g. 30, 50, 10
  questions JSONB NOT NULL,         -- JSON array of question objects (see schema below)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exams_category ON exams(category);
CREATE INDEX idx_exams_subject ON exams(subject);
```

### B. `exam_attempts` Table
```sql
CREATE TABLE exam_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  exam_id TEXT REFERENCES exams(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  selected_answers JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g. {"1": "A", "2": "C"}
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, exam_id)
);

CREATE INDEX idx_exam_attempts_user_id ON exam_attempts(user_id);
CREATE INDEX idx_exam_attempts_exam_id ON exam_attempts(exam_id);
```

---

## 3. Question Schema (JSON Structure)

Each question in `questions` is structured as follows:

```json
{
  "number": 1,
  "question": "নিচের কোনটি সূর্যের আলোকে বৈদ্যুতিক শক্তিতে রূপান্তর করতে পারে?",
  "options": {
    "A": "জেনারেটর",
    "B": "মাল্টিমিটার",
    "C": "সৌর প্যানেল",
    "D": "গ্যাসের চুলা"
  },
  "correctAnswer": "C",
  "solution": "সৌর প্যানেলের কাজ হলো সূর্যের আলোক শক্তিকে বৈদ্যুতিক শক্তিতে রূপান্তর করা।\n\n১. ফটোভোল্টায়িক কোষ সূর্যের আলো শোষণ করে।\n২. আলো শোষণ করে সরাসরি বিদ্যুৎ উৎপন্ন করে।"
}
```

- For **Written Exams**:
  - `options`: `{}` (empty object)
  - `correctAnswer`: `""` (empty string)
  - `solution`: Complete step-by-step subjective answer with working formulas and explanations.

---

## 4. How Scraped Data Must Be Processed & Cleaned

When new exams are scraped or existing data is updated, follow these strict rules:

### A. Line Breaks & Newlines (`\n` & `\n\n`)
1. **Never strip or collapse newlines** (`\n` or `\n\n`) into single spaces.
2. Explanations/solutions frequently contain multi-step proofs, bullet points (e.g., `১. ...`, `২. ...`), and poetry passages.
3. In React components, always render question and solution text using `<LatexRenderer>` (which preserves newlines as `<br />` tags) or style with `whitespace-pre-line`.

### B. LaTeX & Math Formula Rules
1. **Delimiters Supported**:
   - Inline Math: `\( ... \)` and `$ ... $`
   - Display / Block Math: `\[ ... \]` and `$$ ... $$`
2. **JSON Backslash Escaping**:
   - In raw JSON files (`data/exams.json`), backslashes MUST be escaped (`\\(`, `\\frac`, `\\sqrt`, `\\times`, `\\pm`, `\\circ`).
   - When parsed in JavaScript/TypeScript, `\\(` automatically becomes `\(`.
3. **Stray Newlines in LaTeX**:
   - Scrapers sometimes produce newlines right inside math delimiters, e.g.:
     `\(\n⇒ r=7-4=3\)`
   - `components/exams/latex-renderer.tsx` automatically trims and strips trailing/leading backslashes and stray newlines so KaTeX never crashes.
4. **Binomial / Matrix Notation**:
   - Scraped math often uses `\left(\begin{matrix}n \\ r\end{matrix}\right)` for combinations $\binom{n}{r}$. KaTeX handles this natively.
5. **Mixed Bengali and Math**:
   - Questions mix Bengali text and LaTeX seamlessly:
     `\({\left(x+2\right)}^{7}\) এর বিস্তৃতিতে \({x}^{4}\) এর সহগ কত?`
   - KaTeX renders only the mathematical tokens into clean math typography; surrounding Bengali remains in the native font.

### C. Options & Answers
1. Options must always use standard uppercase ASCII keys: `"A"`, `"B"`, `"C"`, `"D"`.
2. Do not convert keys to Bengali numerals or letters (`ক`, `খ`, `গ`, `ঘ`) in the JSON data; the UI handles display representations.
3. `correctAnswer` must be one of `"A"`, `"B"`, `"C"`, `"D"`.

---

## 5. Lecture-to-Exam Matching Architecture

Every Live Class lecture connects to its corresponding Daily Live Exam.

### Matching Rules (`lib/exams.ts`)
- **Video Title Pattern**: `Live Class [Subject] [Number]`
  - Example: `Live Class Bengali Language 01`
- **Daily Exam Title Pattern**: `Daily Live Exam [Subject]-[Number]`
  - Example: `Daily Live Exam Bangla Language-01`
- **Canonical Subject Aliases**:
  - `bengali language` / `bangla language` $\rightarrow$ `bangla language`
  - `bengali literature` / `bangla literature` $\rightarrow$ `bangla literature`
  - `english language` $\rightarrow$ `english language`
  - `english literature` $\rightarrow$ `english literature`
  - `mathematical reasoning` / `math` $\rightarrow$ `math`
  - `mental ability` $\rightarrow$ `mental ability`
  - `bangladesh affairs` $\rightarrow$ `bangladesh affairs`
  - `international affairs` $\rightarrow$ `international affairs`
  - `general science` / `science` $\rightarrow$ `general science`
  - `computer` / `ict` $\rightarrow$ `computer`
  - `geography` $\rightarrow$ `geography`
  - `ethics` $\rightarrow$ `ethics`
- **Functions in `lib/exams.ts`**:
  - `normalizeLiveClassToExamKey(title: string): string | null`
  - `normalizeExamToKey(title: string): string | null`
  - `getConnectedDailyExam(videoTitle: string): ExamItem | null`

---

## 6. CRITICAL PERFORMANCE RULES (DO NOT VIOLATE)

### ⚠️ NEVER Select the `questions` Column on Page Loads
- The `questions` column contains **5.09 Megabytes** of question and solution JSON.
- If a server component (e.g. `app/watch/[videoId]/page.tsx`, `app/exams/page.tsx`, or dashboard) queries `SELECT questions FROM exams` across all exams, Neon Serverless has to transfer 5MB+ over the network, causing a **30 to 40 second page load freeze**.
- **Rules**:
  1. For listing exams, cards, badges, and stats: **USE IN-MEMORY `getAllExams()`** or `SELECT id, title, category, subject, type, duration, total_questions FROM exams`. This executes in **0.01ms**.
  2. For the watch page: `getConnectedDailyExam(videoTitle)` retrieves the connected exam synchronously from the in-memory cache without hitting the database.
  3. Query `questions` ONLY when a user actively opens a specific exam (`SELECT questions FROM exams WHERE id = $1`).

---

## 7. Migration Script Workflow

To migrate or sync updated scraped data from `data/exams.json` to the Neon Postgres database:
```bash
node --env-file=.env.local scripts/migrate-exams-to-neon.mjs
```
This script:
1. Ensures the `exams` and `exam_attempts` tables and indexes exist.
2. Iterates over `data/exams.json` and performs an `UPSERT` (`INSERT ... ON CONFLICT (id) DO UPDATE`).
3. Preserves attempt relations and indexes.
