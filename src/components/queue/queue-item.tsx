import { XIcon, PlayIcon, Volume2Icon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { Track } from "@/types"
import { formatDuration } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Thumbnail } from "@/components/ui/thumbnail"
import { usePlayer } from "@/hooks/use-player"

interface QueueItemProps {
  track: Track
  /** When true, this is the currently-playing track (pinned, not removable). */
  current?: boolean
}

export function QueueItem({ track, current = false }: QueueItemProps) {
  const { state, jumpInQueue, removeFromQueue } = usePlayer()

  return (
    <div
      className={cn(
        "group/qitem flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors",
        current ? "bg-accent" : "hover:bg-accent"
      )}
    >
      <Thumbnail
        src={track.thumbnailUrl}
        alt={track.title}
        className="aspect-video h-9 w-auto"
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-medium",
            current ? "text-primary" : "text-foreground"
          )}
        >
          {track.title}
        </p>
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
              onClick={() => jumpInQueue(track.id)}
            >
              <PlayIcon />
            </Button>
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label="Remove from queue"
              onClick={() => removeFromQueue(track.id)}
            >
              <XIcon />
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
