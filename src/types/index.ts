// Domain model for the YouTube playlist client.

export type RepeatMode = "off" | "one" | "all"
export type PlaylistStatus = "idle" | "loading" | "error"
export type PlayActivation = "single" | "double"

export interface Track {
  id: string
  title: string
  channel: string
  channelAvatarUrl?: string
  thumbnailUrl: string
  durationSec: number
  views: number
}

export type SkipReason =
  | "missingContentId"
  | "emptyContentId"
  | "missingVideoId"
  | "unplayable"
  | "unknownRendererType"
  | "containerNotArray"

export interface SkippedVideo {
  /** Position within the page the entry came from, so it repeats across pages. */
  index: number
  videoId: string | null
  reason: SkipReason
  detail: string | null
}

export type FetchStop =
  | "notFetched"
  | "completed"
  | "stored"
  | "noContinuationToken"
  | "limitReached"
  | "requestFailed"
  | "responseShapeChanged"
  | "emptyPage"

export interface FetchOutcome {
  stop: FetchStop
  detail: string | null
  complete: boolean
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
  skipped: SkippedVideo[]
  fetchOutcome?: FetchOutcome
}

export interface QueueEntry {
  /** Unique within the queue, so one video can sit in it more than once. */
  key: string
  trackId: string
}

export interface PlayerState {
  isPlaying: boolean
  currentTrackId: string | null
  /** Which queue entry is playing; distinguishes repeats of one video. */
  currentQueueKey: string | null
  currentPlaylistId: number | null
  /** Duration of the current track, cached for the seek bar. */
  durationSec: number
  /** 0..1 */
  volume: number
  muted: boolean
  shuffle: boolean
  repeat: RepeatMode
  /** Full playback order (editable from the queue panel). */
  queue: QueueEntry[]
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

export interface AppSettings {
  playActivation: PlayActivation
}
