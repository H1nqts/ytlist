import {
  AlertCircleIcon,
  SearchXIcon,
  MusicIcon,
  DownloadCloudIcon,
} from "lucide-react"

import type { Playlist } from "@/types"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { TrackRow } from "@/components/tracks/track-row"
import { useLibrary } from "@/hooks/use-library"

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
    <ScrollArea className="h-full">
      <div className="@container flex flex-col gap-0.5 px-3 pb-4">
        {visibleTracks.map((track, i) => (
          <TrackRow
            key={track.id}
            track={track}
            index={i}
            playlistId={playlist.id}
          />
        ))}
      </div>
    </ScrollArea>
  )
}
