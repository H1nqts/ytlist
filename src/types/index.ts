// Domain model for the YouTube playlist client.

export type RepeatMode = "off" | "one" | "all"
export type PlaylistStatus = "idle" | "loading" | "error"

export interface Track {
  id: string
  title: string
  channel: string
  channelAvatarUrl?: string
  thumbnailUrl: string
  durationSec: number
  views: number
}

export interface Playlist {
  /** Backend row id; negative while the playlist is not persisted yet. */
  id: number
  title: string
  /** The link this playlist was fetched from. */
  sourceUrl: string
  thumbnailUrl: string
  tracks: Track[]
  /** False means `tracks` is empty because nothing was fetched yet. */
  tracksLoaded: boolean
  status: PlaylistStatus
  /** Which operation is in progress while status === "loading". */
  loadingKind?: "fetch" | "refresh"
  /** Present when status === "error" (e.g. "This playlist is private"). */
  errorMessage?: string
  /** ISO timestamp of the last successful fetch/refresh. */
  lastSyncedAt: string
}

export interface PlayerState {
  isPlaying: boolean
  currentTrackId: string | null
  currentPlaylistId: number | null
  /** Duration of the current track, cached for the seek bar. */
  durationSec: number
  /** 0..1 */
  volume: number
  muted: boolean
  shuffle: boolean
  repeat: RepeatMode
  /** Full playback order (editable from the queue panel). */
  queue: string[]
  /** -1 when nothing is playing. */
  queueIndex: number
}

export interface LibraryState {
  playlists: Playlist[]
  selectedPlaylistId: number | null
  search: string
  /** True until the first `playlist_get_all` load resolves (or fails). */
  initialLoading: boolean
}
