import type { StatsSummary } from "@/lib/api"
import { formatTotalDuration } from "@/lib/format"
import { Card } from "@/components/ui/card"

interface StatsSummaryCardsProps {
  summary: StatsSummary
}

export function StatsSummaryCards({ summary }: StatsSummaryCardsProps) {
  const completion =
    summary.playCount === 0
      ? "—"
      : `${Math.round((summary.completedCount / summary.playCount) * 100)}%`

  const tiles = [
    {
      label: "Listening time",
      value: formatTotalDuration(Math.round(summary.listenedMs / 1000)),
      hint: `across ${summary.activeDays} ${summary.activeDays === 1 ? "day" : "days"}`,
    },
    {
      label: "Plays",
      value: summary.playCount.toLocaleString(),
      hint: `${summary.completedCount.toLocaleString()} played through`,
    },
    {
      label: "Completed",
      value: completion,
      hint: "of every play",
    },
    {
      label: "Tracks",
      value: summary.uniqueTracks.toLocaleString(),
      hint: `from ${summary.uniqueChannels.toLocaleString()} ${
        summary.uniqueChannels === 1 ? "channel" : "channels"
      }`,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
  )
}
