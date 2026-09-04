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

const STREAM_CACHE_MAX = 64

interface CachedStream {
  url: string
  expiresAt: number
}

function isFresh(cached: CachedStream | undefined): cached is CachedStream {
  if (!cached) return false
  return cached.expiresAt - Date.now() / 1000 > EXPIRY_MARGIN_SEC
}

function cacheStream(
  cache: Map<string, CachedStream>,
  trackId: string,
  entry: CachedStream
) {
  // Re-insert to move the entry to the end: Map iterates in insertion order,
  // so the oldest key is the first one evicted.
  cache.delete(trackId)
  cache.set(trackId, entry)

  for (const [id, cached] of cache) {
    if (cache.size <= STREAM_CACHE_MAX) break
    if (id !== trackId && !isFresh(cached)) cache.delete(id)
  }
  while (cache.size > STREAM_CACHE_MAX) {
    const oldest = cache.keys().next().value
    if (oldest === undefined || oldest === trackId) break
    cache.delete(oldest)
  }
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

interface PlayerProgressValue {
  progressSec: number
  durationSec: number
}

const PlayerContext = React.createContext<PlayerContextValue | null>(null)
const PlayerProgressContext = React.createContext<PlayerProgressValue | null>(null)

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const library = React.useContext(LibraryContext)
  if (!library) {
    throw new Error("PlayerProvider must be rendered inside a LibraryProvider")
  }
  const { getTrack, getPlaylist } = library

  const [state, dispatch] = React.useReducer(playerReducer, initialPlayerState)
  const [progressSec, setProgressSec] = React.useState(0)
  const [streamLoading, setStreamLoading] = React.useState(false)
  const [streamError, setStreamError] = React.useState<string | null>(null)
  const [srcReadySeq, setSrcReadySeq] = React.useState(0)
  const [ytdlp, setYtdlp] = React.useState<YtdlpStatus>({
    state: "checking",
    message: null,
  })

  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const getAudio = () => {
    if (audioRef.current === null && typeof Audio !== "undefined") {
      // No crossOrigin: googlevideo sends no CORS headers, so a CORS load fails.
      audioRef.current = new Audio()
      audioRef.current.preload = "auto"
    }
    return audioRef.current
  }

  const streamCache = React.useRef(new Map<string, CachedStream>())
  const inFlight = React.useRef(new Map<string, Promise<string>>())
  const loadSeq = React.useRef(0)
  const retriedTracks = React.useRef(new Set<string>())
  const suppressPause = React.useRef(false)

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

  const next = React.useCallback(() => dispatch({ type: "NEXT" }), [])

  const prev = React.useCallback(() => {
    // PREV restarts the current track past RESTART_THRESHOLD_SEC; rewind the
    // element too, or the next timeupdate reports the old position back.
    const audio = getAudio()
    if (audio && audio.currentTime > RESTART_THRESHOLD_SEC) {
      audio.currentTime = 0
      setProgressSec(0)
      return
    }
    dispatch({ type: "PREV" })
  }, [])
  const togglePlay = React.useCallback(() => dispatch({ type: "TOGGLE_PLAY" }), [])
  const seek = React.useCallback((progressSec: number) => {
    const audio = getAudio()
    if (audio && Number.isFinite(audio.duration)) {
      const next = Math.min(progressSec, audio.duration)
      audio.currentTime = next
      setProgressSec(next)
    }
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
        if (isFresh(cached)) {
          cacheStream(streamCache.current, trackId, cached)
          return cached.url
        }

        const pending = inFlight.current.get(trackId)
        if (pending) return pending
      }

      const request: Promise<string> = streamResolve(trackId)
        .then((info) => {
          cacheStream(streamCache.current, trackId, {
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
  const handlers = React.useRef({
    next,
    repeat: state.repeat,
    isPlaying: state.isPlaying,
  })
  React.useEffect(() => {
    handlers.current = { next, repeat: state.repeat, isPlaying: state.isPlaying }
  }, [next, state.repeat, state.isPlaying])

  React.useEffect(() => {
    const audio = getAudio()
    if (!audio) return

    const onTimeUpdate = () => setProgressSec(audio.currentTime)

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

    const onPlay = () => {
      if (!handlers.current.isPlaying) dispatch({ type: "TOGGLE_PLAY" })
    }

    const onPause = () => {
      if (suppressPause.current) return
      if (handlers.current.isPlaying && !audio.ended) dispatch({ type: "PAUSE" })
    }

    audio.addEventListener("timeupdate", onTimeUpdate)
    audio.addEventListener("loadedmetadata", onLoadedMetadata)
    audio.addEventListener("ended", onEnded)
    audio.addEventListener("play", onPlay)
    audio.addEventListener("pause", onPause)

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate)
      audio.removeEventListener("loadedmetadata", onLoadedMetadata)
      audio.removeEventListener("ended", onEnded)
      audio.removeEventListener("play", onPlay)
      audio.removeEventListener("pause", onPause)
    }
  }, [])

  // An unreleased element keeps buffering the stream.
  React.useEffect(() => {
    return () => {
      const audio = audioRef.current
      if (!audio) return
      audio.pause()
      audio.removeAttribute("src")
      audio.load()
      audioRef.current = null
    }
  }, [])

  React.useEffect(() => {
    const audio = getAudio()
    if (!audio) return
    audio.volume = state.volume
    audio.muted = state.muted
  }, [state.volume, state.muted])

  const trackId = state.currentTrackId

  React.useEffect(() => {
    const audio = getAudio()
    if (!audio || !trackId) return

    const seq = ++loadSeq.current
    retriedTracks.current.clear()
    setStreamError(null)
    setProgressSec(0)

    // Stop the outgoing track now; resolving the next stream can take seconds.
    suppressPause.current = true
    audio.pause()
    audio.removeAttribute("src")
    audio.load()
    queueMicrotask(() => {
      suppressPause.current = false
    })

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
    const upcoming = state.queue.slice(
      state.queueIndex + 1,
      state.queueIndex + 1 + PRELOAD_COUNT
    )

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
  }, [srcReadySeq, state.queue, state.queueIndex, resolveStream])

  React.useEffect(() => {
    const audio = getAudio()
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
    const audio = getAudio()
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

  const progressValue = React.useMemo(
    () => ({ progressSec, durationSec: state.durationSec }),
    [progressSec, state.durationSec]
  )

  return (
    <PlayerContext.Provider value={value}>
      <PlayerProgressContext.Provider value={progressValue}>
        {children}
      </PlayerProgressContext.Provider>
    </PlayerContext.Provider>
  )
}

export { PlayerContext, PlayerProgressContext }
export type { PlayerContextValue, PlayerProgressValue }
