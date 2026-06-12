import {
  PlayIcon,
  PauseIcon,
  SkipBackIcon,
  SkipForwardIcon,
  ShuffleIcon,
  RepeatIcon,
  Repeat1Icon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { RepeatMode } from "@/types"
import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { usePlayer } from "@/hooks/use-player"

const REPEAT_LABEL: Record<RepeatMode, string> = {
  off: "Repeat: off",
  all: "Repeat: all",
  one: "Repeat: one",
}

export function TransportControls() {
  const { state, currentTrack, togglePlay, next, prev, toggleShuffle, cycleRepeat } =
    usePlayer()

  const hasTrack = Boolean(currentTrack)

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            size="sm"
            pressed={state.shuffle}
            onPressedChange={toggleShuffle}
            aria-label="Shuffle"
          >
            <ShuffleIcon />
          </Toggle>
        </TooltipTrigger>
        <TooltipContent>{state.shuffle ? "Shuffle: on" : "Shuffle: off"}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={prev}
            disabled={!hasTrack}
            aria-label="Previous"
          >
            <SkipBackIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Previous</TooltipContent>
      </Tooltip>

      <Button
        size="icon"
        onClick={togglePlay}
        disabled={!hasTrack}
        aria-label={state.isPlaying ? "Pause" : "Play"}
        className="rounded-full"
      >
        {state.isPlaying ? <PauseIcon /> : <PlayIcon />}
      </Button>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={next}
            disabled={!hasTrack}
            aria-label="Next"
          >
            <SkipForwardIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Next</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            size="sm"
            pressed={state.repeat !== "off"}
            onPressedChange={cycleRepeat}
            aria-label={REPEAT_LABEL[state.repeat]}
            className={cn(state.repeat !== "off" && "text-primary")}
          >
            {state.repeat === "one" ? <Repeat1Icon /> : <RepeatIcon />}
          </Toggle>
        </TooltipTrigger>
        <TooltipContent>{REPEAT_LABEL[state.repeat]}</TooltipContent>
      </Tooltip>
    </div>
  )
}
