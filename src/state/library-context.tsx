import * as React from "react"
import { toast } from "sonner"

import type { LibraryState, Playlist, Track } from "@/types"
import {
  initialLibraryState,
  libraryReducer,
} from "@/state/library-reducer"
import {
  playlistAdd,
  playlistDelete,
  playlistFetchVideos,
  playlistGetAll,
  playlistRename,
  toUiPlaylist,
  toUiTrack,
} from "@/lib/api"

interface LibraryContextValue {
  state: LibraryState
  playlists: Playlist[]
  selectedPlaylist: Playlist | null
  /** Tracks of the selected playlist, filtered by the search query. */
  visibleTracks: Track[]
  addPlaylist: (url: string) => void
  fetchPlaylist: (playlistId: number) => void
  refreshPlaylist: (playlistId: number) => void
  deletePlaylist: (playlistId: number) => void
  renamePlaylist: (playlistId: number, title: string) => void
  selectPlaylist: (playlistId: number) => void
  setSearch: (search: string) => void
  getPlaylist: (playlistId: number) => Playlist | undefined
  getTrack: (trackId: string) => Track | undefined
}

const LibraryContext = React.createContext<LibraryContextValue | null>(null)

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
  // Per-playlist request counter; only the newest response may dispatch.
  const fetchSeq = React.useRef(new Map<number, number>())
  // Ids for playlists that aren't persisted yet; real row ids are positive.
  const nextTempId = React.useRef(-1)

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

  const addPlaylist = React.useCallback((url: string) => {
    const createdAt = Date.now()
    // Replaced by the real backend id on success.
    const tempId = nextTempId.current--
    const trimmed = url.trim()

    // Insert a loading placeholder immediately so the spinner shows.
    const placeholder: Playlist = {
      id: tempId,
      title: "New playlist",
      sourceUrl: trimmed,
      thumbnailUrl: "",
      tracks: [],
      tracksLoaded: false,
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

  // `kind` only selects which loading text the UI shows.
  const loadTracks = React.useCallback(
    (playlistId: number, kind: "fetch" | "refresh") => {
      const playlist = state.playlists.find((p) => p.id === playlistId)
      if (!playlist) return
      if (!playlist.sourceUrl) return
      // Not persisted yet, so the backend has nothing to fetch for it.
      if (playlistId < 0) return

      dispatch({
        type: kind === "fetch" ? "START_FETCH" : "START_REFRESH",
        playlistId,
      })

      const inFlight = (fetchSeq.current.get(playlistId) ?? 0) + 1
      fetchSeq.current.set(playlistId, inFlight)

      playlistFetchVideos(playlistId)
        .then((videos) => {
          if (fetchSeq.current.get(playlistId) !== inFlight) return
          dispatch({
            type: "FETCH_SUCCESS",
            playlistId,
            tracks: videos.map(toUiTrack),
            syncedAt: new Date().toISOString(),
          })
        })
        .catch((err) => {
          if (fetchSeq.current.get(playlistId) !== inFlight) return
          dispatch({
            type: "FETCH_ERROR",
            playlistId,
            message: String(err),
          })
        })
    },
    [state.playlists]
  )

  const fetchPlaylist = React.useCallback(
    (playlistId: number) => loadTracks(playlistId, "fetch"),
    [loadTracks]
  )

  const refreshPlaylist = React.useCallback(
    (playlistId: number) => loadTracks(playlistId, "refresh"),
    [loadTracks]
  )

  // Playlists come from the DB without videos, so fetch on first selection.
  React.useEffect(() => {
    const id = state.selectedPlaylistId
    if (!id) return
    const playlist = state.playlists.find((p) => p.id === id)
    if (!playlist || playlist.tracksLoaded) return
    if (playlist.status === "loading" || playlist.status === "error") return
    loadTracks(id, "fetch")
  }, [state.selectedPlaylistId, state.playlists, loadTracks])

  const deletePlaylist = React.useCallback(
    (playlistId: number) => {
      // Optimistically remove from the UI.
      dispatch({ type: "DELETE_PLAYLIST", playlistId })

      // Placeholder rows live only in memory.
      if (playlistId < 0) {
        toast.success("Removed from library")
        return
      }

      playlistDelete(playlistId)
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
    (playlistId: number, title: string) => {
      // Optimistically update the UI, then persist via the backend command.
      const previous =
        state.playlists.find((p) => p.id === playlistId)?.title ?? title
      dispatch({ type: "RENAME_PLAYLIST", playlistId, title })

      // Placeholder rows live only in memory.
      if (playlistId < 0) {
        toast.success("Playlist renamed")
        return
      }

      playlistRename(playlistId, title)
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
    (playlistId: number) => dispatch({ type: "SELECT_PLAYLIST", playlistId }),
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
    (playlistId: number) => state.playlists.find((p) => p.id === playlistId),
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
