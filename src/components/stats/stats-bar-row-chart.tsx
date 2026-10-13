export interface BarRow {
  key: string
  label: string
  value: number
  caption: string
}

interface StatsBarRowChartProps {
  heading: string
  rows: BarRow[]
}

export function StatsBarRowChart({ heading, rows }: StatsBarRowChartProps) {
  const peak = Math.max(1, ...rows.map((row) => row.value))

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium text-foreground">{heading}</h2>

      <ul className="space-y-1">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-2">
            <span className="w-8 shrink-0 text-[11px] text-muted-foreground">
              {row.label}
            </span>
            <div className="relative h-5 min-w-0 flex-1 overflow-hidden rounded-sm bg-muted/40">
              <div
                aria-hidden
                style={{ width: `${(row.value / peak) * 100}%` }}
                className="h-full rounded-sm bg-primary/70"
              />
            </div>
            <span className="w-28 shrink-0 text-right text-[11px] text-muted-foreground tabular-nums">
              {row.caption}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
