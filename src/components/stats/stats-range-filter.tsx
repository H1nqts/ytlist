import type { StatsRange } from "@/lib/api"
import { cn } from "@/lib/utils"
import { formatMonth } from "@/lib/format"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const PRESETS: { value: StatsRange; label: string }[] = [
  { value: "last7Days", label: "7 days" },
  { value: "last30Days", label: "30 days" },
  { value: "all", label: "All time" },
]

interface StatsRangeFilterProps {
  range: StatsRange
  month: string | null
  availableMonths: string[]
  onChange: (range: StatsRange, month: string | null) => void
}

export function StatsRangeFilter({
  range,
  month,
  availableMonths,
  onChange,
}: StatsRangeFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PRESETS.map((preset) => {
        const selected = range === preset.value
        return (
          <button
            key={preset.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(preset.value, null)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors outline-none",
              "focus-visible:ring-3 focus-visible:ring-ring/50",
              selected
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {preset.label}
          </button>
        )
      })}

      {availableMonths.length > 0 && (
        <Select
          value={range === "month" && month ? month : ""}
          onValueChange={(value) => onChange("month", value)}
        >
          <SelectTrigger
            size="sm"
            aria-label="Pick a month"
            className={cn(
              "w-36 text-xs",
              range === "month" && "border-primary text-foreground"
            )}
          >
            <SelectValue placeholder="By month" />
          </SelectTrigger>
          <SelectContent position="popper" align="start" sideOffset={4}>
            {availableMonths.map((value) => (
              <SelectItem key={value} value={value} className="text-xs">
                {formatMonth(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
