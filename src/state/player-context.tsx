import * as React from "react"
import { listen } from "@tauri-apps/api/event"
import { toast } from "sonner"

import type { PlayerState, Track } from "@/types"
import {
  initialPlayerState,
  playerReducer,
  RESTART_THRESHOLD_SEC,
} from "@/state/player-reducer"
import { LibraryContext } from "@/state/library-context"
import {
  streamResolve,
  ytdlpRetry,
  ytdlpStatus as fetchYtdlpStatus,
  type YtdlpStatus,
} from "@/lib/api"

const YTDLP_STATUS_EVENT = "ytdlp://status"

/** Re-resolve a stream this long before its URL expires. */
const EXPIRY_MARGIN_SEC = 60

/** Assumed lifetime when the stream URL carries no `expire` parameter. */
const FALLBACK_TTL_SEC = 3600

const PRELOAD_COUNT = 2

interface CachedStream {
  url: string
  expiresAt: number
}

function isFresh(cached: CachedStream | undefined): cached is CachedStream {
  if (!cached) return false
  return cached.expiresAt - Date.now() / 1000 > EXPIRY_MARGIN_SEC
}

interface PlayerContextValue {
  state: PlayerState
  currentTrack: Track | null
  /** True while the current track's stream URL is being resolved. */
  streamLoading: boolean
  streamError: string | null
  ytdlp: YtdlpStatus
  retryYtdlp: () => void
  /** Start playing a track from within a playlist (builds the queue). */
  playTrack: (trackId: string, playlistId: number, shuffle?: boolean) => void
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
  const [streamLoading, setStreamLoading] = React.useState(false)
  const [streamError, setStreamError] = React.useState<string | null>(null)
  const [srcReadySeq, setSrcReadySeq] = React.useState(0)
  const [ytdlp, setYtdlp] = React.useState<YtdlpStatus>({
    state: "checking",
    message: null,
  })

  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  if (audioRef.current === null && typeof Audio !== "undefined") {
    // No crossOrigin: googlevideo sends no CORS headers, so a CORS load fails.
    audioRef.current = new Audio()
    audioRef.current.preload = "auto"
  }

  const streamCache = React.useRef(new Map<string, CachedStream>())
  const inFlight = React.useRef(new Map<string, Promise<string>>())
  const loadSeq = React.useRef(0)
  const retriedTracks = React.useRef(new Set<string>())

  React.useEffect(() => {
    let active = true
    const unlisten = listen<YtdlpStatus>(YTDLP_STATUS_EVENT, (event) => {
      if (active) setYtdlp(event.payload)
    })
    // Pull once after subscribing, so a status settled before mount is not missed.
    fetchYtdlpStatus()
      .then((status) => {
        if (active) setYtdlp(status)
      })
      .catch(() => {})

    return () => {
      active = false
      unlisten.then((off) => off()).catch(() => {})
    }
  }, [])

  const playTrack = React.useCallback(
    (trackId: string, playlistId: number, shuffle?: boolean) => {
      const playlist = getPlaylist(playlistId)
      const track = playlist?.tracks.find((t) => t.id === trackId)
      if (!playlist || !track) return
      dispatch({
        type: "PLAY_TRACK",
        trackId,
        playlistId,
        durationSec: track.durationSec,
        playlistTrackIds: playlist.tracks.map((t) => t.id),
        shuffle,
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

  const prev = React.useCallback(() => {
    // PREV restarts the current track past RESTART_THRESHOLD_SEC; rewind the
    // element too, or the next timeupdate reports the old position back.
    const audio = audioRef.current
    if (audio && audio.currentTime > RESTART_THRESHOLD_SEC) {
      audio.currentTime = 0
    }
    dispatch({ type: "PREV" })
  }, [])
  const togglePlay = React.useCallback(() => dispatch({ type: "TOGGLE_PLAY" }), [])
  const seek = React.useCallback((progressSec: number) => {
    const audio = audioRef.current
    if (audio && Number.isFinite(audio.duration)) {
      audio.currentTime = Math.min(progressSec, audio.duration)
    }
    dispatch({ type: "SEEK", progressSec })
  }, [])
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

  const retryYtdlp = React.useCallback(() => {
    setYtdlp({ state: "checking", message: null })
    ytdlpRetry()
      .then(setYtdlp)
      .catch((err) => setYtdlp({ state: "error", message: String(err) }))
  }, [])

  const resolveStream = React.useCallback(
    async (trackId: string, force: boolean) => {
      if (!force) {
        const cached = streamCache.current.get(trackId)
        if (isFresh(cached)) return cached.url

        const pending = inFlight.current.get(trackId)
        if (pending) return pending
      }

      const request: Promise<string> = streamResolve(trackId)
        .then((info) => {
          streamCache.current.set(trackId, {
            url: info.url,
            expiresAt: info.expires_at ?? Date.now() / 1000 + FALLBACK_TTL_SEC,
          })
          return info.url
        })
        .finally(() => {
          // A later forced resolve may have replaced the entry; leave that one alone.
          if (inFlight.current.get(trackId) === request) {
            inFlight.current.delete(trackId)
          }
        })

      inFlight.current.set(trackId, request)
      return request
    },
    []
  )

  // Latest values for the audio listeners, which are bound once.
  const handlers = React.useRef({ next, repeat: state.repeat })
  handlers.current = { next, repeat: state.repeat }

  React.useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () =>
      dispatch({ type: "PROGRESS", progressSec: audio.currentTime })

    const onLoadedMetadata = () => {
      if (Number.isFinite(audio.duration)) {
        dispatch({ type: "SET_DURATION", durationSec: audio.duration })
      }
    }

    const onEnded = () => {
      if (handlers.current.repeat === "one") {
        audio.currentTime = 0
        void audio.play().catch(() => {})
        return
      }
      handlers.current.next()
    }

    audio.addEventListener("timeupdate", onTimeUpdate)
    audio.addEventListener("loadedmetadata", onLoadedMetadata)
    audio.addEventListener("ended", onEnded)

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate)
      audio.removeEventListener("loadedmetadata", onLoadedMetadata)
      audio.removeEventListener("ended", onEnded)
    }
  }, [])

  React.useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = state.volume
    audio.muted = state.muted
  }, [state.volume, state.muted])

  const trackId = state.currentTrackId

  React.useEffect(() => {
    const audio = audioRef.current
    if (!audio || !trackId) return

    const seq = ++loadSeq.current
    retriedTracks.current.delete(trackId)
    setStreamError(null)

    // Stop the outgoing track now; resolving the next stream can take seconds.
    audio.pause()
    audio.removeAttribute("src")
    audio.load()

    const cached = streamCache.current.get(trackId)
    if (isFresh(cached)) {
      audio.src = cached.url
      audio.load()
      setSrcReadySeq(seq)
      return
    }

    setStreamLoading(true)
    resolveStream(trackId, false)
      .then((url) => {
        if (loadSeq.current !== seq) return
        setStreamLoading(false)
        audio.src = url
        audio.load()
        setSrcReadySeq(seq)
      })
      .catch((err) => {
        if (loadSeq.current !== seq) return
        setStreamLoading(false)
        setStreamError(String(err))
        dispatch({ type: "PAUSE" })
        toast.error("Couldn't play this track", { description: String(err) })
      })
  }, [trackId, resolveStream])

  // Resolve the next few queued tracks ahead of time, so switching to them hits
  // the cache instead of waiting on yt-dlp.
  React.useEffect(() => {
    if (srcReadySeq === 0) return

    let cancelled = false
    const upcoming = state.queue.slice(0, PRELOAD_COUNT)

    void (async () => {
      for (const id of upcoming) {
        if (cancelled) return
        if (isFresh(streamCache.current.get(id))) continue
        // Preload failures stay silent: the load effect retries and surfaces
        // the error if the track is actually played.
        await resolveStream(id, false).catch(() => {})
      }
    })()

    return () => {
      cancelled = true
    }
  }, [srcReadySeq, state.queue, resolveStream])

  React.useEffect(() => {
    const audio = audioRef.current
    if (!audio || !state.currentTrackId) return

    if (!state.isPlaying) {
      audio.pause()
      return
    }
    if (!audio.src || streamLoading) return

    audio.play().catch((err: DOMException) => {
      // A src swap aborts the pending play(); that is not a failure.
      if (err.name === "AbortError") return
      dispatch({ type: "PAUSE" })
      toast.error("Playback failed", { description: err.message })
    })
  }, [state.isPlaying, state.currentTrackId, streamLoading])

  // A stream URL can die mid-playback; re-resolve once before giving up.
  React.useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onError = () => {
      const id = state.currentTrackId
      if (!audio.src || !id) return
      if (retriedTracks.current.has(id)) {
        setStreamError("Stream unavailable")
        dispatch({ type: "PAUSE" })
        toast.error("Couldn't play this track")
        return
      }

      retriedTracks.current.add(id)
      const resumeAt = audio.currentTime
      const seq = ++loadSeq.current
      setStreamLoading(true)
      resolveStream(id, true)
        .then((url) => {
          if (loadSeq.current !== seq) return
          setStreamLoading(false)
          audio.src = url
          audio.load()
          audio.currentTime = resumeAt
        })
        .catch((err) => {
          if (loadSeq.current !== seq) return
          setStreamLoading(false)
          setStreamError(String(err))
          dispatch({ type: "PAUSE" })
          toast.error("Couldn't play this track", { description: String(err) })
        })
    }

    audio.addEventListener("error", onError)
    return () => audio.removeEventListener("error", onError)
  }, [state.currentTrackId, resolveStream])

  const currentTrack = React.useMemo(
    () => (state.currentTrackId ? getTrack(state.currentTrackId) ?? null : null),
    [state.currentTrackId, getTrack]
  )

  const value = React.useMemo<PlayerContextValue>(
    () => ({
      state,
      currentTrack,
      streamLoading,
      streamError,
      ytdlp,
      retryYtdlp,
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
      streamLoading,
      streamError,
      ytdlp,
      retryYtdlp,
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
