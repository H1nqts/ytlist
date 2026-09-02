import { Button } from "@/components/ui/button"
import { Thumbnail } from "@/components/ui/thumbnail"
import { MarqueeText } from "@/components/ui/marquee-text"
import { usePlayer } from "@/hooks/use-player"

const SETUP_MESSAGE: Record<string, string> = {
  checking: "Preparing playback…",
  downloading: "Downloading yt-dlp…",
  updating: "Updating yt-dlp…",
}

export function NowPlaying() {
  const { currentTrack, streamLoading, streamError, ytdlp, retryYtdlp } = usePlayer()

  if (ytdlp.state === "error") {
    return (
      <div className="flex min-w-0 items-center gap-3">
        <div className="aspect-square size-14 shrink-0 rounded-md bg-muted" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-destructive">
            Playback unavailable
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {ytdlp.message ?? "Could not set up yt-dlp"}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={retryYtdlp}>
          Retry
        </Button>
      </div>
    )
  }

  if (!currentTrack) {
    return (
      <div className="flex min-w-0 items-center gap-3">
        <div className="aspect-square size-14 shrink-0 rounded-md bg-muted" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-muted-foreground">
            Nothing playing
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {SETUP_MESSAGE[ytdlp.state] ?? "Pick a track to start"}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 items-center gap-3" data-marquee-group>
      <Thumbnail
        src={currentTrack.thumbnailUrl}
        alt={currentTrack.title}
        className="aspect-square size-14"
      />
      <div className="min-w-0 flex-1">
        <MarqueeText as="p" group className="text-sm font-medium text-foreground">
          {currentTrack.title}
        </MarqueeText>
        <p className="truncate text-xs text-muted-foreground">
          {streamLoading
            ? "Loading stream…"
            : streamError
              ? streamError
              : currentTrack.channel}
        </p>
      </div>
    </div>
  )
}
