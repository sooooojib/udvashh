"use client";

import * as React from "react";
import { VideoCard, type Video } from "@/components/dashboard/video-card";
import {
  INTENSIVE_PLAYLISTS,
  getIntensivePlaylistName,
} from "@/lib/youtube/intensive-playlists";
import { Progress } from "@/components/ui/progress";
import { formatHoursMinutes, compareVideos } from "@/lib/utils/format";
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Filter,
  Layers,
  ListVideo,
  Play,
  RotateCcw,
  VideoOff,
} from "lucide-react";

interface PlaylistGroup {
  id: string;
  name: string;
  videos: Video[];
  totalDuration: number;
}

interface IntensivePlaylistViewProps {
  videos: Video[];
  watchedVideoIds: string[];
}

export function IntensivePlaylistView({
  videos,
  watchedVideoIds,
}: IntensivePlaylistViewProps) {
  const [expandedPlaylists, setExpandedPlaylists] = React.useState<
    Record<string, boolean>
  >({});
  const [filterPlaylistId, setFilterPlaylistId] =
    React.useState<string>("all");
  const [isDropdownOpen, setIsDropdownOpen] = React.useState<boolean>(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const watchedSet = new Set(watchedVideoIds);

  // Group and sort videos by playlist
  const groups = React.useMemo(() => {
    const map = new Map<string, Video[]>();

    // Pre-populate all intensive playlists in fixed order
    INTENSIVE_PLAYLISTS.forEach((pl) => {
      map.set(pl.id, []);
    });

    // Bucket videos into their playlist
    videos.forEach((video) => {
      const pid = video.playlist_id || "uncategorized";
      if (!map.has(pid)) {
        map.set(pid, []);
      }
      map.get(pid)!.push(video);
    });

    const result: PlaylistGroup[] = [];

    map.forEach((vids, pid) => {
      vids.sort(compareVideos);
      const totalDuration = vids.reduce(
        (acc, v) => acc + (v.duration || 0),
        0
      );
      result.push({
        id: pid,
        name: getIntensivePlaylistName(pid),
        videos: vids,
        totalDuration,
      });
    });

    return result;
  }, [videos]);

  // Close dropdown when clicking outside or pressing Escape
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const togglePlaylist = (id: string) => {
    setExpandedPlaylists((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSelectPlaylist = (id: string) => {
    setFilterPlaylistId(id);
    setIsDropdownOpen(false);
    if (id === "all") {
      setExpandedPlaylists({});
    } else {
      setExpandedPlaylists({ [id]: true });
    }
  };

  const displayedGroups =
    filterPlaylistId === "all"
      ? groups
      : groups.filter((g) => g.id === filterPlaylistId);

  const selectedGroup =
    filterPlaylistId === "all"
      ? null
      : groups.find((g) => g.id === filterPlaylistId);

  const totalVideosCount = videos.length;

  return (
    <div className="space-y-6">
      {/* Subject Filter Section with Amber Dropdown — Workable on both small and big screens */}
      <div className="relative border-b border-border/40 pb-5 dark:border-[#1F2C34]/80">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Section Indicator Label */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/30 dark:text-amber-400">
              <Filter className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground dark:text-[#9AA7AE]">
                Select Subject
              </span>
              <p className="text-xs text-muted-foreground/70 dark:text-[#5C6A72]">
                {filterPlaylistId === "all"
                  ? `Showing all ${groups.length} subjects (${totalVideosCount} classes)`
                  : `Filtered: ${selectedGroup?.name ?? ""}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Interactive Amber Dropdown Box */}
            <div className="relative w-full sm:w-80 md:w-96" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                aria-expanded={isDropdownOpen}
                aria-haspopup="listbox"
                className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-xs font-medium transition-all duration-200 min-h-[46px] select-none text-left active:scale-[0.99] ${
                  isDropdownOpen
                    ? "border-amber-500 bg-card shadow-[0_0_15px_rgba(217,119,6,0.15)] ring-2 ring-amber-500/20 dark:border-amber-500 dark:bg-[#111820]"
                    : filterPlaylistId !== "all"
                    ? "border-amber-500/50 bg-amber-500/5 text-foreground dark:border-amber-500/40 dark:bg-[#111820] shadow-sm"
                    : "border-border/70 bg-card/90 hover:border-amber-500/50 hover:bg-card dark:border-[#1F2C34] dark:bg-[#111820] dark:hover:border-amber-500/50 shadow-sm"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {filterPlaylistId === "all" ? (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      <Layers className="h-3.5 w-3.5" />
                    </div>
                  ) : (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      <BookOpen className="h-3.5 w-3.5" />
                    </div>
                  )}

                  <span className="truncate font-semibold text-foreground dark:text-[#E8EDF0]">
                    {filterPlaylistId === "all"
                      ? "All Subjects"
                      : selectedGroup?.name}
                  </span>

                  <span className="shrink-0 rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground dark:bg-[#141E28] dark:text-[#9AA7AE]">
                    {filterPlaylistId === "all"
                      ? `(${groups.length})`
                      : `(${selectedGroup?.videos.length ?? 0})`}
                  </span>
                </div>

                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                    isDropdownOpen ? "rotate-180 text-amber-500" : ""
                  }`}
                />
              </button>

              {/* Dropdown Menu Popover */}
              {isDropdownOpen && (
                <div
                  role="listbox"
                  className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-80 overflow-y-auto rounded-2xl border border-border/80 bg-card/95 p-1.5 shadow-2xl backdrop-blur-xl animate-fade-in-up dark:border-[#1F2C34] dark:bg-[#111820]/95"
                >
                  {/* All Subjects Option */}
                  <button
                    type="button"
                    role="option"
                    aria-selected={filterPlaylistId === "all"}
                    onClick={() => handleSelectPlaylist("all")}
                    className={`flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-xs transition-all duration-150 text-left min-h-[42px] ${
                      filterPlaylistId === "all"
                        ? "bg-amber-500/15 text-amber-600 font-semibold border border-amber-500/30 dark:text-amber-400"
                        : "text-foreground hover:bg-accent/60 dark:text-[#E8EDF0] dark:hover:bg-[#141E28]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Layers className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                      <span className="truncate">All Subjects</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[11px] opacity-75">
                        ({groups.length} subjects • {totalVideosCount} classes)
                      </span>
                      {filterPlaylistId === "all" && (
                        <Check className="h-3.5 w-3.5 text-amber-500" />
                      )}
                    </div>
                  </button>

                  <div className="my-1 border-t border-border/40 dark:border-[#1F2C34]/60" />

                  {/* Individual Subjects */}
                  {groups.map((group) => {
                    const groupWatchedCount = group.videos.filter((v) =>
                      watchedSet.has(v.id)
                    ).length;
                    const isComplete =
                      group.videos.length > 0 &&
                      groupWatchedCount === group.videos.length;
                    const isSelected = filterPlaylistId === group.id;

                    return (
                      <button
                        key={group.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleSelectPlaylist(group.id)}
                        className={`flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-xs transition-all duration-150 text-left min-h-[42px] ${
                          isSelected
                            ? "bg-amber-500/15 text-amber-600 font-semibold border border-amber-500/30 dark:text-amber-400"
                            : "text-foreground hover:bg-accent/60 dark:text-[#E8EDF0] dark:hover:bg-[#141E28]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {isComplete ? (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                          ) : (
                            <BookOpen className="h-3.5 w-3.5 shrink-0 opacity-60" />
                          )}
                          <span className="truncate">{group.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-[11px] opacity-75">
                            ({group.videos.length})
                          </span>
                          {isSelected && (
                            <Check className="h-3.5 w-3.5 text-amber-500" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Reset to All Button (when filtered) */}
            {filterPlaylistId !== "all" && (
              <button
                type="button"
                onClick={() => handleSelectPlaylist("all")}
                title="Show all subjects"
                className="inline-flex h-[46px] items-center gap-1.5 rounded-xl border border-border/70 bg-card/80 px-3 text-xs font-semibold text-muted-foreground transition-all duration-200 hover:border-amber-500/50 hover:text-foreground active:scale-95 dark:border-[#1F2C34] dark:bg-[#111820] dark:text-[#9AA7AE] dark:hover:border-amber-500/50 dark:hover:text-[#E8EDF0] shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Playlist Collapsible Cards — Amber accent */}
      <div className="space-y-4">
        {displayedGroups.map((group) => {
          const isExpanded = !!expandedPlaylists[group.id];

          const groupWatchedCount = group.videos.filter((v) =>
            watchedSet.has(v.id)
          ).length;
          const groupPercent =
            group.videos.length > 0
              ? Math.round((groupWatchedCount / group.videos.length) * 100)
              : 0;
          const isComplete =
            group.videos.length > 0 &&
            groupWatchedCount === group.videos.length;

          return (
            <div
              key={group.id}
              className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-sm backdrop-blur-md transition-all duration-200 ease-in-out dark:border-[#1F2C34] dark:bg-[#111820] dark:hover:border-amber-500/50 hover:shadow-md"
            >
              {/* Interactive Playlist Header Card */}
              <div
                onClick={() => togglePlaylist(group.id)}
                className="group flex cursor-pointer flex-col gap-4 p-5 transition-colors hover:bg-accent/40 dark:hover:bg-[#141E28] sm:flex-row sm:items-center sm:justify-between select-none active:bg-accent/60 dark:active:bg-[#1F2C34] min-h-[72px]"
              >
                {/* Left: Icon & Title */}
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm transition-transform duration-200 group-hover:scale-105 ${
                      isComplete
                        ? "bg-amber-500 text-white shadow-[0_0_12px_rgba(217,119,6,0.4)]"
                        : "bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400"
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Play className="h-4.5 w-4.5 fill-current ml-0.5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-heading text-base font-bold tracking-tight text-foreground dark:text-[#E8EDF0] truncate transition-colors group-hover:text-amber-600 dark:group-hover:text-amber-400">
                        {group.name}
                      </h2>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground dark:text-[#9AA7AE] leading-relaxed">
                      <span className="inline-flex items-center gap-1 font-medium text-foreground/80 dark:text-[#E8EDF0]">
                        <ListVideo className="h-3.5 w-3.5 text-muted-foreground dark:text-[#5C6A72]" />
                        <span className="font-mono">
                          {group.videos.length}
                        </span>{" "}
                        videos
                      </span>

                      {group.totalDuration > 0 && (
                        <>
                          <span className="text-muted-foreground/40">•</span>
                          <span className="inline-flex items-center gap-1 font-mono">
                            <Clock className="h-3 w-3 text-muted-foreground dark:text-[#5C6A72]" />
                            {formatHoursMinutes(group.totalDuration)}
                          </span>
                        </>
                      )}

                      <span className="text-muted-foreground/40">•</span>
                      <span className="font-mono text-[11px]">
                        {group.videos.length > 0
                          ? `${groupWatchedCount} of ${group.videos.length} watched`
                          : "No videos uploaded yet"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Progress Bar & Chevron */}
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="flex items-center gap-3 flex-1 sm:w-48 sm:flex-initial">
                    <Progress
                      value={groupPercent}
                      className="h-2 flex-1 rounded-full bg-muted/60 dark:bg-[#141E28] [&>div]:bg-amber-500 [&>div]:transition-all [&>div]:duration-500"
                    />
                    <span className="text-xs font-bold tabular-nums text-foreground dark:text-[#E8EDF0] w-9 text-right font-mono">
                      {groupPercent}%
                    </span>
                  </div>

                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40 transition-transform duration-200 dark:border-[#1F2C34] dark:bg-[#141E28] ${
                      isExpanded
                        ? "rotate-180 bg-muted dark:bg-[#1F2C34] text-foreground dark:text-amber-400"
                        : "text-muted-foreground dark:text-[#9AA7AE]"
                    }`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border/40 bg-muted/15 p-4 sm:p-5 dark:border-[#1F2C34]/70 dark:bg-[#0A0F12]/60 animate-fade-in-up video-grid-container">
                  {group.videos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground dark:bg-[#141E28] dark:text-[#5C6A72]">
                        <VideoOff className="h-5 w-5" />
                      </div>
                      <p className="mt-2 text-sm font-semibold tracking-tight text-foreground dark:text-[#E8EDF0]">
                        No videos in this playlist yet
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground dark:text-[#9AA7AE] leading-relaxed">
                        Upload videos to this YouTube playlist, then click
                        &ldquo;Sync Now&rdquo; to populate it.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                      {group.videos.map((video, idx) => (
                        <VideoCard
                          key={video.id}
                          video={video}
                          initialWatched={watchedSet.has(video.id)}
                          index={idx}
                          theme="amber"
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
