import * as React from "react"
import { ChartColumnIcon } from "lucide-react"

import type { StatsRange } from "@/lib/api"
import { statsOverview } from "@/lib/api"
import { formatTotalDuration } from "@/lib/format"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/ui/empty-state"
import { Spinner } from "@/components/ui/spinner"
import { Thumbnail } from "@/components/ui/thumbnail"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSettings } from "@/hooks/use-settings"
import { StatsSummaryCards } from "@/components/stats/stats-summary-cards"
import { StatsDailyChart } from "@/components/stats/stats-daily-chart"
import { StatsTopList, type TopEntry } from "@/components/stats/stats-top-list"
import { StatsPlaylists } from "@/components/stats/stats-playlists"
import { useStatsQuery } from "@/components/stats/use-stats-query"
import { ranking, type StatsSubView } from "@/components/stats/stats-sub-view"

function plays(count: number): string {
  return `${count.toLocaleString()} ${count === 1 ? "play" : "plays"}`
}

interface StatsOverviewPageProps {
  range: StatsRange
  month: string | null
  reloads: number
  onMonths: (months: string[]) => void
  onLoadingChange: (loading: boolean) => void
  onOpen: (sub: StatsSubView) => void
}

export function StatsOverviewPage({
  range,
  month,
  reloads,
  onMonths,
  onLoadingChange,
  onOpen,
}: StatsOverviewPageProps) {
  const { statsEnabled, statsCleared } = useSettings()

  const { data, loading, failed } = useStatsQuery(
    () => statsOverview(range, month ?? undefined),
    [range, month, reloads, statsCleared],
    "Failed to load play statistics"
  )

  React.useEffect(() => {
    onLoadingChange(loading)
  }, [loading, onLoadingChange])

  React.useEffect(() => {
    if (data) onMonths(data.availableMonths)
  }, [data, onMonths])

  const trackEntries = React.useMemo<TopEntry[]>(
    () =>
      (data?.topTracks ?? []).map((track) => ({
        key: track.videoId,
        title: track.title,
        meta: `${track.channelName} · ${plays(track.playCount)} · ${
          track.completedCount
        } completed · ${formatTotalDuration(
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

  const onSelectChannel = React.useCallback(
    (index: number) => {
      const channel = data?.topChannels[index]
      if (channel) {
        onOpen({
          kind: "channel",
          channelId: channel.channelId,
          channelName: channel.channelName,
        })
      }
    },
    [data, onOpen]
  )

  const onSelectPlaylist = React.useCallback(
    (playlistId: number | null) => {
      const playlist = data?.playlists.find((p) => p.playlistId === playlistId)
      if (playlist) {
        onOpen({
          kind: "playlist",
          playlistId: playlist.playlistId,
          name: playlist.name,
        })
      }
    },
    [data, onOpen]
  )

  const channelEntries = React.useMemo<TopEntry[]>(
    () =>
      (data?.topChannels ?? []).map((channel) => ({
        key: channel.channelId ?? channel.channelName,
        title: channel.channelName,
        meta: `${plays(channel.playCount)} · ${formatTotalDuration(
          Math.round(channel.listenedMs / 1000)
        )}`,
        listenedMs: channel.listenedMs,
        media: (
          <Avatar size="sm" className="relative">
            {channel.icon && (
              <AvatarImage src={channel.icon} alt={channel.channelName} />
            )}
            <AvatarFallback className="text-[10px]">
              {channel.channelName.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ),
      })),
    [data]
  )

  if (failed) {
    return (
      <EmptyState
        icon={ChartColumnIcon}
        title="Couldn't load your statistics"
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

  if (data.summary.playCount === 0) {
    return (
      <EmptyState
        icon={ChartColumnIcon}
        title={
          statsEnabled ? "Nothing played in this range" : "Statistics are off"
        }
        description={
          statsEnabled
            ? "Pick a wider range, or play something."
            : "Turn recording on in Settings to start collecting."
        }
        className="py-16"
      />
    )
  }

  return (
    // Kept mounted while a new range loads, or the page flashes.
    <div
      className={cn(
        "space-y-5 px-6 py-4 transition-opacity",
        loading && "opacity-60"
      )}
    >
      <StatsSummaryCards summary={data.summary} />
      <StatsDailyChart daily={data.daily} range={range} />

      <div className="grid gap-5 lg:grid-cols-2">
        <StatsTopList
          heading="Top tracks"
          entries={trackEntries}
          emptyLabel="Nothing yet."
          onSeeAll={() => onOpen(ranking("tracks"))}
          onSelect={onSelectTrack}
        />
        <StatsTopList
          heading="Top channels"
          entries={channelEntries}
          emptyLabel="Nothing yet."
          onSeeAll={() => onOpen(ranking("channels"))}
          onSelect={onSelectChannel}
        />
      </div>

      <StatsPlaylists
        playlists={data.playlists}
        onSeeAll={() => onOpen(ranking("playlists"))}
        onSelect={onSelectPlaylist}
      />
    </div>
  )
}
