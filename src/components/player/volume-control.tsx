import { Volume2Icon, Volume1Icon, VolumeXIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { usePlayer } from "@/hooks/use-player"

export function VolumeControl() {
  const { state, setVolume, toggleMute } = usePlayer()

  const effective = state.muted ? 0 : state.volume
  const Icon = effective === 0 ? VolumeXIcon : effective < 0.5 ? Volume1Icon : Volume2Icon

  return (
    <div className="flex items-center gap-1.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={toggleMute}
            aria-label={state.muted ? "Unmute" : "Mute"}
          >
            <Icon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{state.muted ? "Unmute" : "Mute"}</TooltipContent>
      </Tooltip>
      <Slider
        value={[Math.round(effective * 100)]}
        min={0}
        max={100}
        step={1}
        onValueChange={(v) => setVolume(v[0] / 100)}
        aria-label="Volume"
        className="w-24"
      />
    </div>
  )
}
