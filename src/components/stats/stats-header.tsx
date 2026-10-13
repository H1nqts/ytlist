import { ArrowLeftIcon, RefreshCwIcon } from "lucide-react"

import type { StatsRange } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { StatsRangeFilter } from "@/components/stats/stats-range-filter"
import { subViewTitle, type StatsSubView } from "@/components/stats/stats-sub-view"

interface StatsHeaderProps {
  sub: StatsSubView
  range: StatsRange
  month: string | null
  availableMonths: string[]
  loading: boolean
  onRangeChange: (range: StatsRange, month: string | null) => void
  onBack: () => void
  onRefresh: () => void
}

export function StatsHeader({
  sub,
  range,
  month,
  availableMonths,
  loading,
  onRangeChange,
  onBack,
  onRefresh,
}: StatsHeaderProps) {
  const nested = sub.kind !== "overview"

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-6 pt-6 pb-3">
      <div className="flex min-w-0 items-center gap-2">
        {nested && (
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onBack}
            aria-label="Back to statistics"
          >
            <ArrowLeftIcon />
          </Button>
        )}
        <div className="min-w-0">
          {nested && (
            <p className="text-[11px] text-muted-foreground">Statistics</p>
          )}
          <h1 className="truncate font-heading text-2xl font-semibold">
            {subViewTitle(sub)}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <StatsRangeFilter
          range={range}
          month={month}
          availableMonths={availableMonths}
          onChange={onRangeChange}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={loading}
              onClick={onRefresh}
              aria-label="Refresh statistics"
            >
              <RefreshCwIcon className={cn(loading && "animate-spin")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh</TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}
