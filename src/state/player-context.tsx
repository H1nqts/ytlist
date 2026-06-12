import * as React from "react"

import type { PlayerState, Track } from "@/types"
import {
  initialPlayerState,
  playerReducer,
} from "@/state/player-reducer"
import { LibraryContext } from "@/state/library-context"

interface PlayerContextValue {
  state: PlayerState
  currentTrack: Track | null
  /** Start playing a track from within a playlist (builds the queue). */
  playTrack: (trackId: string, playlistId: string) => void
  togglePlay: () => void
  next: () => void
  prev: () => void
  seek: (progressSec: number) => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  toggleShuffle: () => void
  cycleRepeat: () => void
  enqueue: (trackId: string) => void
  removeFromQueue: (trackId: string) => void
  jumpInQueue: (trackId: string) => void
}

const PlayerContext = React.createContext<PlayerContextValue | null>(null)

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const library = React.useContext(LibraryContext)
  if (!library) {
    throw new Error("PlayerProvider must be rendered inside a LibraryProvider")
  }
  const { getTrack, getPlaylist } = library

  const [state, dispatch] = React.useReducer(playerReducer, initialPlayerState)

  // Mock playback: advance progress one second at a time while playing.
  React.useEffect(() => {
    if (!state.isPlaying) return
    const id = setInterval(() => dispatch({ type: "TICK" }), 1000)
    return () => clearInterval(id)
  }, [state.isPlaying])

  // "Repeat all" re-seed: when the queue empties at the end of a playlist,
  // rebuild it from the current playlist's track order.
  React.useEffect(() => {
    if (
      state.repeat !== "all" ||
      state.isPlaying ||
      state.queue.length > 0 ||
      !state.currentPlaylistId ||
      !state.currentTrackId
    ) {
      return
    }
    // Only re-seed if we actually reached the end (progress at duration).
    if (state.durationSec === 0 || state.progressSec < state.durationSec) return

    const playlist = getPlaylist(state.currentPlaylistId)
    if (!playlist || playlist.tracks.length === 0) return

    const first = playlist.tracks[0]
    dispatch({
      type: "PLAY_TRACK",
      trackId: first.id,
      playlistId: playlist.id,
      durationSec: first.durationSec,
      playlistTrackIds: playlist.tracks.map((t) => t.id),
    })
  }, [
    state.repeat,
    state.isPlaying,
    state.queue.length,
    state.currentPlaylistId,
    state.currentTrackId,
    state.durationSec,
    state.progressSec,
    getPlaylist,
  ])

  const playTrack = React.useCallback(
    (trackId: string, playlistId: string) => {
      const playlist = getPlaylist(playlistId)
      const track = playlist?.tracks.find((t) => t.id === trackId)
      if (!playlist || !track) return
      dispatch({
        type: "PLAY_TRACK",
        trackId,
        playlistId,
        durationSec: track.durationSec,
        playlistTrackIds: playlist.tracks.map((t) => t.id),
      })
    },
    [getPlaylist]
  )

  const next = React.useCallback(() => {
    // If the queue is empty but repeat is "all", loop back to the start of the
    // current playlist instead of stopping.
    if (
      state.queue.length === 0 &&
      state.repeat === "all" &&
      state.currentPlaylistId
    ) {
      const playlist = getPlaylist(state.currentPlaylistId)
      if (playlist && playlist.tracks.length > 0) {
        const first = playlist.tracks[0]
        dispatch({
          type: "PLAY_TRACK",
          trackId: first.id,
          playlistId: playlist.id,
          durationSec: first.durationSec,
          playlistTrackIds: playlist.tracks.map((t) => t.id),
        })
        return
      }
    }
    dispatch({ type: "NEXT" })
  }, [state.queue.length, state.repeat, state.currentPlaylistId, getPlaylist])

  const prev = React.useCallback(() => dispatch({ type: "PREV" }), [])
  const togglePlay = React.useCallback(() => dispatch({ type: "TOGGLE_PLAY" }), [])
  const seek = React.useCallback(
    (progressSec: number) => dispatch({ type: "SEEK", progressSec }),
    []
  )
  const setVolume = React.useCallback(
    (volume: number) => dispatch({ type: "SET_VOLUME", volume }),
    []
  )
  const toggleMute = React.useCallback(() => dispatch({ type: "TOGGLE_MUTE" }), [])
  const toggleShuffle = React.useCallback(
    () => dispatch({ type: "TOGGLE_SHUFFLE" }),
    []
  )
  const cycleRepeat = React.useCallback(() => dispatch({ type: "CYCLE_REPEAT" }), [])
  const enqueue = React.useCallback(
    (trackId: string) => dispatch({ type: "ENQUEUE", trackId }),
    []
  )
  const removeFromQueue = React.useCallback(
    (trackId: string) => dispatch({ type: "REMOVE_FROM_QUEUE", trackId }),
    []
  )
  const jumpInQueue = React.useCallback(
    (trackId: string) => {
      const track = getTrack(trackId)
      if (!track) return
      dispatch({ type: "JUMP_IN_QUEUE", trackId, durationSec: track.durationSec })
    },
    [getTrack]
  )

  const currentTrack = React.useMemo(
    () => (state.currentTrackId ? getTrack(state.currentTrackId) ?? null : null),
    [state.currentTrackId, getTrack]
  )

  const value = React.useMemo<PlayerContextValue>(
    () => ({
      state,
      currentTrack,
      playTrack,
      togglePlay,
      next,
      prev,
      seek,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
      enqueue,
      removeFromQueue,
      jumpInQueue,
    }),
    [
      state,
      currentTrack,
      playTrack,
      togglePlay,
      next,
      prev,
      seek,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
      enqueue,
      removeFromQueue,
      jumpInQueue,
    ]
  )

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}

export { PlayerContext }
export type { PlayerContextValue }
