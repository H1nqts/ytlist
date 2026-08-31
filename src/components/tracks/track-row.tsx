import { PlayIcon, ListPlusIcon, EyeIcon, Volume2Icon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import type { Track } from "@/types"
import { formatDuration, formatViews } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Thumbnail } from "@/components/ui/thumbnail"
import { MarqueeText } from "@/components/ui/marquee-text"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { usePlayer } from "@/hooks/use-player"
import { useSettings } from "@/hooks/use-settings"

interface TrackRowProps {
  track: Track
  index: number
  playlistId: number
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

export function TrackRow({ track, index, playlistId }: TrackRowProps) {
  const { state, currentTrack, playTrack, enqueue } = usePlayer()
  const { playActivation } = useSettings()

  const isCurrent = currentTrack?.id === track.id
  const isPlayingThis = isCurrent && state.isPlaying

  function play() {
    playTrack(track.id, playlistId)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={playActivation === "single" ? play : undefined}
      onDoubleClick={playActivation === "double" ? play : undefined}
      onKeyDown={(e) => {
        if (e.key === "Enter") play()
      }}
      className={cn(
        "group/row flex cursor-default items-center gap-3 rounded-lg px-3 py-2 outline-none transition-colors",
        "hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
        isCurrent && "bg-accent"
      )}
      data-current={isCurrent}
      data-marquee-group
    >
      {/* Index / play indicator */}
      <div className="flex w-6 shrink-0 items-center justify-center text-xs text-muted-foreground">
        {isPlayingThis ? (
          <Volume2Icon className="size-4 text-primary" />
        ) : isCurrent ? (
          <PlayIcon className="size-4 text-primary" />
        ) : (
          <>
            <span className="group-hover/row:hidden">{index + 1}</span>
            <button
              type="button"
              aria-label={`Play ${track.title}`}
              onClick={(e) => {
                e.stopPropagation()
                play()
              }}
              className="hidden text-foreground group-hover/row:block"
            >
              <PlayIcon className="size-4" />
            </button>
          </>
        )}
      </div>

      <Thumbnail
        src={track.thumbnailUrl}
        alt={track.title}
        className="hidden aspect-video h-10 w-auto @xs:block"
      />

      <div className="min-w-0 flex-1 @2xl:max-w-[46ch] @5xl:max-w-[64ch]">
        <MarqueeText
          as="p"
          group
          className={cn(
            "text-sm font-medium",
            isCurrent ? "text-primary" : "text-foreground"
          )}
        >
          {track.title}
        </MarqueeText>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Avatar className="size-4">
            <AvatarImage src={track.channelAvatarUrl} alt={track.channel} />
            <AvatarFallback className="text-[8px]">
              {initials(track.channel)}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{track.channel}</span>
        </div>
      </div>

      <div className="flex-1" aria-hidden />

      <div className="hidden w-24 shrink-0 items-center gap-1 text-xs text-muted-foreground @lg:flex">
        <EyeIcon className="size-3.5 shrink-0" />
        <span className="truncate">{formatViews(track.views)}</span>
      </div>

      <div className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {formatDuration(track.durationSec)}
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Add to queue"
            onClick={(e) => {
              e.stopPropagation()
              enqueue(track.id)
              toast.success("Added to queue", { description: track.title })
            }}
            className="opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100"
          >
            <ListPlusIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Add to queue</TooltipContent>
      </Tooltip>
    </div>
  )
}
