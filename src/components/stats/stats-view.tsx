import * as React from "react"

import type { StatsRange } from "@/lib/api"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { StatsHeader } from "@/components/stats/stats-header"
import { StatsOverviewPage } from "@/components/stats/stats-overview-page"
import { StatsRankingPage } from "@/components/stats/stats-ranking-page"
import type { StatsSubView } from "@/components/stats/stats-sub-view"

const DEFAULT_RANGE: StatsRange = "last30Days"
const OVERVIEW: StatsSubView = { kind: "overview" }
const TEXT_ENTRY_SELECTOR =
  'input, textarea, select, [contenteditable="true"], [data-slot="input"]'
const OPEN_DIALOG_SELECTOR = '[role="dialog"]'

export function StatsView() {
  const [range, setRange] = React.useState<StatsRange>(DEFAULT_RANGE)
  const [month, setMonth] = React.useState<string | null>(null)
  const [sub, setSub] = React.useState<StatsSubView>(OVERVIEW)
  const [availableMonths, setAvailableMonths] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(true)
  const [reloads, setReloads] = React.useState(0)

  const onRangeChange = React.useCallback(
    (next: StatsRange, nextMonth: string | null) => {
      setRange(next)
      setMonth(nextMonth)
    },
    []
  )

  const onBack = React.useCallback(() => setSub(OVERVIEW), [])
  const onRefresh = React.useCallback(() => setReloads((n) => n + 1), [])
  const onMonths = React.useCallback(
    (months: string[]) => setAvailableMonths(months),
    []
  )

  const nested = sub.kind !== "overview"

  React.useEffect(() => {
    if (!nested) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape" || e.isComposing) return

      const target = e.target as HTMLElement | null
      if (target?.closest(TEXT_ENTRY_SELECTOR)) return
      if (document.querySelector(OPEN_DIALOG_SELECTOR)) return

      onBack()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [nested, onBack])

  return (
    <div className="flex h-full flex-col">
      <StatsHeader
        sub={sub}
        range={range}
        month={month}
        availableMonths={availableMonths}
        loading={loading}
        onRangeChange={onRangeChange}
        onBack={onBack}
        onRefresh={onRefresh}
      />

      <Separator />

      <ScrollArea className="min-h-0 flex-1">
        {sub.kind === "ranking" ? (
          <StatsRankingPage
            of={sub.of}
            range={range}
            month={month}
            reloads={reloads}
            onLoadingChange={setLoading}
            onOpen={setSub}
          />
        ) : (
          <StatsOverviewPage
            range={range}
            month={month}
            reloads={reloads}
            onMonths={onMonths}
            onLoadingChange={setLoading}
            onOpen={setSub}
          />
        )}
      </ScrollArea>
    </div>
  )
}
