import * as React from "react"
import { ChartColumnIcon } from "lucide-react"

import type { StatsOverview } from "@/lib/api"
import { statsOverview } from "@/lib/api"
import { logError } from "@/lib/logger"
import { formatTotalDuration } from "@/lib/format"
import { EmptyState } from "@/components/ui/empty-state"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useSettings } from "@/hooks/use-settings"

export function StatsView() {
  const { statsEnabled } = useSettings()
  const [data, setData] = React.useState<StatsOverview | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [failed, setFailed] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false

    statsOverview("last30Days")
      .then((overview) => {
        if (!cancelled) setData(overview)
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
  }, [])

  return (
    <div className="flex h-full flex-col">
      <header className="px-6 pt-6 pb-3">
        <h1 className="font-heading text-2xl font-semibold">Statistics</h1>
      </header>

      <Separator />

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-6 py-4">
          {loading ? (
            <Spinner className="size-4" />
          ) : failed ? (
            <EmptyState
              icon={ChartColumnIcon}
              title="Couldn't load your statistics"
              description="Check the logs in Settings for what went wrong."
            />
          ) : data && data.summary.playCount > 0 ? (
            <p className="text-sm text-muted-foreground">
              {data.summary.playCount} plays ·{" "}
              {formatTotalDuration(Math.round(data.summary.listenedMs / 1000))} in
              the last 30 days
            </p>
          ) : (
            <EmptyState
              icon={ChartColumnIcon}
              title={
                statsEnabled ? "Nothing played yet" : "Statistics are off"
              }
              description={
                statsEnabled
                  ? "Play something and it will show up here."
                  : "Turn recording on in Settings to start collecting."
              }
            />
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
