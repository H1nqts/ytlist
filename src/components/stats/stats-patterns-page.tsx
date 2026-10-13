import * as React from "react"
import { ChartColumnIcon } from "lucide-react"

import type { StatsPatterns, StatsRange } from "@/lib/api"
import { statsPatterns } from "@/lib/api"
import {
  formatExactDuration,
  formatHour,
  formatWeekday,
} from "@/lib/format"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Spinner } from "@/components/ui/spinner"
import {
  StatsBarRowChart,
  type BarRow,
} from "@/components/stats/stats-bar-row-chart"
import { useStatsQuery } from "@/components/stats/use-stats-query"
import { useSettings } from "@/hooks/use-settings"

const HOUR_LABELS = [0, 6, 12, 18]

interface Slot {
  playCount: number
  listenedMs: number
}

function seed<T extends Slot>(
  length: number,
  rows: T[],
  indexOf: (row: T) => number
): Slot[] {
  const slots: Slot[] = Array.from({ length }, () => ({
    playCount: 0,
    listenedMs: 0,
  }))
  for (const row of rows) {
    const i = indexOf(row)
    if (i >= 0 && i < length) slots[i] = row
  }
  return slots
}

function plays(count: number): string {
  return `${count.toLocaleString()} ${count === 1 ? "play" : "plays"}`
}

function peakIndex(slots: Slot[]): number {
  let best = -1
  slots.forEach((slot, i) => {
    if (slot.listenedMs > 0 && (best < 0 || slot.listenedMs > slots[best].listenedMs)) {
      best = i
    }
  })
  return best
}

interface StatsPatternsPageProps {
  range: StatsRange
  month: string | null
  reloads: number
  onLoadingChange: (loading: boolean) => void
}

export function StatsPatternsPage({
  range,
  month,
  reloads,
  onLoadingChange,
}: StatsPatternsPageProps) {
  const { statsCleared } = useSettings()

  const { data, loading, failed } = useStatsQuery<StatsPatterns>(
    () => statsPatterns(range, month ?? undefined),
    [range, month, reloads, statsCleared],
    "Failed to load listening patterns"
  )

  React.useEffect(() => {
    onLoadingChange(loading)
  }, [loading, onLoadingChange])

  const hours = React.useMemo(
    () => seed(24, data?.hours ?? [], (row) => row.hour),
    [data]
  )
  const weekdays = React.useMemo(
    () => seed(7, data?.weekdays ?? [], (row) => row.weekday),
    [data]
  )

  const weekdayRows = React.useMemo<BarRow[]>(
    () =>
      weekdays.map((slot, i) => ({
        key: String(i),
        label: formatWeekday(i),
        value: slot.listenedMs,
        caption:
          slot.playCount === 0
            ? "—"
            : formatExactDuration(Math.round(slot.listenedMs / 1000)),
      })),
    [weekdays]
  )

  if (failed) {
    return (
      <EmptyState
        icon={ChartColumnIcon}
        title="Couldn't load your listening patterns"
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
        title="Nothing played in this range"
        description="Pick a wider range, or play something."
        className="py-16"
      />
    )
  }

  const hourPeak = Math.max(...hours.map((slot) => slot.listenedMs))
  const busiestHour = peakIndex(hours)
  const busiestWeekday = peakIndex(weekdays)

  const tiles = [
    {
      label: "Busiest hour",
      value: busiestHour < 0 ? "—" : formatHour(busiestHour),
      hint:
        busiestHour < 0
          ? "no recorded times"
          : plays(hours[busiestHour].playCount),
    },
    {
      label: "Busiest day",
      value: busiestWeekday < 0 ? "—" : formatWeekday(busiestWeekday),
      hint:
        busiestWeekday < 0
          ? "no recorded times"
          : plays(weekdays[busiestWeekday].playCount),
    },
  ]

  return (
    <div
      className={cn(
        "space-y-5 px-6 py-4 transition-opacity",
        loading && "opacity-60"
      )}
    >
      <div className="grid grid-cols-2 gap-3">
        {tiles.map((tile) => (
          <Card key={tile.label} size="sm" className="gap-1 px-3">
            <p className="text-xs font-medium text-muted-foreground">
              {tile.label}
            </p>
            <p className="font-heading text-xl font-semibold text-foreground">
              {tile.value}
            </p>
            <p className="text-[11px] text-muted-foreground">{tile.hint}</p>
          </Card>
        ))}
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-foreground">By hour</h2>

        <div
          role="img"
          aria-label={`Listening time per hour of day, peaking at ${formatHour(
            busiestHour < 0 ? 0 : busiestHour
          )}`}
          className="flex h-36 items-end gap-px border-b border-l border-border pl-1"
        >
          {hours.map((slot, i) => (
            <div
              key={i}
              title={`${formatHour(i)} · ${formatExactDuration(
                Math.round(slot.listenedMs / 1000)
              )} · ${plays(slot.playCount)}`}
              style={{
                height:
                  hourPeak === 0 ? "0%" : `${(slot.listenedMs / hourPeak) * 100}%`,
              }}
              className="min-h-0.5 flex-1 rounded-t-sm bg-primary/70 transition-colors hover:bg-primary"
            />
          ))}
        </div>

        <div className="flex justify-between pl-1 text-[10px] text-muted-foreground">
          {HOUR_LABELS.map((hour) => (
            <span key={hour}>{formatHour(hour)}</span>
          ))}
          <span>11 PM</span>
        </div>
      </section>

      <StatsBarRowChart heading="By weekday" rows={weekdayRows} />
    </div>
  )
}
