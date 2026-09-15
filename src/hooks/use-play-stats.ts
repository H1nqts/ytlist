import * as React from "react"

import type { Track } from "@/types"
import { statsRecord } from "@/lib/api"
import { logError } from "@/lib/logger"

/**
 * Largest gap between two `timeupdate` events that still counts as playback.
 * Anything larger is a seek, a reload or a tab that stopped firing events.
 */
const MAX_TICK_SEC = 2

/** Dropping shorter listens keeps skimming a queue from filling the history. */
const MIN_LISTEN_SEC = 1

interface ListenSession {
  videoId: string
  title: string
  channelName: string
  playlistId: number | null
  playlistName: string | null
  startedAt: string
  durationSec: number
  listenedSec: number
  lastTime: number
}

export interface PlayStatsRecorder {
  onTimeUpdate: (currentTime: number) => void
  start: (videoId: string, currentTime?: number) => void
  /** Store the running session, unless it is too short to be worth keeping. */
  finish: (completed: boolean) => void
  /** Drop the running session without storing it. */
  discard: () => void
  /** Like `finish(false)`, but resolves once the session has been stored. */
  flush: () => Promise<void>
}

interface UsePlayStatsArgs {
  enabled: boolean
  getTrack: (trackId: string) => Track | undefined
  getPlaylistName: (playlistId: number) => string | undefined
  currentPlaylistId: number | null
}

export function usePlayStats({
  enabled,
  getTrack,
  getPlaylistName,
  currentPlaylistId,
}: UsePlayStatsArgs): PlayStatsRecorder {
  const session = React.useRef<ListenSession | null>(null)

  // The audio listeners bind once, so every input the recorder reads has to come
  // from a ref rather than the closure it was created in.
  const latest = React.useRef({
    enabled,
    getTrack,
    getPlaylistName,
    currentPlaylistId,
  })
  latest.current = { enabled, getTrack, getPlaylistName, currentPlaylistId }

  const recorder = React.useMemo<PlayStatsRecorder>(() => {
    const store = (done: ListenSession, completed: boolean): Promise<void> => {
      if (done.listenedSec < MIN_LISTEN_SEC) return Promise.resolve()

      return statsRecord({
        videoId: done.videoId,
        title: done.title,
        channelName: done.channelName,
        playlistId: done.playlistId,
        playlistName: done.playlistName,
        startedAt: done.startedAt,
        listenedMs: Math.round(done.listenedSec * 1000),
        durationMs: Math.round(done.durationSec * 1000),
        completed,
      }).catch((err) => logError("Failed to record a play", err))
    }

    const close = (completed: boolean): Promise<void> => {
      const done = session.current
      session.current = null
      if (!done) return Promise.resolve()
      return store(done, completed)
    }

    return {
      onTimeUpdate: (currentTime) => {
        const active = session.current
        if (!active) return

        const delta = currentTime - active.lastTime
        if (delta > 0 && delta <= MAX_TICK_SEC) active.listenedSec += delta
        active.lastTime = currentTime
      },

      start: (videoId, currentTime = 0) => {
        // Callers close the previous session first; this only guards a leak.
        session.current = null

        const { enabled, getTrack, getPlaylistName, currentPlaylistId } =
          latest.current
        if (!enabled) return

        const track = getTrack(videoId)
        if (!track) return

        session.current = {
          videoId,
          title: track.title,
          channelName: track.channel,
          playlistId: currentPlaylistId,
          playlistName:
            currentPlaylistId === null
              ? null
              : getPlaylistName(currentPlaylistId) ?? null,
          startedAt: new Date().toISOString(),
          durationSec: track.durationSec,
          listenedSec: 0,
          lastTime: currentTime,
        }
      },

      finish: (completed) => {
        void close(completed)
      },

      discard: () => {
        session.current = null
      },

      flush: () => close(false),
    }
  }, [])

  return recorder
}
