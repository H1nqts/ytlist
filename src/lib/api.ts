import { invoke } from "@tauri-apps/api/core"

import type { Playlist as UiPlaylist } from "@/types"
import { mockTracksForPlaylist } from "@/data/mock-helpers"

export interface Playlist {
  id: number
  name: string
  url: string
  channel_name: string
  thumbnail_url: string
  views: number
  last_updated_at: string | null
  last_synced_at: string
}

export function playlistAdd(url: string): Promise<Playlist> {
  return invoke<Playlist>("playlist_add", { url })
}

export function playlistRename(id: number, name: string): Promise<Playlist> {
  return invoke<Playlist>("playlist_rename", { id, name })
}

export function playlistDelete(id: number): Promise<void> {
  return invoke<void>("playlist_delete", { id })
}

export function playlistGetAll(): Promise<Playlist[]> {
  return invoke<Playlist[]>("playlist_get_all")
}

export function toUiPlaylist(row: Playlist): UiPlaylist {
  const id = String(row.id)
  const createdAt = new Date(row.last_synced_at).getTime()
  const safeCreatedAt = Number.isFinite(createdAt) ? createdAt : Date.now()

  return {
    id,
    title: row.name,
    sourceUrl: row.url,
    thumbnailUrl: row.thumbnail_url,
    status: "idle",
    lastSyncedAt: row.last_synced_at,
    tracks: mockTracksForPlaylist(id, row.url, safeCreatedAt),
  }
}
