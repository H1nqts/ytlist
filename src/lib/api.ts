import { invoke } from "@tauri-apps/api/core"

import type {
  AppSettings,
  FetchOutcome,
  Playlist as UiPlaylist,
  QueueEntry,
  SkippedVideo,
  Track as UiTrack,
} from "@/types"

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

export interface PlaylistVideos {
  videos: Video[]
  skipped: SkippedVideo[]
  outcome: FetchOutcome
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

export function playlistFetchVideos(id: number): Promise<PlaylistVideos> {
  return invoke<PlaylistVideos>("playlist_fetch_videos", { id })
}

export function playlistGetVideos(id: number): Promise<PlaylistVideos> {
  return invoke<PlaylistVideos>("playlist_get_videos", { id })
}

export function videoGetByIds(ids: string[]): Promise<Video[]> {
  return invoke<Video[]>("video_get_by_ids", { ids })
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

export type SettingsPatch = Partial<AppSettings>

export function settingsGet(): Promise<AppSettings> {
  return invoke<AppSettings>("settings_get")
}

export function settingsUpdate(patch: SettingsPatch): Promise<AppSettings> {
  return invoke<AppSettings>("settings_update", { patch })
}

export interface Playback {
  queue: QueueEntry[]
  currentTrackId: string | null
  currentQueueKey: string | null
  currentPlaylistId: number | null
}

export function playbackGet(): Promise<Playback> {
  return invoke<Playback>("playback_get")
}

export function playbackSet(playback: Playback): Promise<void> {
  return invoke<void>("playback_set", { playback })
}

export function logDirGet(): Promise<string> {
  return invoke<string>("log_dir_get")
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
    skipped: [],
  }
}
