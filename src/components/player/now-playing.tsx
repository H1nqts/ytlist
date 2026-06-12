import { Thumbnail } from "@/components/ui/thumbnail"
import { usePlayer } from "@/hooks/use-player"

export function NowPlaying() {
  const { currentTrack } = usePlayer()

  if (!currentTrack) {
    return (
      <div className="flex min-w-0 items-center gap-3">
        <div className="aspect-square size-14 shrink-0 rounded-md bg-muted" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-muted-foreground">
            Nothing playing
          </p>
          <p className="truncate text-xs text-muted-foreground">
            Pick a track to start
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      <Thumbnail
        src={currentTrack.thumbnailUrl}
        alt={currentTrack.title}
        className="aspect-square size-14"
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {currentTrack.title}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {currentTrack.channel}
        </p>
      </div>
    </div>
  )
}
