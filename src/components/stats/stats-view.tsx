import * as React from "react"

import type { RankingSort, StatsRange } from "@/lib/api"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { StatsHeader } from "@/components/stats/stats-header"
import { StatsOverviewPage } from "@/components/stats/stats-overview-page"
import { StatsRankingPage } from "@/components/stats/stats-ranking-page"
import { StatsDetailPage } from "@/components/stats/stats-detail-page"
import type { StatsSubView } from "@/components/stats/stats-sub-view"

const DEFAULT_RANGE: StatsRange = "last30Days"
const OVERVIEW: StatsSubView = { kind: "overview" }
const TEXT_ENTRY_SELECTOR =
  'input, textarea, select, [contenteditable="true"], [data-slot="input"]'
const OPEN_DIALOG_SELECTOR = '[role="dialog"]'

export function StatsView() {
  const [range, setRange] = React.useState<StatsRange>(DEFAULT_RANGE)
  const [month, setMonth] = React.useState<string | null>(null)
  // The overview is the bottom of the stack; the last entry is on screen.
  const [stack, setStack] = React.useState<StatsSubView[]>([OVERVIEW])
  const [availableMonths, setAvailableMonths] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(true)
  const [reloads, setReloads] = React.useState(0)

  const sub = stack[stack.length - 1]
  const parent = stack.length > 1 ? stack[stack.length - 2] : null

  const onRangeChange = React.useCallback(
    (next: StatsRange, nextMonth: string | null) => {
      setRange(next)
      setMonth(nextMonth)
    },
    []
  )

  const onOpen = React.useCallback(
    (next: StatsSubView) => setStack((s) => [...s, next]),
    []
  )

  const onBack = React.useCallback(
    () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
    []
  )
  const onRefresh = React.useCallback(() => setReloads((n) => n + 1), [])

  const onBrowse = React.useCallback(
    (sort: RankingSort, offset: number) =>
      setStack((s) => {
        const top = s[s.length - 1]
        if (top.kind !== "ranking") return s
        if (top.sort === sort && top.offset === offset) return s
        return [...s.slice(0, -1), { ...top, sort, offset }]
      }),
    []
  )
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
        parent={parent}
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
            sort={sub.sort}
            offset={sub.offset}
            range={range}
            month={month}
            reloads={reloads}
            onLoadingChange={setLoading}
            onBrowse={onBrowse}
            onOpen={onOpen}
          />
        ) : sub.kind === "track" ||
          sub.kind === "channel" ||
          sub.kind === "playlist" ? (
          <StatsDetailPage
            sub={sub}
            range={range}
            month={month}
            reloads={reloads}
            onLoadingChange={setLoading}
            onOpen={onOpen}
          />
        ) : (
          <StatsOverviewPage
            range={range}
            month={month}
            reloads={reloads}
            onMonths={onMonths}
            onLoadingChange={setLoading}
            onOpen={onOpen}
          />
        )}
      </ScrollArea>
    </div>
  )
}
