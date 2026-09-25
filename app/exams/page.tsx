import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth/session";
import { getAllExams } from "@/lib/exams";
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
    getAllExams(),
    getUserExamAttempts(),
  ]);

  return (
    <main className="flex-1 px-3.5 sm:px-5 lg:px-6 py-6 sm:py-8 max-w-[1400px] mx-auto w-full space-y-6 sm:space-y-8 min-h-[calc(100dvh-4rem)] animate-page-enter overflow-x-hidden">
      {/* Academic Page Header: Deep Burgundy (#881337) Icon & Clean Heading */}
      <div className="flex items-center gap-3.5">
        <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-[#881337] text-white shadow-xs dark:bg-[#881337] dark:text-[#FFF1F2]">
          <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-[#881337] dark:text-[#FFE4E6] py-1">
          Live Exams
        </h1>
      </div>

      {/* Interactive Exam Hub */}
      <ExamHub initialExams={exams} initialUserAttempts={userAttempts} />
    </main>
  );
}
