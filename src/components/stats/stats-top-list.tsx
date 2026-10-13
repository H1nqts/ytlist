import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { MarqueeText } from "@/components/ui/marquee-text"

export interface TopEntry {
  key: string
  title: string
  meta: string
  listenedMs: number
  media: React.ReactNode
}

interface StatsTopListProps {
  heading: string
  entries: TopEntry[]
  emptyLabel: string
  onSeeAll?: () => void
  onSelect?: (key: string) => void
}

export function StatsTopList({
  heading,
  entries,
  emptyLabel,
  onSeeAll,
  onSelect,
}: StatsTopListProps) {
  const peak = Math.max(1, ...entries.map((e) => e.listenedMs))

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-foreground">{heading}</h2>
        {onSeeAll && entries.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onSeeAll}
            className="h-6 px-2 text-[11px] text-muted-foreground"
          >
            See all
          </Button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ol className="space-y-1">
          {entries.map((entry, i) => (
            <li
              key={entry.key}
              className="relative flex items-center gap-2.5 overflow-hidden rounded-md px-2 py-1.5"
            >
              <div
                aria-hidden
                style={{ width: `${(entry.listenedMs / peak) * 100}%` }}
                className="absolute inset-y-0 left-0 bg-primary/8"
              />
              <span className="relative w-4 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                {i + 1}
              </span>
              {entry.media}
              <div
                className={cn(
                  "relative min-w-0 flex-1",
                  onSelect && "cursor-pointer"
                )}
                {...(onSelect && {
                  role: "button",
                  tabIndex: 0,
                  onClick: () => onSelect(entry.key),
                  onKeyDown: (e: React.KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      onSelect(entry.key)
                    }
                  },
                })}
              >
                <MarqueeText className="text-xs font-medium text-foreground">
                  {entry.title}
                </MarqueeText>
                <p className="truncate text-[11px] text-muted-foreground">
                  {entry.meta}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
