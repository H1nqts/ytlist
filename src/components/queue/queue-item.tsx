import { XIcon, PlayIcon, Volume2Icon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { Track } from "@/types"
import { formatDuration } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Thumbnail } from "@/components/ui/thumbnail"
import { MarqueeText } from "@/components/ui/marquee-text"
import { usePlayer } from "@/hooks/use-player"
import { useSettings } from "@/hooks/use-settings"

interface QueueItemProps {
  track: Track
  /** When true, this is the currently-playing track (pinned, not removable). */
  current?: boolean
}

export function QueueItem({ track, current = false }: QueueItemProps) {
  const { state, jumpInQueue, removeFromQueue } = usePlayer()
  const { playActivation } = useSettings()

  function jump() {
    jumpInQueue(track.id)
  }

  return (
    <div
      role={current ? undefined : "button"}
      tabIndex={current ? undefined : 0}
      onClick={!current && playActivation === "single" ? jump : undefined}
      onDoubleClick={!current && playActivation === "double" ? jump : undefined}
      onKeyDown={(e) => {
        if (!current && e.key === "Enter") jump()
      }}
      className={cn(
        "group/qitem flex items-center gap-3 rounded-lg px-2 py-1.5 outline-none transition-colors",
        current
          ? "bg-accent"
          : "cursor-default hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
      )}
      data-marquee-group
    >
      <Thumbnail
        src={track.thumbnailUrl}
        alt={track.title}
        className="aspect-video h-9 w-auto"
      />
      <div className="min-w-0 flex-1">
        <MarqueeText
          as="p"
          group
          className={cn(
            "text-sm font-medium",
            current ? "text-primary" : "text-foreground"
          )}
        >
          {track.title}
        </MarqueeText>
        <p className="truncate text-xs text-muted-foreground">{track.channel}</p>
      </div>

      {current ? (
        <span className="flex w-9 items-center justify-center text-primary">
          {state.isPlaying ? (
            <Volume2Icon className="size-4" />
          ) : (
            <PlayIcon className="size-4" />
          )}
        </span>
      ) : (
        <>
          <span className="w-10 text-right text-[11px] tabular-nums text-muted-foreground group-hover/qitem:hidden">
            {formatDuration(track.durationSec)}
          </span>
          <div className="hidden items-center gap-0.5 group-hover/qitem:flex">
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label={`Play ${track.title} now`}
              onClick={(e) => {
                e.stopPropagation()
                jump()
              }}
            >
              <PlayIcon />
            </Button>
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label="Remove from queue"
              onClick={(e) => {
                e.stopPropagation()
                removeFromQueue(track.id)
              }}
            >
              <XIcon />
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
