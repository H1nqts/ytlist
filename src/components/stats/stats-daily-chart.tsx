import * as React from "react"

import type { DailyStat, StatsRange } from "@/lib/api"
import { formatShortDate, formatTotalDuration } from "@/lib/format"

interface Bar {
  date: string
  listenedMs: number
  playCount: number
}

/** The query skips days with no play. */
function fillGaps(daily: DailyStat[]): Bar[] {
  const byDate = new Map(daily.map((d) => [d.date, d]))
  const bars: Bar[] = []

  const [fy, fm, fd] = daily[0].date.split("-").map(Number)
  const [ly, lm, ld] = daily[daily.length - 1].date.split("-").map(Number)
  const cursor = new Date(fy, fm - 1, fd)
  const last = new Date(ly, lm - 1, ld)

  while (cursor <= last) {
    const date = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`
    const hit = byDate.get(date)
    bars.push({
      date,
      listenedMs: hit?.listenedMs ?? 0,
      playCount: hit?.playCount ?? 0,
    })
    cursor.setDate(cursor.getDate() + 1)
  }

  return bars
}

interface StatsDailyChartProps {
  daily: DailyStat[]
  range: StatsRange
}

export function StatsDailyChart({ daily, range }: StatsDailyChartProps) {
  const bars = React.useMemo(() => {
    if (daily.length === 0) return []
    // "All time" can span years of empty days.
    return range === "all" ? daily.map((d) => ({ ...d })) : fillGaps(daily)
  }, [daily, range])

  if (bars.length === 0) return null

  const peak = Math.max(...bars.map((b) => b.listenedMs))
  const axis = [peak, peak / 2, 0]

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium text-foreground">By day</h2>

      <div className="flex gap-2">
        <div className="flex h-36 w-12 shrink-0 flex-col justify-between text-right text-[10px] text-muted-foreground">
          {axis.map((value, i) => (
            <span key={i}>
              {value === 0
                ? "0"
                : formatTotalDuration(Math.round(value / 1000))}
            </span>
          ))}
        </div>

        <div
          role="img"
          aria-label={`Listening time per day, peaking at ${formatTotalDuration(
            Math.round(peak / 1000)
          )}`}
          className="flex h-36 min-w-0 flex-1 items-end gap-px border-b border-l border-border pl-1"
        >
          {bars.map((bar) => (
            <div
              key={bar.date}
              title={`${formatShortDate(bar.date)} · ${formatTotalDuration(
                Math.round(bar.listenedMs / 1000)
              )} · ${bar.playCount} ${bar.playCount === 1 ? "play" : "plays"}`}
              style={{
                height: peak === 0 ? "0%" : `${(bar.listenedMs / peak) * 100}%`,
              }}
              className="min-h-0.5 flex-1 rounded-t-sm bg-primary/70 transition-colors hover:bg-primary"
            />
          ))}
        </div>
      </div>

      <div className="flex justify-between pl-14 text-[10px] text-muted-foreground">
        <span>{formatShortDate(bars[0].date)}</span>
        {bars.length > 2 && (
          <span>{formatShortDate(bars[Math.floor(bars.length / 2)].date)}</span>
        )}
        <span>{formatShortDate(bars[bars.length - 1].date)}</span>
      </div>
    </section>
  )
}
