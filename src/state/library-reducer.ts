import type { LibraryState, Playlist, Track } from "@/types"

export type LibraryAction =
  | { type: "SET_PLAYLISTS"; playlists: Playlist[] }
  | { type: "ADD_PLAYLIST"; playlist: Playlist }
  | { type: "REPLACE_PLAYLIST"; placeholderId: string; playlist: Playlist }
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
  // Real playlists are loaded from the backend on mount (SET_PLAYLISTS).
  playlists: [],
  selectedPlaylistId: null,
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
    case "SET_PLAYLISTS":
      return {
        ...state,
        playlists: action.playlists,
        // Keep the current selection if it still exists, else select the first.
        selectedPlaylistId:
          action.playlists.find((p) => p.id === state.selectedPlaylistId)?.id ??
          action.playlists[0]?.id ??
          null,
      }

    case "ADD_PLAYLIST":
      return {
        ...state,
        playlists: [action.playlist, ...state.playlists],
        selectedPlaylistId: action.playlist.id,
        search: "",
      }

    case "REPLACE_PLAYLIST": {
      const wasSelected = state.selectedPlaylistId === action.placeholderId
      return {
        ...state,
        playlists: state.playlists.map((p) =>
          p.id === action.placeholderId ? action.playlist : p
        ),
        selectedPlaylistId: wasSelected
          ? action.playlist.id
          : state.selectedPlaylistId,
      }
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
