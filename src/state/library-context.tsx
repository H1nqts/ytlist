import * as React from "react"

import type { LibraryState, Playlist, Track } from "@/types"
import {
  initialLibraryState,
  libraryReducer,
} from "@/state/library-reducer"
import {
  createPlaylistFromUrl,
  fetchErrorFor,
  isLikelyInvalidUrl,
  refetchTracks,
} from "@/data/mock-helpers"

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

  const runDeferred = React.useCallback((fn: () => void) => {
    const id = setTimeout(() => {
      timers.current.delete(id)
      fn()
    }, fetchDelay())
    timers.current.add(id)
  }, [])

  const addPlaylist = React.useCallback(
    (url: string) => {
      const createdAt = Date.now()
      const tempId = `pl-${createdAt.toString(36)}`
      const isInvalid = isLikelyInvalidUrl(url)

      // Insert a loading placeholder immediately so the spinner shows.
      const placeholder: Playlist = {
        id: tempId,
        title: "New playlist",
        sourceUrl: url.trim(),
        thumbnailUrl: "",
        tracks: [],
        status: "loading",
        loadingKind: "fetch",
        lastSyncedAt: new Date(createdAt).toISOString(),
      }
      dispatch({ type: "ADD_PLAYLIST", playlist: placeholder })

      runDeferred(() => {
        if (isInvalid) {
          dispatch({
            type: "FETCH_ERROR",
            playlistId: tempId,
            message: fetchErrorFor(url),
          })
          return
        }
        const built = createPlaylistFromUrl(url, createdAt)
        dispatch({
          type: "FETCH_SUCCESS",
          playlistId: tempId,
          tracks: built.tracks,
          syncedAt: built.lastSyncedAt,
          title: built.title,
        })
      })
    },
    [runDeferred]
  )

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
    (playlistId: string) => dispatch({ type: "DELETE_PLAYLIST", playlistId }),
    []
  )
  const renamePlaylist = React.useCallback(
    (playlistId: string, title: string) =>
      dispatch({ type: "RENAME_PLAYLIST", playlistId, title }),
    []
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
