import type { PlayerState, RepeatMode } from "@/types"

/** Past this point, "previous" restarts the current track instead of going back. */
export const RESTART_THRESHOLD_SEC = 3

export type PlayerAction =
  | {
      type: "PLAY_TRACK"
      trackId: string
      playlistId: number
      durationSec: number
      /** Ordered ids of the playlist this track belongs to. */
      playlistTrackIds: string[]
      shuffle?: boolean
    }
  | { type: "TOGGLE_PLAY" }
  | { type: "SET_DURATION"; durationSec: number }
  | { type: "NEXT" }
  | { type: "PREV" }
  | { type: "SEEK"; progressSec: number }
  | { type: "SET_VOLUME"; volume: number }
  | { type: "TOGGLE_MUTE" }
  | { type: "TOGGLE_SHUFFLE" }
  | { type: "CYCLE_REPEAT" }
  | { type: "PROGRESS"; progressSec: number }
  | { type: "PAUSE" }
  | { type: "SET_QUEUE"; queue: string[] }
  | { type: "ENQUEUE"; trackId: string }
  | { type: "REMOVE_FROM_QUEUE"; trackId: string }
  | { type: "JUMP_IN_QUEUE"; trackId: string; durationSec: number }

export const initialPlayerState: PlayerState = {
  isPlaying: false,
  currentTrackId: null,
  currentPlaylistId: null,
  progressSec: 0,
  durationSec: 0,
  volume: 0.8,
  muted: false,
  shuffle: false,
  repeat: "off",
  queue: [],
  history: [],
}

const nextRepeat: Record<RepeatMode, RepeatMode> = {
  off: "all",
  all: "one",
  one: "off",
}

function shuffleExcept(ids: string[], keep: string, seed: number): string[] {
  const rest = ids.filter((id) => id !== keep)
  // Deterministic Fisher–Yates using a tiny LCG (avoids Math.random()).
  let s = seed >>> 0 || 1
  for (let i = rest.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0
    const j = s % (i + 1)
    ;[rest[i], rest[j]] = [rest[j], rest[i]]
  }
  return rest
}

/** Build the upcoming queue for a track within its playlist. */
function buildQueue(
  playlistTrackIds: string[],
  currentId: string,
  shuffle: boolean
): string[] {
  if (shuffle) {
    return shuffleExcept(playlistTrackIds, currentId, currentId.length * 7 + 3)
  }
  const idx = playlistTrackIds.indexOf(currentId)
  if (idx === -1) return playlistTrackIds.filter((id) => id !== currentId)
  return playlistTrackIds.slice(idx + 1)
}

export function playerReducer(
  state: PlayerState,
  action: PlayerAction
): PlayerState {
  switch (action.type) {
    case "PLAY_TRACK": {
      const shuffle = action.shuffle ?? state.shuffle
      return {
        ...state,
        isPlaying: true,
        shuffle,
        currentTrackId: action.trackId,
        currentPlaylistId: action.playlistId,
        durationSec: action.durationSec,
        progressSec: 0,
        queue: buildQueue(action.playlistTrackIds, action.trackId, shuffle),
        history: state.currentTrackId
          ? [...state.history, state.currentTrackId]
          : state.history,
      }
    }

    case "TOGGLE_PLAY":
      if (!state.currentTrackId) return state
      return { ...state, isPlaying: !state.isPlaying }

    case "SET_DURATION":
      return { ...state, durationSec: action.durationSec }

    case "NEXT": {
      const [head, ...rest] = state.queue
      if (!head) {
        // Nothing queued — stop at end ("repeat all" re-seeding lives in the provider).
        return { ...state, isPlaying: false }
      }
      return {
        ...state,
        currentTrackId: head,
        queue: rest,
        progressSec: 0,
        isPlaying: true,
        history: state.currentTrackId
          ? [...state.history, state.currentTrackId]
          : state.history,
      }
    }

    case "PREV": {
      if (state.progressSec > RESTART_THRESHOLD_SEC) {
        return { ...state, progressSec: 0 }
      }
      const prev = state.history[state.history.length - 1]
      if (!prev) return { ...state, progressSec: 0 }
      return {
        ...state,
        currentTrackId: prev,
        history: state.history.slice(0, -1),
        queue: state.currentTrackId
          ? [state.currentTrackId, ...state.queue]
          : state.queue,
        progressSec: 0,
        isPlaying: true,
      }
    }

    case "SEEK":
      return {
        ...state,
        progressSec: Math.min(action.progressSec, state.durationSec),
      }

    case "SET_VOLUME":
      return {
        ...state,
        volume: Math.min(1, Math.max(0, action.volume)),
        muted: action.volume === 0 ? state.muted : false,
      }

    case "TOGGLE_MUTE":
      return { ...state, muted: !state.muted }

    case "TOGGLE_SHUFFLE":
      return { ...state, shuffle: !state.shuffle }

    case "CYCLE_REPEAT":
      return { ...state, repeat: nextRepeat[state.repeat] }

    case "PROGRESS":
      if (!state.currentTrackId) return state
      return { ...state, progressSec: action.progressSec }

    case "PAUSE":
      return { ...state, isPlaying: false }

    case "SET_QUEUE":
      return { ...state, queue: action.queue }

    case "ENQUEUE":
      if (state.queue.includes(action.trackId)) return state
      return { ...state, queue: [...state.queue, action.trackId] }

    case "REMOVE_FROM_QUEUE":
      return {
        ...state,
        queue: state.queue.filter((id) => id !== action.trackId),
      }

    case "JUMP_IN_QUEUE": {
      const idx = state.queue.indexOf(action.trackId)
      if (idx === -1) return state
      const skipped = state.queue.slice(0, idx)
      const rest = state.queue.slice(idx + 1)
      return {
        ...state,
        currentTrackId: action.trackId,
        durationSec: action.durationSec,
        queue: rest,
        progressSec: 0,
        isPlaying: true,
        history: state.currentTrackId
          ? [...state.history, ...skipped, state.currentTrackId]
          : [...state.history, ...skipped],
      }
    }

    default:
      return state
  }
}
