import * as React from "react"
import { toast } from "sonner"

import type { LibraryState, Playlist, Track } from "@/types"
import {
  initialLibraryState,
  libraryReducer,
} from "@/state/library-reducer"
import {
  fetchErrorFor,
  isLikelyInvalidUrl,
  refetchTracks,
} from "@/data/mock-helpers"
import {
  playlistAdd,
  playlistDelete,
  playlistGetAll,
  playlistRename,
  toUiPlaylist,
} from "@/lib/api"

interface LibraryContextValue {
  state: LibraryState
  playlists: Playlist[]
  selectedPlaylist: Playlist | null
  /** Tracks of the selected playlist, filtered by the search query. */
  visibleTracks: Track[]
  addPlaylist: (url: string) => void
  fetchPlaylist: (playlistId: string) => void
  refreshPlaylist: (playlistId: string) => void
  deletePlaylist: (playlistId: string) => void
  renamePlaylist: (playlistId: string, title: string) => void
  selectPlaylist: (playlistId: string) => void
  setSearch: (search: string) => void
  getPlaylist: (playlistId: string) => Playlist | undefined
  getTrack: (trackId: string) => Track | undefined
}

const LibraryContext = React.createContext<LibraryContextValue | null>(null)

const FETCH_MIN_MS = 800
const FETCH_VARIANCE_MS = 700

function fetchDelay(): number {
  // Deterministic-enough jitter without Math.random at module scope.
  return FETCH_MIN_MS + Math.floor((Date.now() % FETCH_VARIANCE_MS))
}

function filterTracks(playlist: Playlist | null, search: string): Track[] {
  if (!playlist) return []
  const q = search.trim().toLowerCase()
  if (!q) return playlist.tracks
  return playlist.tracks.filter(
    (t) =>
      t.title.toLowerCase().includes(q) || t.channel.toLowerCase().includes(q)
  )
}

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(libraryReducer, initialLibraryState)
  // Track pending timers so unmounts don't fire stale dispatches.
  const timers = React.useRef<Set<ReturnType<typeof setTimeout>>>(new Set())

  React.useEffect(() => {
    const pending = timers.current
    return () => {
      pending.forEach(clearTimeout)
      pending.clear()
    }
  }, [])

  // Reload the full playlist set from the backend (source of truth).
  const reloadPlaylists = React.useCallback(async () => {
    const rows = await playlistGetAll()
    dispatch({ type: "SET_PLAYLISTS", playlists: rows.map(toUiPlaylist) })
  }, [])

  // Load saved playlists from the backend once on mount, but only after the
  // UI has bound/painted: the sidebar renders its loading state first, then
  // `playlist_get_all` runs on the next frame.
  React.useEffect(() => {
    let cancelled = false
    const frame = requestAnimationFrame(() => {
      reloadPlaylists().catch((err) => {
        if (cancelled) return
        console.error("Failed to load playlists", err)
        dispatch({ type: "INITIAL_LOAD_FAILED" })
        toast.error("Couldn't load your playlists", {
          description: String(err),
        })
      })
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
    }
  }, [reloadPlaylists])

  const runDeferred = React.useCallback((fn: () => void) => {
    const id = setTimeout(() => {
      timers.current.delete(id)
      fn()
    }, fetchDelay())
    timers.current.add(id)
  }, [])

  const addPlaylist = React.useCallback((url: string) => {
    const createdAt = Date.now()
    // Client-only id for the loading row; replaced by the real backend id on success.
    const tempId = `tmp-${createdAt.toString(36)}`
    const trimmed = url.trim()

    // Insert a loading placeholder immediately so the spinner shows.
    const placeholder: Playlist = {
      id: tempId,
      title: "New playlist",
      sourceUrl: trimmed,
      thumbnailUrl: "",
      tracks: [],
      status: "loading",
      loadingKind: "fetch",
      lastSyncedAt: new Date(createdAt).toISOString(),
    }
    dispatch({ type: "ADD_PLAYLIST", playlist: placeholder })

    playlistAdd(trimmed)
      .then((row) => {
        dispatch({
          type: "REPLACE_PLAYLIST",
          placeholderId: tempId,
          playlist: toUiPlaylist(row),
        })
      })
      .catch((err) => {
        dispatch({
          type: "FETCH_ERROR",
          playlistId: tempId,
          message: String(err),
        })
        toast.error("Couldn't save this playlist", { description: String(err) })
      })
  }, [])

  const fetchPlaylist = React.useCallback(
    (playlistId: string) => {
      const playlist = state.playlists.find((p) => p.id === playlistId)
      if (!playlist) return
      dispatch({ type: "START_FETCH", playlistId })
      const at = Date.now()
      const invalid = isLikelyInvalidUrl(playlist.sourceUrl)
      runDeferred(() => {
        if (invalid) {
          dispatch({
            type: "FETCH_ERROR",
            playlistId,
            message: fetchErrorFor(playlist.sourceUrl),
          })
          return
        }
        dispatch({
          type: "FETCH_SUCCESS",
          playlistId,
          tracks: refetchTracks(playlistId, playlist.sourceUrl, at),
          syncedAt: new Date(at).toISOString(),
        })
      })
    },
    [state.playlists, runDeferred]
  )

  const refreshPlaylist = React.useCallback(
    (playlistId: string) => {
      const playlist = state.playlists.find((p) => p.id === playlistId)
      if (!playlist) return
      // "Refresh" reloads locally stored info — quick, never errors.
      dispatch({ type: "START_REFRESH", playlistId })
      const at = Date.now()
      runDeferred(() => {
        dispatch({
          type: "FETCH_SUCCESS",
          playlistId,
          tracks: playlist.tracks,
          syncedAt: new Date(at).toISOString(),
        })
      })
    },
    [state.playlists, runDeferred]
  )

  const deletePlaylist = React.useCallback(
    (playlistId: string) => {
      // Optimistically remove from the UI.
      dispatch({ type: "DELETE_PLAYLIST", playlistId })

      // Mock/seed rows (string ids) live only in memory.
      const numericId = Number(playlistId)
      if (!Number.isInteger(numericId)) {
        toast.success("Removed from library")
        return
      }

      playlistDelete(numericId)
        .then(() => {
          toast.success("Removed from library")
        })
        .catch((err) => {
          // Restore from the backend (it still has the row) and report.
          reloadPlaylists().catch(() => {})
          toast.error("Couldn't delete playlist", { description: String(err) })
        })
    },
    [reloadPlaylists]
  )
  const renamePlaylist = React.useCallback(
    (playlistId: string, title: string) => {
      // Optimistically update the UI, then persist via the backend command.
      const previous =
        state.playlists.find((p) => p.id === playlistId)?.title ?? title
      dispatch({ type: "RENAME_PLAYLIST", playlistId, title })

      // Only call the backend for real (numeric-id) playlists; mock/seed rows
      // use string ids and live purely in memory.
      const numericId = Number(playlistId)
      if (!Number.isInteger(numericId)) {
        toast.success("Playlist renamed")
        return
      }

      playlistRename(numericId, title)
        .then((row) => {
          // Reconcile with whatever the backend stored (it's the source of truth).
          if (row.name !== title) {
            dispatch({ type: "RENAME_PLAYLIST", playlistId, title: row.name })
          }
          toast.success("Playlist renamed")
        })
        .catch((err) => {
          // Roll back on failure and surface the error.
          dispatch({ type: "RENAME_PLAYLIST", playlistId, title: previous })
          toast.error("Couldn't rename playlist", { description: String(err) })
        })
    },
    [state.playlists]
  )
  const selectPlaylist = React.useCallback(
    (playlistId: string) => dispatch({ type: "SELECT_PLAYLIST", playlistId }),
    []
  )
  const setSearch = React.useCallback(
    (search: string) => dispatch({ type: "SET_SEARCH", search }),
    []
  )

  const selectedPlaylist = React.useMemo(
    () => state.playlists.find((p) => p.id === state.selectedPlaylistId) ?? null,
    [state.playlists, state.selectedPlaylistId]
  )

  const visibleTracks = React.useMemo(
    () => filterTracks(selectedPlaylist, state.search),
    [selectedPlaylist, state.search]
  )

  const getPlaylist = React.useCallback(
    (playlistId: string) => state.playlists.find((p) => p.id === playlistId),
    [state.playlists]
  )

  const getTrack = React.useCallback(
    (trackId: string) => {
      for (const p of state.playlists) {
        const t = p.tracks.find((tr) => tr.id === trackId)
        if (t) return t
      }
      return undefined
    },
    [state.playlists]
  )

  const value = React.useMemo<LibraryContextValue>(
    () => ({
      state,
      playlists: state.playlists,
      selectedPlaylist,
      visibleTracks,
      addPlaylist,
      fetchPlaylist,
      refreshPlaylist,
      deletePlaylist,
      renamePlaylist,
      selectPlaylist,
      setSearch,
      getPlaylist,
      getTrack,
    }),
    [
      state,
      selectedPlaylist,
      visibleTracks,
      addPlaylist,
      fetchPlaylist,
      refreshPlaylist,
      deletePlaylist,
      renamePlaylist,
      selectPlaylist,
      setSearch,
      getPlaylist,
      getTrack,
    ]
  )

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
}

export { LibraryContext }
export type { LibraryContextValue }
