import type { LibraryState, Playlist, Track } from "@/types"
import { MOCK_PLAYLISTS } from "@/data/mock-playlists"

export type LibraryAction =
  | { type: "ADD_PLAYLIST"; playlist: Playlist }
  | { type: "START_FETCH"; playlistId: string }
  | { type: "START_REFRESH"; playlistId: string }
  | {
      type: "FETCH_SUCCESS"
      playlistId: string
      tracks: Track[]
      syncedAt: string
      title?: string
    }
  | { type: "FETCH_ERROR"; playlistId: string; message: string }
  | { type: "DELETE_PLAYLIST"; playlistId: string }
  | { type: "RENAME_PLAYLIST"; playlistId: string; title: string }
  | { type: "SELECT_PLAYLIST"; playlistId: string }
  | { type: "SET_SEARCH"; search: string }

export const initialLibraryState: LibraryState = {
  playlists: MOCK_PLAYLISTS,
  selectedPlaylistId: MOCK_PLAYLISTS[0]?.id ?? null,
  search: "",
}

function mapPlaylist(
  state: LibraryState,
  id: string,
  fn: (p: Playlist) => Playlist
): Playlist[] {
  return state.playlists.map((p) => (p.id === id ? fn(p) : p))
}

export function libraryReducer(
  state: LibraryState,
  action: LibraryAction
): LibraryState {
  switch (action.type) {
    case "ADD_PLAYLIST":
      return {
        ...state,
        playlists: [action.playlist, ...state.playlists],
        selectedPlaylistId: action.playlist.id,
        search: "",
      }

    case "START_FETCH":
      return {
        ...state,
        playlists: mapPlaylist(state, action.playlistId, (p) => ({
          ...p,
          status: "loading",
          loadingKind: "fetch",
          errorMessage: undefined,
        })),
      }

    case "START_REFRESH":
      return {
        ...state,
        playlists: mapPlaylist(state, action.playlistId, (p) => ({
          ...p,
          status: "loading",
          loadingKind: "refresh",
          errorMessage: undefined,
        })),
      }

    case "FETCH_SUCCESS":
      return {
        ...state,
        playlists: mapPlaylist(state, action.playlistId, (p) => ({
          ...p,
          status: "idle",
          loadingKind: undefined,
          errorMessage: undefined,
          tracks: action.tracks,
          title: action.title ?? p.title,
          lastSyncedAt: action.syncedAt,
        })),
      }

    case "FETCH_ERROR":
      return {
        ...state,
        playlists: mapPlaylist(state, action.playlistId, (p) => ({
          ...p,
          status: "error",
          loadingKind: undefined,
          errorMessage: action.message,
        })),
      }

    case "DELETE_PLAYLIST": {
      const remaining = state.playlists.filter((p) => p.id !== action.playlistId)
      const wasSelected = state.selectedPlaylistId === action.playlistId
      return {
        ...state,
        playlists: remaining,
        selectedPlaylistId: wasSelected
          ? (remaining[0]?.id ?? null)
          : state.selectedPlaylistId,
      }
    }

    case "RENAME_PLAYLIST":
      return {
        ...state,
        playlists: mapPlaylist(state, action.playlistId, (p) => ({
          ...p,
          title: action.title,
        })),
      }

    case "SELECT_PLAYLIST":
      return {
        ...state,
        selectedPlaylistId: action.playlistId,
        search: "",
      }

    case "SET_SEARCH":
      return { ...state, search: action.search }

    default:
      return state
  }
}
