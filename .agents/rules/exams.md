# Rule: Scraped Exam Data, LaTeX Formatting & Performance Standards

> This rule automatically guides all AI interactions regarding exams, scrapers, questions, LaTeX, and performance in the Udvashh repository. Full reference: `docs/EXAMS_AUDIT.md`.

## 1. Exam Inventory & Metadata
- **Current total**: 100 exams (4,343 questions) stored in `data/exams.json` and Neon DB `exams` table.
- **Breakdown**: 72 Daily Live Exams, 19 Weekly Live Exams, 9 Written Exams.
- **Latest Scraped Exam**: `Daily Live Exam General Science-07` (`21 Sep, 2026 12:00 AM to 22 Sep, 2026 08:00 AM`).
- **Course**: `51st BCS Progressive Service - 51st BCS Preli Written Combined Program`.

## 2. Scraped Data Formatting Rules
- **Preserve Newlines**: NEVER strip or collapse `\n` or `\n\n` into single spaces. Explanations and questions rely on line breaks for step-by-step solutions and bullet points.
- **LaTeX Math Support**:
  - Delimiters: `\( ... \)` & `$ ... $` for inline; `\[ ... \]` & `$$ ... $$` for display math.
  - Backslashes in JSON: Must be properly escaped (`\\(`, `\\frac`, `\\sqrt`, `\\begin{matrix}`).
  - Rendering: Always use `components/exams/latex-renderer.tsx` (`<LatexRenderer content={...} />`), which safely strips stray newlines, trims trailing backslashes, and preserves normal line breaks via `<br />`.
- **MCQ Options**: Always keep keys as uppercase ASCII `"A"`, `"B"`, `"C"`, `"D"`. `correctAnswer` must match one of these keys.

## 3. Lecture-to-Exam Matching
- Live Class titles (`Live Class [Subject] [Number]`) connect to Daily Live Exams (`Daily Live Exam [Subject]-[Number]`).
- Use `getConnectedDailyExam(videoTitle)` in `lib/exams.ts` for instant synchronous lookup.

## 4. Critical Performance Constraint
- **NEVER SELECT the `questions` column on general page loads**. It is 5.09 MB of JSON and will freeze Neon Serverless for 30–40 seconds.
- Use the in-memory cache `getAllExams()` from `lib/exams.ts` for listing, stats, and badges.
- Only load `questions` when a student actively opens a specific exam modal.

## 5. Syncing New Scraped Data
- Put new data in `data/exams.json`.
- Run: `node --env-file=.env.local scripts/migrate-exams-to-neon.mjs`.
