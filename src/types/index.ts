// Domain model for the YouTube playlist client (UI publishing — mock data).

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
  /** ISO timestamp — preserves the "original order" of the playlist. */
  addedAt: string
}

export interface Playlist {
  id: string
  title: string
  /** The (mock) link this playlist was fetched from. */
  sourceUrl: string
  thumbnailUrl: string
  tracks: Track[]
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
  currentPlaylistId: string | null
  /** Mock playback position, in seconds. */
  progressSec: number
  /** Duration of the current track, cached for the seek bar. */
  durationSec: number
  /** 0..1 */
  volume: number
  muted: boolean
  shuffle: boolean
  repeat: RepeatMode
  /** Upcoming track ids (editable from the queue panel). */
  queue: string[]
  /** Recently played track ids, used for "previous". */
  history: string[]
}

export interface LibraryState {
  playlists: Playlist[]
  selectedPlaylistId: string | null
  search: string
}
