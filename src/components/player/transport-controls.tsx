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
import type { YtdlpState } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
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

const PREPARING_LABEL: Partial<Record<YtdlpState, string>> = {
  checking: "Preparing playback…",
  downloading: "Downloading yt-dlp…",
  updating: "Updating yt-dlp…",
  error: "Playback unavailable",
}

const ACTIVE_TOGGLE = cn(
  "relative text-primary hover:text-primary data-[state=on]:bg-primary/15 data-[state=on]:text-primary",
  "after:absolute after:-bottom-0.5 after:left-1/2 after:size-1 after:-translate-x-1/2",
  "after:rounded-full after:bg-primary after:content-['']"
)

export function TransportControls() {
  const {
    state,
    currentTrack,
    streamLoading,
    ytdlp,
    togglePlay,
    next,
    prev,
    toggleShuffle,
    cycleRepeat,
  } = usePlayer()

  const ready = ytdlp.state === "ready"
  const hasTrack = Boolean(currentTrack) && ready
  const busy = streamLoading || !ready

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            size="sm"
            pressed={state.shuffle}
            onPressedChange={toggleShuffle}
            aria-label="Shuffle"
            className={cn(state.shuffle && ACTIVE_TOGGLE)}
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

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            onClick={togglePlay}
            disabled={!hasTrack || streamLoading}
            aria-label={state.isPlaying ? "Pause" : "Play"}
            className="rounded-full"
          >
            {busy ? (
              <Spinner className="text-primary-foreground" />
            ) : state.isPlaying ? (
              <PauseIcon />
            ) : (
              <PlayIcon />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{PREPARING_LABEL[ytdlp.state] ?? (state.isPlaying ? "Pause" : "Play")}</TooltipContent>
      </Tooltip>

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
            className={cn(state.repeat !== "off" && ACTIVE_TOGGLE)}
          >
            {state.repeat === "one" ? <Repeat1Icon /> : <RepeatIcon />}
          </Toggle>
        </TooltipTrigger>
        <TooltipContent>{REPEAT_LABEL[state.repeat]}</TooltipContent>
      </Tooltip>
    </div>
  )
}
