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
  parent: StatsSubView | null
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
  parent,
  range,
  month,
  availableMonths,
  loading,
  onRangeChange,
  onBack,
  onRefresh,
}: StatsHeaderProps) {
  const parentTitle = parent && subViewTitle(parent)

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-6 pt-6 pb-3">
      <div className="flex min-w-0 items-center gap-2">
        {parentTitle && (
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onBack}
            aria-label={`Back to ${parentTitle}`}
          >
            <ArrowLeftIcon />
          </Button>
        )}
        <div className="min-w-0">
          {parentTitle && (
            <p className="truncate text-[11px] text-muted-foreground">
              {parentTitle}
            </p>
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
