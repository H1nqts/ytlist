import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TABS, type StatsTab } from "@/components/stats/stats-sub-view"

interface StatsTabsProps {
  tab: StatsTab
  onChange: (tab: StatsTab) => void
}

export function StatsTabs({ tab, onChange }: StatsTabsProps) {
  return (
    <Tabs
      value={tab}
      onValueChange={(value) => onChange(value as StatsTab)}
      className="gap-0 px-6 pb-1.25"
    >
      <TabsList variant="line" className="gap-4 p-0">
        {TABS.map((entry) => (
          <TabsTrigger
            key={entry.value}
            value={entry.value}
            className="flex-none px-0"
          >
            {entry.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
