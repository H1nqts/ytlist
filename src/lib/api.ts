import { invoke } from "@tauri-apps/api/core"

import type { Playlist as UiPlaylist, Track as UiTrack } from "@/types"

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

export interface Channel {
  id: string
  name: string
  icon: string
}

export interface Video {
  id: string
  title: string
  thumbnail: string
  channel: Channel
  /** Millisecond */
  duration: number
  views: number
}

export type YtdlpState =
  | "checking"
  | "downloading"
  | "updating"
  | "ready"
  | "error"

export interface YtdlpStatus {
  state: YtdlpState
  message: string | null
}

export interface StreamInfo {
  url: string
  ext: string | null
  abr: number | null
  acodec: string | null
  /** Unix seconds */
  expires_at: number | null
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

export function playlistFetchVideos(id: number): Promise<Video[]> {
  return invoke<Video[]>("playlist_fetch_videos", { id })
}

export function ytdlpStatus(): Promise<YtdlpStatus> {
  return invoke<YtdlpStatus>("ytdlp_status")
}

export function ytdlpRetry(): Promise<YtdlpStatus> {
  return invoke<YtdlpStatus>("ytdlp_retry")
}

export function streamResolve(videoId: string): Promise<StreamInfo> {
  return invoke<StreamInfo>("stream_resolve", { videoId })
}

export function toUiTrack(video: Video): UiTrack {
  return {
    id: video.id,
    title: video.title,
    channel: video.channel.name,
    channelAvatarUrl: video.channel.icon || undefined,
    thumbnailUrl: video.thumbnail,
    durationSec: Math.round(video.duration / 1000),
    views: video.views,
  }
}

export function toUiPlaylist(row: Playlist): UiPlaylist {
  return {
    id: row.id,
    title: row.name,
    sourceUrl: row.url,
    thumbnailUrl: row.thumbnail_url,
    status: "idle",
    lastSyncedAt: row.last_synced_at,
    // Fetched separately via playlist_fetch_videos.
    tracks: [],
    tracksLoaded: false,
  }
}
