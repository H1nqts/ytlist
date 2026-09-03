import { ListVideoIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { usePlayer } from "@/hooks/use-player"
import { NowPlaying } from "@/components/player/now-playing"
import { TransportControls } from "@/components/player/transport-controls"
import { SeekBar } from "@/components/player/seek-bar"
import { VolumeControl } from "@/components/player/volume-control"

interface PlayerBarProps {
  onToggleQueue: () => void
  queueOpen: boolean
}

export function PlayerBar({ onToggleQueue, queueOpen }: PlayerBarProps) {
  const { state } = usePlayer()
  const upcomingCount = state.queue.length - (state.queueIndex + 1)

  return (
    <div className="grid h-20 grid-cols-[1fr_auto_1fr] items-center gap-4 px-4">
      {/* Left: now playing */}
      <div className="min-w-0">
        <NowPlaying />
      </div>

      {/* Center: transport + seek */}
      <div className="flex w-[min(36rem,42vw)] flex-col items-center gap-1">
        <TransportControls />
        <SeekBar />
      </div>

      {/* Right: volume + queue */}
      <div className="flex items-center justify-end gap-2">
        <VolumeControl />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={onToggleQueue}
              aria-label="Toggle queue"
              aria-expanded={queueOpen}
              className={cn("relative", queueOpen && "bg-muted text-foreground")}
            >
              <ListVideoIcon />
              {upcomingCount > 0 && (
                <Badge
                  variant="default"
                  className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[10px]"
                >
                  {upcomingCount}
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Play queue</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
