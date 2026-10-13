import * as React from "react"
import { ChartColumnIcon } from "lucide-react"

import type { StatsRange } from "@/lib/api"
import { statsDetail } from "@/lib/api"
import { formatExactDuration } from "@/lib/format"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/ui/empty-state"
import { Spinner } from "@/components/ui/spinner"
import { Thumbnail } from "@/components/ui/thumbnail"
import { useSettings } from "@/hooks/use-settings"
import { StatsSummaryCards } from "@/components/stats/stats-summary-cards"
import { StatsDailyChart } from "@/components/stats/stats-daily-chart"
import { StatsTopList, type TopEntry } from "@/components/stats/stats-top-list"
import { StatsDetailHeader } from "@/components/stats/stats-detail-header"
import { useStatsQuery } from "@/components/stats/use-stats-query"
import {
  toTarget,
  type StatsDetailView,
  type StatsSubView,
} from "@/components/stats/stats-sub-view"

function plays(count: number): string {
  return `${count.toLocaleString()} ${count === 1 ? "play" : "plays"}`
}

interface StatsDetailPageProps {
  sub: StatsDetailView
  range: StatsRange
  month: string | null
  reloads: number
  onLoadingChange: (loading: boolean) => void
  onOpen: (sub: StatsSubView) => void
}

export function StatsDetailPage({
  sub,
  range,
  month,
  reloads,
  onLoadingChange,
  onOpen,
}: StatsDetailPageProps) {
  const { statsCleared } = useSettings()
  const target = React.useMemo(() => toTarget(sub), [sub])

  const { data, loading, failed } = useStatsQuery(
    () => statsDetail(range, month ?? undefined, target),
    [target, range, month, reloads, statsCleared],
    "Failed to load item statistics"
  )

  React.useEffect(() => {
    onLoadingChange(loading)
  }, [loading, onLoadingChange])

  const trackEntries = React.useMemo<TopEntry[]>(
    () =>
      (data?.topTracks ?? []).map((track) => ({
        key: track.videoId,
        title: track.title,
        meta: `${plays(track.playCount)} · ${formatExactDuration(
          Math.round(track.listenedMs / 1000)
        )}`,
        listenedMs: track.listenedMs,
        media: (
          <Thumbnail
            src={track.thumbnail ?? undefined}
            alt={track.title}
            className="relative aspect-video h-7 w-auto"
          />
        ),
      })),
    [data]
  )

  const onSelectTrack = React.useCallback(
    (index: number) => {
      const track = data?.topTracks[index]
      if (track) {
        onOpen({ kind: "track", videoId: track.videoId, title: track.title })
      }
    },
    [data, onOpen]
  )

  if (failed) {
    return (
      <EmptyState
        icon={ChartColumnIcon}
        title="Couldn't load these statistics"
        description="Settings › Logs has the details."
        className="py-16"
      />
    )
  }

  if (!data) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-4" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "space-y-5 px-6 py-4 transition-opacity",
        loading && "opacity-60"
      )}
    >
      <StatsDetailHeader kind={sub.kind} detail={data} />

      {data.summary.playCount === 0 ? (
        <EmptyState
          icon={ChartColumnIcon}
          title="Nothing played in this range"
          description="Pick a wider range to see more."
          className="py-12"
        />
      ) : (
        <>
          <StatsSummaryCards summary={data.summary} exact />
          <StatsDailyChart daily={data.daily} range={range} />

          {trackEntries.length > 0 && (
            <StatsTopList
              heading="Top tracks"
              entries={trackEntries}
              emptyLabel="Nothing yet."
              onSelect={onSelectTrack}
            />
          )}
        </>
      )}
    </div>
  )
}
