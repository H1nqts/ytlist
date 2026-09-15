import * as React from "react"
import { ChartColumnIcon, RefreshCwIcon } from "lucide-react"

import type { StatsOverview, StatsRange } from "@/lib/api"
import { statsOverview } from "@/lib/api"
import { logError } from "@/lib/logger"
import { formatTotalDuration } from "@/lib/format"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/ui/empty-state"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Thumbnail } from "@/components/ui/thumbnail"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSettings } from "@/hooks/use-settings"
import { StatsRangeFilter } from "@/components/stats/stats-range-filter"
import { StatsSummaryCards } from "@/components/stats/stats-summary-cards"
import { StatsDailyChart } from "@/components/stats/stats-daily-chart"
import { StatsTopList, type TopEntry } from "@/components/stats/stats-top-list"
import { StatsPlaylists } from "@/components/stats/stats-playlists"

const DEFAULT_RANGE: StatsRange = "last30Days"

function plays(count: number): string {
  return `${count.toLocaleString()} ${count === 1 ? "play" : "plays"}`
}

export function StatsView() {
  const { statsEnabled } = useSettings()
  const [range, setRange] = React.useState<StatsRange>(DEFAULT_RANGE)
  const [month, setMonth] = React.useState<string | null>(null)
  const [data, setData] = React.useState<StatsOverview | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [failed, setFailed] = React.useState(false)
  const [reloads, setReloads] = React.useState(0)

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)

    statsOverview(range, month ?? undefined)
      .then((overview) => {
        if (cancelled) return
        setData(overview)
        setFailed(false)
      })
      .catch((err) => {
        if (cancelled) return
        setFailed(true)
        logError("Failed to load play statistics", err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [range, month, reloads])

  const onRangeChange = React.useCallback(
    (next: StatsRange, nextMonth: string | null) => {
      setRange(next)
      setMonth(nextMonth)
    },
    []
  )

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

  const empty = data !== null && data.summary.playCount === 0

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 px-6 pt-6 pb-3">
        <h1 className="font-heading text-2xl font-semibold">Statistics</h1>

        <div className="flex items-center gap-1.5">
          <StatsRangeFilter
            range={range}
            month={month}
            availableMonths={data?.availableMonths ?? []}
            onChange={onRangeChange}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-sm"
                variant="ghost"
                disabled={loading}
                onClick={() => setReloads((n) => n + 1)}
                aria-label="Refresh statistics"
              >
                <RefreshCwIcon className={cn(loading && "animate-spin")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>
        </div>
      </header>

      <Separator />

      <ScrollArea className="min-h-0 flex-1">
        {failed ? (
          <EmptyState
            icon={ChartColumnIcon}
            title="Couldn't load your statistics"
            description="Settings › Logs has the details."
            className="py-16"
          />
        ) : !data ? (
          <div className="flex justify-center py-16">
            <Spinner className="size-4" />
          </div>
        ) : empty ? (
          <EmptyState
            icon={ChartColumnIcon}
            title={
              statsEnabled
                ? "Nothing played in this range"
                : "Statistics are off"
            }
            description={
              statsEnabled
                ? "Pick a wider range, or play something."
                : "Turn recording on in Settings to start collecting."
            }
            className="py-16"
          />
        ) : (
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
              />
              <StatsTopList
                heading="Top channels"
                entries={channelEntries}
                emptyLabel="Nothing yet."
              />
            </div>

            <StatsPlaylists playlists={data.playlists} />
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
