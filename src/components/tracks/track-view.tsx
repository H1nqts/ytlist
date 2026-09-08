import * as React from "react"
import { ClockIcon, TriangleAlertIcon } from "lucide-react"

import { formatRelative, formatTotalDuration } from "@/lib/format"
import { Thumbnail } from "@/components/ui/thumbnail"
import { MarqueeText } from "@/components/ui/marquee-text"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useLibrary } from "@/hooks/use-library"
import { TrackToolbar } from "@/components/tracks/track-toolbar"
import { TrackList } from "@/components/tracks/track-list"
import { TrackViewEmpty } from "@/components/tracks/track-view-empty"
import { SkippedDialog } from "@/components/tracks/skipped-dialog"

export function TrackView() {
  const { selectedPlaylist } = useLibrary()
  const [skippedOpen, setSkippedOpen] = React.useState(false)

  if (!selectedPlaylist) {
    return <TrackViewEmpty />
  }

  const totalSec = selectedPlaylist.tracks.reduce(
    (sum, t) => sum + t.durationSec,
    0
  )
  const isReady = selectedPlaylist.status === "idle"

  const skippedCount = selectedPlaylist.skipped.length
  const incomplete = selectedPlaylist.fetchOutcome?.complete === false
  const hasIssues = skippedCount > 0 || incomplete

  return (
    <>
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
                  <span>
                    Updated {formatRelative(selectedPlaylist.lastSyncedAt)}
                  </span>
                  {hasIssues && (
                    <>
                      <span aria-hidden>·</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            asChild
                            variant="destructive"
                            className="cursor-default hover:bg-destructive/20 dark:hover:bg-destructive/30"
                          >
                            <button
                              type="button"
                              onClick={() => setSkippedOpen(true)}
                            >
                              <TriangleAlertIcon />
                              {skippedCount > 0
                                ? `${skippedCount} skipped`
                                : "Incomplete"}
                            </button>
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          See what was left out
                        </TooltipContent>
                      </Tooltip>
                    </>
                  )}
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

      <SkippedDialog
        open={skippedOpen}
        onOpenChange={setSkippedOpen}
        skipped={selectedPlaylist.skipped}
        outcome={selectedPlaylist.fetchOutcome}
      />
    </>
  )
}
