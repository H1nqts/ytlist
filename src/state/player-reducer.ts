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
      seed: number
    }
  | { type: "TOGGLE_PLAY" }
  | { type: "SET_DURATION"; durationSec: number }
  | { type: "NEXT" }
  | { type: "PREV" }
  | { type: "SET_VOLUME"; volume: number }
  | { type: "TOGGLE_MUTE" }
  | { type: "TOGGLE_SHUFFLE"; playlistTrackIds: string[]; seed: number }
  | { type: "CYCLE_REPEAT" }
  | { type: "PAUSE" }
  | { type: "SET_QUEUE"; queue: string[] }
  | { type: "ENQUEUE"; trackId: string }
  | { type: "REMOVE_FROM_QUEUE"; trackId: string }
  | { type: "JUMP_IN_QUEUE"; trackId: string; durationSec: number }

export const initialPlayerState: PlayerState = {
  isPlaying: false,
  currentTrackId: null,
  currentPlaylistId: null,
  durationSec: 0,
  volume: 0.8,
  muted: false,
  shuffle: false,
  repeat: "off",
  queue: [],
  queueIndex: -1,
}

const nextRepeat: Record<RepeatMode, RepeatMode> = {
  off: "all",
  all: "one",
  one: "off",
}

function shuffleExcept(ids: string[], keep: string, seed: number): string[] {
  const rest = ids.filter((id) => id !== keep)
  // Fisher–Yates driven by a tiny LCG, so the reducer stays pure.
  let s = seed >>> 0 || 1
  for (let i = rest.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0
    const j = s % (i + 1)
    ;[rest[i], rest[j]] = [rest[j], rest[i]]
  }
  return rest
}

/** Build the playback order for a track within its playlist. */
function buildQueue(
  playlistTrackIds: string[],
  currentId: string,
  shuffle: boolean,
  seed: number
): { queue: string[]; index: number } {
  if (shuffle) {
    const rest = shuffleExcept(playlistTrackIds, currentId, seed)
    return { queue: [currentId, ...rest], index: 0 }
  }
  const idx = playlistTrackIds.indexOf(currentId)
  if (idx === -1) {
    const rest = playlistTrackIds.filter((id) => id !== currentId)
    return { queue: [currentId, ...rest], index: 0 }
  }
  return { queue: playlistTrackIds, index: idx }
}

export function playerReducer(
  state: PlayerState,
  action: PlayerAction
): PlayerState {
  switch (action.type) {
    case "PLAY_TRACK": {
      const shuffle = action.shuffle ?? state.shuffle
      const { queue, index } = buildQueue(
        action.playlistTrackIds,
        action.trackId,
        shuffle,
        action.seed
      )
      return {
        ...state,
        isPlaying: true,
        shuffle,
        currentTrackId: action.trackId,
        currentPlaylistId: action.playlistId,
        durationSec: action.durationSec,
        queue,
        queueIndex: index,
      }
    }

    case "TOGGLE_PLAY":
      if (!state.currentTrackId) return state
      return { ...state, isPlaying: !state.isPlaying }

    case "SET_DURATION":
      return { ...state, durationSec: action.durationSec }

    case "NEXT": {
      const next = state.queueIndex + 1
      if (next >= state.queue.length) {
        if (state.repeat !== "all" || state.queue.length === 0) {
          return { ...state, isPlaying: false }
        }
        return {
          ...state,
          currentTrackId: state.queue[0],
          queueIndex: 0,
          isPlaying: true,
        }
      }
      return {
        ...state,
        currentTrackId: state.queue[next],
        queueIndex: next,
        isPlaying: true,
      }
    }

    case "PREV": {
      const prev = state.queueIndex - 1
      if (prev < 0) return state
      return {
        ...state,
        currentTrackId: state.queue[prev],
        queueIndex: prev,
        isPlaying: true,
      }
    }

    case "SET_VOLUME":
      return {
        ...state,
        volume: Math.min(1, Math.max(0, action.volume)),
        muted: action.volume === 0 ? state.muted : false,
      }

    case "TOGGLE_MUTE":
      return { ...state, muted: !state.muted }

    case "TOGGLE_SHUFFLE": {
      const shuffle = !state.shuffle
      if (!state.currentTrackId) return { ...state, shuffle }
      const { queue, index } = buildQueue(
        action.playlistTrackIds,
        state.currentTrackId,
        shuffle,
        action.seed
      )
      return { ...state, shuffle, queue, queueIndex: index }
    }

    case "CYCLE_REPEAT":
      return { ...state, repeat: nextRepeat[state.repeat] }

    case "PAUSE":
      return { ...state, isPlaying: false }

    case "SET_QUEUE":
      return {
        ...state,
        queue: action.queue,
        queueIndex: Math.min(state.queueIndex, action.queue.length - 1),
      }

    case "ENQUEUE":
      if (state.queue.includes(action.trackId)) return state
      return { ...state, queue: [...state.queue, action.trackId] }

    case "REMOVE_FROM_QUEUE": {
      const idx = state.queue.indexOf(action.trackId)
      // Removing the current track would leave the cursor pointing elsewhere.
      if (idx === -1 || idx === state.queueIndex) return state
      return {
        ...state,
        queue: state.queue.filter((id) => id !== action.trackId),
        queueIndex: idx < state.queueIndex ? state.queueIndex - 1 : state.queueIndex,
      }
    }

    case "JUMP_IN_QUEUE": {
      const idx = state.queue.indexOf(action.trackId)
      if (idx === -1) return state
      return {
        ...state,
        currentTrackId: action.trackId,
        durationSec: action.durationSec,
        queueIndex: idx,
        isPlaying: true,
      }
    }

    default:
      return state
  }
}
