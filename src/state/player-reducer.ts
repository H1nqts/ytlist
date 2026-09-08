import type { PlayerState, QueueEntry, RepeatMode } from "@/types"

/** Past this point, "previous" restarts the current track instead of going back. */
export const RESTART_THRESHOLD_SEC = 3

export type PlayerAction =
  | {
      type: "PLAY_TRACK"
      playlistId: number
      durationSec: number
      /** Ordered ids of the playlist this track belongs to. */
      playlistTrackIds: string[]
      /** Position within `playlistTrackIds`, which may hold the id twice. */
      trackIndex: number
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
  | {
      type: "RESTORE_SETTINGS"
      volume: number
      muted: boolean
      shuffle: boolean
      repeat: RepeatMode
    }
  | { type: "SET_QUEUE"; queue: QueueEntry[] }
  | { type: "ENQUEUE"; trackId: string }
  | { type: "REMOVE_FROM_QUEUE"; key: string }
  | { type: "JUMP_IN_QUEUE"; key: string; durationSec: number }

export const initialPlayerState: PlayerState = {
  isPlaying: false,
  currentTrackId: null,
  currentQueueKey: null,
  currentPlaylistId: null,
  durationSec: 0,
  volume: 0.8,
  muted: false,
  shuffle: false,
  repeat: "off",
  queue: [],
  queueIndex: -1,
}

/** Keys only have to be unique within one queue, so the position works. */
export function queueKeyFor(trackIndex: number, trackId: string): string {
  return `${trackIndex}:${trackId}`
}

function toEntries(trackIds: string[]): QueueEntry[] {
  return trackIds.map((trackId, i) => ({
    key: queueKeyFor(i, trackId),
    trackId,
  }))
}

const nextRepeat: Record<RepeatMode, RepeatMode> = {
  off: "all",
  all: "one",
  one: "off",
}

function shuffleExcept(
  entries: QueueEntry[],
  keep: string,
  seed: number
): QueueEntry[] {
  const rest = entries.filter((e) => e.key !== keep)
  // Fisher–Yates driven by a tiny LCG, so the reducer stays pure.
  let s = seed >>> 0 || 1
  for (let i = rest.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0
    const j = s % (i + 1)
    ;[rest[i], rest[j]] = [rest[j], rest[i]]
  }
  return rest
}

/** Build the playback order around one entry of its playlist. */
function buildQueue(
  playlistTrackIds: string[],
  trackIndex: number,
  shuffle: boolean,
  seed: number
): { queue: QueueEntry[]; index: number } {
  const entries = toEntries(playlistTrackIds)
  const current = entries[trackIndex]
  if (!current) return { queue: entries, index: -1 }

  if (shuffle) {
    const rest = shuffleExcept(entries, current.key, seed)
    return { queue: [current, ...rest], index: 0 }
  }
  return { queue: entries, index: trackIndex }
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
        action.trackIndex,
        shuffle,
        action.seed
      )
      const current = queue[index]
      if (!current) return state
      return {
        ...state,
        isPlaying: true,
        shuffle,
        currentTrackId: current.trackId,
        currentQueueKey: current.key,
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
          currentTrackId: state.queue[0].trackId,
          currentQueueKey: state.queue[0].key,
          queueIndex: 0,
          isPlaying: true,
        }
      }
      return {
        ...state,
        currentTrackId: state.queue[next].trackId,
        currentQueueKey: state.queue[next].key,
        queueIndex: next,
        isPlaying: true,
      }
    }

    case "PREV": {
      const prev = state.queueIndex - 1
      if (prev < 0) return state
      return {
        ...state,
        currentTrackId: state.queue[prev].trackId,
        currentQueueKey: state.queue[prev].key,
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
      if (state.queueIndex === -1) return { ...state, shuffle }

      if (shuffle) {
        const current = state.queue[state.queueIndex]
        const rest = shuffleExcept(state.queue, current.key, action.seed)
        return { ...state, shuffle, queue: [current, ...rest], queueIndex: 0 }
      }

      const { queue, index } = buildQueue(
        action.playlistTrackIds,
        action.playlistTrackIds.indexOf(state.currentTrackId ?? ""),
        false,
        action.seed
      )
      if (index === -1) return { ...state, shuffle }
      return { ...state, shuffle, queue, queueIndex: index }
    }

    case "CYCLE_REPEAT":
      return { ...state, repeat: nextRepeat[state.repeat] }

    case "PAUSE":
      return { ...state, isPlaying: false }

    case "RESTORE_SETTINGS":
      return {
        ...state,
        volume: Math.min(1, Math.max(0, action.volume)),
        muted: action.muted,
        shuffle: action.shuffle,
        repeat: action.repeat,
      }

    case "SET_QUEUE":
      return {
        ...state,
        queue: action.queue,
        queueIndex: Math.min(state.queueIndex, action.queue.length - 1),
      }

    case "ENQUEUE": {
      const key = `add:${state.queue.length}:${action.trackId}`
      return {
        ...state,
        queue: [...state.queue, { key, trackId: action.trackId }],
      }
    }

    case "REMOVE_FROM_QUEUE": {
      const idx = state.queue.findIndex((e) => e.key === action.key)
      // Removing the current track would leave the cursor pointing elsewhere.
      if (idx === -1 || idx === state.queueIndex) return state
      return {
        ...state,
        queue: state.queue.filter((e) => e.key !== action.key),
        queueIndex: idx < state.queueIndex ? state.queueIndex - 1 : state.queueIndex,
      }
    }

    case "JUMP_IN_QUEUE": {
      const idx = state.queue.findIndex((e) => e.key === action.key)
      if (idx === -1) return state
      return {
        ...state,
        currentTrackId: state.queue[idx].trackId,
        currentQueueKey: action.key,
        durationSec: action.durationSec,
        queueIndex: idx,
        isPlaying: true,
      }
    }

    default:
      return state
  }
}
