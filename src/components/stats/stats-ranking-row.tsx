import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { MarqueeText } from "@/components/ui/marquee-text"

export interface RankingRow {
  key: string
  rank: number
  title: string
  meta: string
  listenedMs: number
  media?: React.ReactNode
  removed?: boolean
}

interface StatsRankingRowProps {
  row: RankingRow
  peak: number
  onSelect?: () => void
}

export function StatsRankingRow({ row, peak, onSelect }: StatsRankingRowProps) {
  return (
    <li
      className={cn(
        "relative flex items-center gap-3 overflow-hidden rounded-md px-2 py-2",
        onSelect && "cursor-pointer hover:bg-accent/50"
      )}
      {...(onSelect && {
        role: "button",
        tabIndex: 0,
        onClick: onSelect,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onSelect()
          }
        },
      })}
    >
      <div
        aria-hidden
        style={{ width: `${(row.listenedMs / peak) * 100}%` }}
        className="absolute inset-y-0 left-0 bg-primary/8"
      />
      <span className="relative w-7 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {row.rank}
      </span>
      {row.media}
      <div className="relative min-w-0 flex-1">
        <MarqueeText className="text-xs font-medium text-foreground">
          {row.title}
        </MarqueeText>
        <p className="truncate text-[11px] text-muted-foreground">{row.meta}</p>
      </div>
      {row.removed && (
        <Badge variant="secondary" className="relative shrink-0 text-[10px]">
          Removed
        </Badge>
      )}
    </li>
  )
}
