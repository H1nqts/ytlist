import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

interface StatsPagerProps {
  offset: number
  count: number
  total: number
  pageSize: number
  onOffsetChange: (offset: number) => void
}

export function StatsPager({
  offset,
  count,
  total,
  pageSize,
  onOffsetChange,
}: StatsPagerProps) {
  if (total <= pageSize) return null

  const first = offset + 1
  const last = offset + count

  return (
    <div className="flex items-center justify-between gap-3 pt-1">
      <p className="text-[11px] text-muted-foreground tabular-nums">
        {count === 0
          ? `0 of ${total.toLocaleString()}`
          : `${first.toLocaleString()}–${last.toLocaleString()} of ${total.toLocaleString()}`}
      </p>

      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          disabled={offset === 0}
          onClick={() => onOffsetChange(Math.max(0, offset - pageSize))}
        >
          <ChevronLeftIcon />
          Previous
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={last >= total}
          onClick={() => onOffsetChange(offset + pageSize)}
        >
          Next
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  )
}
