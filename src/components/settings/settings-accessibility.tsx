import { MousePointerClickIcon, MousePointer2Icon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { PlayActivation } from "@/state/settings-context"
import { useSettings } from "@/hooks/use-settings"

interface OptionCardProps {
  selected: boolean
  onSelect: () => void
  icon: React.ReactNode
  title: string
  description: string
}

function OptionCard({ selected, onSelect, icon, title, description }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex flex-1 flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-colors outline-none",
        "focus-visible:ring-3 focus-visible:ring-ring/50",
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:bg-accent"
      )}
    >
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-md",
          selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}
      >
        {icon}
      </span>
      <span className="text-sm font-medium text-foreground">{title}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </button>
  )
}

export function SettingsAccessibility() {
  const { playActivation, setPlayActivation } = useSettings()

  const choose = (mode: PlayActivation) => setPlayActivation(mode)

  return (
    <div className="space-y-3 py-1">
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-foreground">Play a track on…</p>
        <p className="text-xs text-muted-foreground">
          Choose how clicking a track in the list starts playback.
        </p>
      </div>

      <div className="flex gap-2">
        <OptionCard
          selected={playActivation === "single"}
          onSelect={() => choose("single")}
          icon={<MousePointerClickIcon className="size-4" />}
          title="Single click"
          description="One click plays the track right away."
        />
        <OptionCard
          selected={playActivation === "double"}
          onSelect={() => choose("double")}
          icon={<MousePointer2Icon className="size-4" />}
          title="Double click"
          description="Play a track only when you double click it."
        />
      </div>
    </div>
  )
}
