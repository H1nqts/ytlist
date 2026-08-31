import { ClockIcon } from "lucide-react"

import { formatRelative, formatTotalDuration } from "@/lib/format"
import { Thumbnail } from "@/components/ui/thumbnail"
import { MarqueeText } from "@/components/ui/marquee-text"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useLibrary } from "@/hooks/use-library"
import { TrackToolbar } from "@/components/tracks/track-toolbar"
import { TrackList } from "@/components/tracks/track-list"
import { TrackViewEmpty } from "@/components/tracks/track-view-empty"

export function TrackView() {
  const { selectedPlaylist } = useLibrary()

  if (!selectedPlaylist) {
    return <TrackViewEmpty />
  }

  const totalSec = selectedPlaylist.tracks.reduce(
    (sum, t) => sum + t.durationSec,
    0
  )
  const isReady = selectedPlaylist.status === "idle"

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-4 px-6 pt-6 pb-2">
        <Thumbnail
          src={selectedPlaylist.thumbnailUrl}
          alt={selectedPlaylist.title}
          className="aspect-video h-20 w-auto rounded-lg"
        />
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Playlist
          </p>
          <MarqueeText as="h1" className="font-heading text-2xl font-semibold">
            {selectedPlaylist.title}
          </MarqueeText>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {isReady ? (
              <>
                <Badge variant="secondary">
                  {selectedPlaylist.tracks.length} tracks
                </Badge>
                <span className="flex items-center gap-1">
                  <ClockIcon className="size-3.5" />
                  {formatTotalDuration(totalSec)}
                </span>
                <span aria-hidden>·</span>
                <span>Updated {formatRelative(selectedPlaylist.lastSyncedAt)}</span>
              </>
            ) : selectedPlaylist.status === "error" ? (
              <Badge variant="destructive">Failed to load</Badge>
            ) : (
              <Badge variant="secondary">Loading…</Badge>
            )}
          </div>
        </div>
      </header>

      <TrackToolbar playlist={selectedPlaylist} />
      <Separator />

      <div className="min-h-0 flex-1 pt-2">
        <TrackList playlist={selectedPlaylist} />
      </div>
    </div>
  )
}
