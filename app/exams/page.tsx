import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth/session";
import { getAllExamsFromDb } from "@/lib/exams";
import { getUserExamAttempts } from "@/app/actions/exams";
import { ExamHub } from "@/components/exams/exam-hub";
import { GraduationCap } from "lucide-react";

export const metadata: Metadata = {
  title: "Live Exams | অবনতি",
  description: "Comprehensive BCS preliminary & written live exams with official solutions.",
};

export default async function ExamsPage() {
  const session = await getSession();
  if (!session) redirect("/login?redirectTo=/exams");

  const [exams, userAttempts] = await Promise.all([
    getAllExamsFromDb(),
    getUserExamAttempts(),
  ]);

  return (
    <main className="flex-1 p-3.5 sm:p-5 md:py-6 md:px-6 lg:px-8 max-w-[1680px] mx-auto w-full space-y-6 sm:space-y-8 min-h-[calc(100dvh-4rem)] animate-page-enter overflow-x-hidden">
      {/* Clean Page Header with Red Gradient Accent: Title 'Live Exams' only */}
      <div className="flex items-center gap-3.5">
        <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 via-rose-500 to-red-600 text-white shadow-md shadow-red-500/25">
          <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-red-600 via-rose-600 to-red-500 bg-clip-text text-transparent dark:from-red-400 dark:via-rose-400 dark:to-red-300 py-1">
          Live Exams
        </h1>
      </div>

      {/* Interactive Exam Hub */}
      <ExamHub initialExams={exams} initialUserAttempts={userAttempts} />
    </main>
  );
}
