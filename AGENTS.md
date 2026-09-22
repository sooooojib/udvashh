<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Knowledge & Scraped Exam System Rules

Detailed documentation is available at [docs/EXAMS_AUDIT.md](docs/EXAMS_AUDIT.md) and [.agents/rules/exams.md](.agents/rules/exams.md).

### Core Exam Rules for AI:
1. **Latest Scraped Exam**: `Daily Live Exam General Science-07` (`21 Sep, 2026 12:00 AM to 22 Sep, 2026 08:00 AM`).
2. **Total Inventory**: 100 exams (4,343 questions: 72 Daily, 19 Weekly, 9 Written).
3. **Never Query `questions` Column on List Loads**: The `questions` column is 5.09 MB. Never select it across all exams. Use in-memory `getAllExams()` in `lib/exams.ts`.
4. **Preserve Line Breaks (`\n`)**: Never strip `\n` or `\n\n` in solutions/questions.
5. **LaTeX Handling**: Use `<LatexRenderer />` from `components/exams/latex-renderer.tsx` which parses `\( ... \)`, `\[ ... \]`, `$ ... $`, `$$ ... $$` and escapes backslashes properly.
6. **Lecture-to-Exam Matcher**: Live classes map to Daily Live Exams via `getConnectedDailyExam(videoTitle)` in `lib/exams.ts`.
7. **Syncing New Scraped Data**: Add to `data/exams.json` and run `node --env-file=.env.local scripts/migrate-exams-to-neon.mjs`.

