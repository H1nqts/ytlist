import * as React from "react"
import { SearchIcon, PlayIcon, ShuffleIcon, XIcon } from "lucide-react"

import type { Playlist } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLibrary } from "@/hooks/use-library"
import { usePlayer } from "@/hooks/use-player"
import { useDebouncedValue } from "@/hooks/use-debounced-value"

interface TrackToolbarProps {
  playlist: Playlist
}

export function TrackToolbar({ playlist }: TrackToolbarProps) {
  const { state, setSearch, visibleTracks } = useLibrary()
  const { state: playerState, playTrack, toggleShuffle } = usePlayer()

  const [localSearch, setLocalSearch] = React.useState(state.search)
  const debounced = useDebouncedValue(localSearch, 250)

  React.useEffect(() => {
    setSearch(debounced)
  }, [debounced, setSearch])

  // Reset the local field when the playlist changes (context clears search too).
  React.useEffect(() => {
    setLocalSearch("")
  }, [playlist.id])

  const playable = playlist.tracks.length > 0

  function handlePlayAll() {
    if (!playable) return
    playTrack(playlist.tracks[0].id, playlist.id)
  }

  function handleShuffleAll() {
    if (!playable) return
    // Enable shuffle then start from a track — queue is shuffled on PLAY_TRACK.
    if (!playerState.shuffle) toggleShuffle()
    const first = playlist.tracks[0]
    playTrack(first.id, playlist.id)
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-6 py-3">
      <div className="relative min-w-48 flex-1">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Search in this playlist"
          aria-label="Search tracks"
          className="pl-8"
        />
        {localSearch && (
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label="Clear search"
            onClick={() => setLocalSearch("")}
            className="absolute top-1/2 right-1.5 -translate-y-1/2"
          >
            <XIcon />
          </Button>
        )}
      </div>

      <Button onClick={handlePlayAll} disabled={!playable}>
        <PlayIcon />
        Play
      </Button>
      <Button variant="secondary" onClick={handleShuffleAll} disabled={!playable}>
        <ShuffleIcon />
        Shuffle
      </Button>

      <span className="ml-auto text-xs text-muted-foreground">
        {visibleTracks.length} of {playlist.tracks.length}
      </span>
    </div>
  )
}
