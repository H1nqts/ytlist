import * as React from "react"

import type { RankingKind, RankingSort, StatsRange } from "@/lib/api"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { StatsHeader } from "@/components/stats/stats-header"
import { StatsTabs } from "@/components/stats/stats-tabs"
import { StatsOverviewPage } from "@/components/stats/stats-overview-page"
import { StatsRankingPage } from "@/components/stats/stats-ranking-page"
import { StatsDetailPage } from "@/components/stats/stats-detail-page"
import {
  detailTitle,
  isRanking,
  tabTitle,
  type RankingTabState,
  type StatsDetailView,
  type StatsTab,
} from "@/components/stats/stats-sub-view"

const DEFAULT_RANGE: StatsRange = "last30Days"
const DEFAULT_RANKING: RankingTabState = { sort: "listenedMs", offset: 0 }
const TEXT_ENTRY_SELECTOR =
  'input, textarea, select, [contenteditable="true"], [data-slot="input"]'
const OPEN_DIALOG_SELECTOR = '[role="dialog"]'

export function StatsView() {
  const [range, setRange] = React.useState<StatsRange>(DEFAULT_RANGE)
  const [month, setMonth] = React.useState<string | null>(null)
  const [tab, setTab] = React.useState<StatsTab>("overview")
  // Items covering the tab underneath; the last one is on screen.
  const [details, setDetails] = React.useState<StatsDetailView[]>([])
  const [rankings, setRankings] = React.useState<
    Record<RankingKind, RankingTabState>
  >({
    tracks: DEFAULT_RANKING,
    channels: DEFAULT_RANKING,
    playlists: DEFAULT_RANKING,
  })
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

  const onTabChange = React.useCallback((next: StatsTab) => {
    setDetails([])
    setTab(next)
  }, [])

  const onOpen = React.useCallback(
    (next: StatsDetailView) => setDetails((d) => [...d, next]),
    []
  )

  const onBack = React.useCallback(() => setDetails((d) => d.slice(0, -1)), [])
  const onRefresh = React.useCallback(() => setReloads((n) => n + 1), [])
  const onMonths = React.useCallback(
    (months: string[]) => setAvailableMonths(months),
    []
  )

  const onBrowse = React.useCallback(
    (of: RankingKind, sort: RankingSort, offset: number) =>
      setRankings((all) =>
        all[of].sort === sort && all[of].offset === offset
          ? all
          : { ...all, [of]: { sort, offset } }
      ),
    []
  )

  const detail = details.length > 0 ? details[details.length - 1] : null
  const parent =
    details.length > 1
      ? detailTitle(details[details.length - 2])
      : details.length === 1
        ? tabTitle(tab)
        : null

  React.useEffect(() => {
    if (!detail) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape" || e.isComposing) return

      const target = e.target as HTMLElement | null
      if (target?.closest(TEXT_ENTRY_SELECTOR)) return
      if (document.querySelector(OPEN_DIALOG_SELECTOR)) return

      onBack()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [detail, onBack])

  return (
    <div className="flex h-full flex-col">
      <StatsHeader
        title={detail ? detailTitle(detail) : tabTitle(tab)}
        parentTitle={parent}
        tight={!detail}
        range={range}
        month={month}
        availableMonths={availableMonths}
        loading={loading}
        onRangeChange={onRangeChange}
        onBack={onBack}
        onRefresh={onRefresh}
      />

      {!detail && <StatsTabs tab={tab} onChange={onTabChange} />}

      <Separator />

      <ScrollArea className="min-h-0 flex-1">
        {detail ? (
          <StatsDetailPage
            sub={detail}
            range={range}
            month={month}
            reloads={reloads}
            onLoadingChange={setLoading}
            onOpen={onOpen}
          />
        ) : tab === "overview" ? (
          <StatsOverviewPage
            range={range}
            month={month}
            reloads={reloads}
            onMonths={onMonths}
            onLoadingChange={setLoading}
            onOpen={onOpen}
            onSeeAll={setTab}
          />
        ) : isRanking(tab) ? (
          <StatsRankingPage
            of={tab}
            sort={rankings[tab].sort}
            offset={rankings[tab].offset}
            range={range}
            month={month}
            reloads={reloads}
            onLoadingChange={setLoading}
            onBrowse={onBrowse}
            onOpen={onOpen}
          />
        ) : null}
      </ScrollArea>
    </div>
  )
}
