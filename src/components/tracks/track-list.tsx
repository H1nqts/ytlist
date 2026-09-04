import * as React from "react"
import {
  AlertCircleIcon,
  SearchXIcon,
  MusicIcon,
  DownloadCloudIcon,
} from "lucide-react"

import type { Playlist, Track } from "@/types"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { TrackRow } from "@/components/tracks/track-row"
import { useLibrary } from "@/hooks/use-library"
import { useRowWindow } from "@/hooks/use-row-window"

const ROW_HEIGHT = 56
const ROW_GAP = 2
const ROW_PITCH = ROW_HEIGHT + ROW_GAP
const OVERSCAN = 6

interface TrackListProps {
  playlist: Playlist
}

export function TrackList({ playlist }: TrackListProps) {
  const { visibleTracks, state, fetchPlaylist } = useLibrary()

  if (playlist.status === "loading") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <Spinner className="size-6" />
        <p className="text-sm">
          {playlist.loadingKind === "refresh"
            ? "Refreshing tracks…"
            : "Fetching tracks…"}
        </p>
      </div>
    )
  }

  if (playlist.status === "error") {
    return (
      <EmptyState
        icon={AlertCircleIcon}
        title={playlist.errorMessage ?? "Couldn't load this playlist"}
        description="The link may be invalid, or the playlist may be private or removed."
        action={
          <Button variant="outline" onClick={() => fetchPlaylist(playlist.id)}>
            <DownloadCloudIcon />
            Try again
          </Button>
        }
      />
    )
  }

  if (!playlist.tracksLoaded) {
    return (
      <EmptyState
        icon={DownloadCloudIcon}
        title="No tracks loaded yet"
        description="Fetch this playlist from its link to load its tracks."
        action={
          <Button variant="outline" onClick={() => fetchPlaylist(playlist.id)}>
            <DownloadCloudIcon />
            Fetch from link
          </Button>
        }
      />
    )
  }

  if (playlist.tracks.length === 0) {
    return (
      <EmptyState
        icon={MusicIcon}
        title="This playlist is empty"
        description="No tracks were found in this playlist."
      />
    )
  }

  if (visibleTracks.length === 0) {
    return (
      <EmptyState
        icon={SearchXIcon}
        title="No matching tracks"
        description={`Nothing matches "${state.search}". Try a different search.`}
      />
    )
  }

  return (
    <TrackRows
      key={`${playlist.id}:${state.search}`}
      tracks={visibleTracks}
      playlistId={playlist.id}
    />
  )
}

interface TrackRowsProps {
  tracks: Track[]
  playlistId: number
}

function TrackRows({ tracks, playlistId }: TrackRowsProps) {
  const viewportRef = React.useRef<HTMLDivElement>(null)
  const { start, end, offsetTop } = useRowWindow(
    viewportRef,
    tracks.length,
    ROW_PITCH,
    OVERSCAN
  )

  return (
    <ScrollArea viewportRef={viewportRef} className="h-full">
      <div className="@container px-3 pb-4">
        <div style={{ height: offsetTop }} />
        <div className="flex flex-col gap-0.5">
          {tracks.slice(start, end).map((track, i) => (
            <TrackRow
              key={track.id}
              track={track}
              index={start + i}
              playlistId={playlistId}
            />
          ))}
        </div>
        <div style={{ height: (tracks.length - end) * ROW_PITCH }} />
      </div>
    </ScrollArea>
  )
}
