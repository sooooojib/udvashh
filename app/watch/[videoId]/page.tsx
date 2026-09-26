import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { sql } from "@/lib/db";
import { getCachedVideoByYoutubeId, getCachedPlaylistVideos } from "@/lib/db/cached-catalog";
import { getSession } from "@/lib/auth/session";
import { VideoPlayer } from "@/components/watch/video-player";
import { VideoPdfSection } from "@/components/watch/video-pdf-section";
import type { VideoPdfItem } from "@/app/actions/pdf";
import { getPlaylistName } from "@/lib/youtube/playlists";
import { INTENSIVE_PLAYLISTS, getIntensivePlaylistName } from "@/lib/youtube/intensive-playlists";
import { SUBJECT_HACKS_PLAYLISTS, getSubjectHacksPlaylistName } from "@/lib/youtube/subject-hacks-playlists";
import { compareVideos } from "@/lib/utils/format";
import { getConnectedDailyExam, type ExamItem } from "@/lib/exams";

interface WatchPageProps {
  params: Promise<{ videoId: string }>;
  searchParams?: Promise<{ t?: string }>;
}

export async function generateMetadata({
  params,
}: WatchPageProps): Promise<Metadata> {
  try {
    const { videoId } = await params;
    const video = await getCachedVideoByYoutubeId(videoId);

    return {
      title: video ? `${video.title} | অবনতি` : "Watch | অবনতি",
    };
  } catch {
    return {
      title: "Watch | অবনতি",
    };
  }
}

export default async function WatchPage({ params, searchParams }: WatchPageProps) {
  const { videoId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const urlTimestamp = resolvedSearchParams.t ? parseInt(resolvedSearchParams.t, 10) : undefined;
  const session = await getSession();
  if (!session) redirect(`/login?redirectTo=/watch/${videoId}`);

  const adminEmail = process.env.ADMIN_EMAIL;
  const allowedAdmins = adminEmail
    ? adminEmail.split(",").map((e) => e.trim().toLowerCase())
    : [];

  const isOwner =
    allowedAdmins.length === 0 ||
    allowedAdmins.includes(session.email?.toLowerCase() || "");

  // Fetch the video by youtube_video_id (cached at server level)
  const video = await getCachedVideoByYoutubeId(videoId);
  if (!video) notFound();

  // Use cached DB privacy status immediately for instantaneous page delivery
  const currentPrivacy = video.privacy_status;

  // Resolve connected Daily Exam instantly (0ms)
  const connectedExam: ExamItem | null = getConnectedDailyExam(video.title);

  // Batch remaining user-specific queries (progress, PDFs, and exam attempt)
  const [playlistRows, userResults] = await Promise.all([
    getCachedPlaylistVideos(video.playlist_id),
    (async () => {
      const queries = [
        sql`
          SELECT watched, progress_seconds FROM watch_progress
          WHERE user_id = ${session.id} AND video_id = ${video.id}
          LIMIT 1
        `,
        sql`
          SELECT * FROM video_pdfs
          WHERE video_id = ${video.id}
          ORDER BY created_at ASC
        `,
      ];

      if (connectedExam) {
        queries.push(sql`
          SELECT score, total_questions, selected_answers
          FROM exam_attempts
          WHERE user_id = ${session.id} AND exam_id = ${connectedExam.id}
          LIMIT 1
        `);
      }

      return sql.transaction(queries);
    })(),
  ]);

  const progressRows = userResults[0];
  const pdfRowsRaw = userResults[1];
  const attemptRows = connectedExam && userResults.length > 2 ? userResults[2] : [];

  const isWatched = progressRows[0]?.watched === true;
  const dbProgressSeconds = Number(progressRows[0]?.progress_seconds) || 0;
  const initialProgressSeconds =
    typeof urlTimestamp === "number" && !isNaN(urlTimestamp) && urlTimestamp > 0
      ? urlTimestamp
      : dbProgressSeconds;
  const pdfRows = pdfRowsRaw as unknown as VideoPdfItem[];

  let connectedExamAttempt: {
    score: number;
    total: number;
    selectedAnswers: Record<string, string>;
  } | null = null;

  if (attemptRows && attemptRows.length > 0) {
    connectedExamAttempt = {
      score: attemptRows[0].score,
      total: attemptRows[0].total_questions,
      selectedAnswers: attemptRows[0].selected_answers || {},
    };
  }

  let nextVideoId: string | null = null;
  let videoPosition = video.position;

  if (playlistRows.length > 0) {
    playlistRows.sort(compareVideos as Parameters<typeof playlistRows.sort>[0]);

    const currentIndex = playlistRows.findIndex(
      (v) => v.youtube_video_id === video.youtube_video_id
    );

    if (currentIndex !== -1) {
      videoPosition = currentIndex;
      if (currentIndex + 1 < playlistRows.length) {
        nextVideoId = playlistRows[currentIndex + 1].youtube_video_id;
      }
    }
  }

  const isIntensive = INTENSIVE_PLAYLISTS.some(
    (p) => p.id === video.playlist_id
  );
  const isSubjectHacks = SUBJECT_HACKS_PLAYLISTS.some(
    (p) => p.id === video.playlist_id
  );

  let moduleName = "Live Classes";
  let moduleHref = "/live-classes";
  let moduleType: "live" | "intensive" | "subject-hacks" = "live";
  let playlistName = getPlaylistName(video.playlist_id);

  if (isIntensive) {
    moduleName = "Intensive Classes";
    moduleHref = "/intensive-classes";
    moduleType = "intensive";
    playlistName = getIntensivePlaylistName(video.playlist_id);
  } else if (isSubjectHacks) {
    moduleName = "Subject Hacks";
    moduleHref = "/subject-hacks";
    moduleType = "subject-hacks";
    playlistName = getSubjectHacksPlaylistName(video.playlist_id);
  }

  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-10 min-h-[calc(100dvh-4rem)] animate-page-enter">
      <VideoPlayer
        videoId={video.id}
        youtubeVideoId={video.youtube_video_id}
        title={video.title}
        description={video.description}
        duration={video.duration}
        position={videoPosition}
        playlistName={playlistName}
        moduleName={moduleName}
        moduleHref={moduleHref}
        moduleType={moduleType}
        initialWatched={isWatched}
        initialProgressSeconds={initialProgressSeconds}
        nextVideoId={nextVideoId}
        isAdmin={isOwner}
        privacyStatus={currentPrivacy}
        connectedExam={connectedExam}
        initialExamAttempt={connectedExamAttempt}
      />

      <VideoPdfSection
        videoId={video.id}
        initialPdfs={pdfRows}
        isAdmin={isOwner}
        moduleType={moduleType}
        isDriveConnected={Boolean(process.env.GOOGLE_DRIVE_REFRESH_TOKEN)}
      />
    </main>
  );
}
