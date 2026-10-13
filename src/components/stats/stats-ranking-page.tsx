import * as React from "react"
import { ChartColumnIcon } from "lucide-react"

import type { RankingKind, RankingSort, StatsRange } from "@/lib/api"
import { statsRanking } from "@/lib/api"
import { formatExactDuration, formatRelative } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Spinner } from "@/components/ui/spinner"
import { Thumbnail } from "@/components/ui/thumbnail"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSettings } from "@/hooks/use-settings"
import {
  StatsRankingRow,
  type RankingRow,
} from "@/components/stats/stats-ranking-row"
import { StatsPager } from "@/components/stats/stats-pager"
import { useStatsQuery } from "@/components/stats/use-stats-query"
import type { StatsSubView } from "@/components/stats/stats-sub-view"

const PAGE_SIZE = 50

const SORTS: Record<RankingKind, { value: RankingSort; label: string }[]> = {
  tracks: [
    { value: "listenedMs", label: "Listening time" },
    { value: "playCount", label: "Plays" },
    { value: "completedCount", label: "Completed" },
    { value: "lastPlayed", label: "Last played" },
    { value: "name", label: "Title" },
  ],
  channels: [
    { value: "listenedMs", label: "Listening time" },
    { value: "playCount", label: "Plays" },
    { value: "lastPlayed", label: "Last played" },
    { value: "name", label: "Name" },
  ],
  playlists: [
    { value: "listenedMs", label: "Listening time" },
    { value: "playCount", label: "Plays" },
    { value: "lastPlayed", label: "Last played" },
    { value: "name", label: "Name" },
  ],
}

function plays(count: number): string {
  return `${count.toLocaleString()} ${count === 1 ? "play" : "plays"}`
}

function listened(ms: number): string {
  return formatExactDuration(Math.round(ms / 1000))
}

function lastPlayed(at: string | null): string {
  return at ? formatRelative(at) : "never"
}

interface StatsRankingPageProps {
  of: RankingKind
  sort: RankingSort
  offset: number
  range: StatsRange
  month: string | null
  reloads: number
  onLoadingChange: (loading: boolean) => void
  /** Reports the sort and page back to the view stack, which holds them. */
  onBrowse: (sort: RankingSort, offset: number) => void
  onOpen: (sub: StatsSubView) => void
}

export function StatsRankingPage({
  of,
  sort,
  offset,
  range,
  month,
  reloads,
  onLoadingChange,
  onBrowse,
  onOpen,
}: StatsRankingPageProps) {
  const { statsCleared } = useSettings()

  const setSort = React.useCallback(
    (next: RankingSort) => onBrowse(next, 0),
    [onBrowse]
  )
  const setOffset = React.useCallback(
    (next: number) => onBrowse(sort, next),
    [onBrowse, sort]
  )

  const resetPage = React.useRef<() => void>(() => {})
  resetPage.current = () => setOffset(0)

  React.useEffect(() => {
    resetPage.current()
  }, [range, month, statsCleared])

  const { data, loading, failed } = useStatsQuery(
    () => statsRanking(range, month ?? undefined, of, sort, PAGE_SIZE, offset),
    [of, sort, range, month, offset, reloads, statsCleared],
    "Failed to load the ranking"
  )

  React.useEffect(() => {
    onLoadingChange(loading)
  }, [loading, onLoadingChange])

  const rows = React.useMemo<RankingRow[]>(() => {
    if (!data) return []
    const base = offset + 1

    if (data.kind === "tracks") {
      return data.tracks.map((track, i) => ({
        key: track.videoId,
        rank: base + i,
        title: track.title,
        meta: `${track.channelName} · ${plays(track.playCount)} · ${
          track.completedCount
        } completed · ${listened(track.listenedMs)} · ${lastPlayed(
          track.lastPlayedAt
        )}`,
        listenedMs: track.listenedMs,
        media: (
          <Thumbnail
            src={track.thumbnail ?? undefined}
            alt={track.title}
            className="relative aspect-video h-8 w-auto"
          />
        ),
      }))
    }

    if (data.kind === "channels") {
      return data.channels.map((channel, i) => ({
        key: channel.channelId ?? "unknown",
        rank: base + i,
        title: channel.channelName,
        meta: `${plays(channel.playCount)} · ${listened(
          channel.listenedMs
        )} · ${lastPlayed(channel.lastPlayedAt)}`,
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
      }))
    }

    return data.playlists.map((playlist, i) => ({
      key: String(playlist.playlistId ?? "none"),
      rank: base + i,
      title: playlist.name,
      meta: `${plays(playlist.playCount)} · ${listened(
        playlist.listenedMs
      )} · ${lastPlayed(playlist.lastPlayedAt)}`,
      listenedMs: playlist.listenedMs,
      removed: !playlist.present && playlist.playlistId !== null,
    }))
  }, [data, offset])

  const onSelect = React.useCallback(
    (index: number) => {
      if (!data) return

      if (data.kind === "tracks") {
        const track = data.tracks[index]
        onOpen({ kind: "track", videoId: track.videoId, title: track.title })
        return
      }

      if (data.kind === "channels") {
        const channel = data.channels[index]
        onOpen({
          kind: "channel",
          channelId: channel.channelId,
          channelName: channel.channelName,
        })
        return
      }

      const playlist = data.playlists[index]
      onOpen({
        kind: "playlist",
        playlistId: playlist.playlistId,
        name: playlist.name,
      })
    },
    [data, onOpen]
  )

  if (failed) {
    return (
      <EmptyState
        icon={ChartColumnIcon}
        title="Couldn't load the ranking"
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

  const peak = Math.max(1, ...rows.map((row) => row.listenedMs))

  return (
    <div
      className={cn(
        "space-y-3 px-6 py-4 transition-opacity",
        loading && "opacity-60"
      )}
    >
      <div className="flex items-center justify-end">
        <Select
          value={sort}
          onValueChange={(value) => setSort(value as RankingSort)}
        >
          <SelectTrigger size="sm" aria-label="Sort by" className="w-40 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" align="end" sideOffset={4}>
            {SORTS[of].map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="text-xs"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={ChartColumnIcon}
          title={
            data.total === 0 ? "Nothing played in this range" : "Nothing here"
          }
          description={
            data.total === 0
              ? "Pick a wider range, or play something."
              : undefined
          }
          action={
            data.total > 0 ? (
              <Button size="sm" variant="outline" onClick={() => setOffset(0)}>
                Back to the first page
              </Button>
            ) : undefined
          }
          className="py-16"
        />
      ) : (
        <>
          <ol className="space-y-0.5">
            {rows.map((row, i) => (
              <StatsRankingRow
                key={row.key}
                row={row}
                peak={peak}
                onSelect={() => onSelect(i)}
              />
            ))}
          </ol>

          <StatsPager
            offset={offset}
            count={rows.length}
            total={data.total}
            pageSize={PAGE_SIZE}
            onOffsetChange={setOffset}
          />
        </>
      )}
    </div>
  )
}
