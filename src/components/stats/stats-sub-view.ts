import type { DetailTarget, RankingKind, RankingSort } from "@/lib/api"

export type StatsTab = "overview" | RankingKind | "patterns"

/** A tab's own state, kept while the detail view covers it. */
export interface RankingTabState {
  sort: RankingSort
  offset: number
}

/** Detail views carry a display name so the header renders before the fetch resolves. */
export type StatsDetailView =
  | { kind: "track"; videoId: string; title: string }
  | { kind: "channel"; channelId: string | null; channelName: string }
  | { kind: "playlist"; playlistId: number | null; name: string }

export const TABS: { value: StatsTab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "tracks", label: "Tracks" },
  { value: "channels", label: "Channels" },
  { value: "playlists", label: "Playlists" },
  { value: "patterns", label: "Patterns" },
]

const TAB_TITLES: Record<StatsTab, string> = {
  overview: "Statistics",
  tracks: "Top tracks",
  channels: "Top channels",
  playlists: "By playlist",
  patterns: "Listening patterns",
}

export function tabTitle(tab: StatsTab): string {
  return TAB_TITLES[tab]
}

export function detailTitle(detail: StatsDetailView): string {
  switch (detail.kind) {
    case "track":
      return detail.title
    case "channel":
      return detail.channelName
    case "playlist":
      return detail.name
  }
}

export function isRanking(tab: StatsTab): tab is RankingKind {
  return tab === "tracks" || tab === "channels" || tab === "playlists"
}

/** Drops the display-only fields, keeping the target stable across renders. */
export function toTarget(detail: StatsDetailView): DetailTarget {
  switch (detail.kind) {
    case "track":
      return { kind: "track", videoId: detail.videoId }
    case "channel":
      return { kind: "channel", channelId: detail.channelId }
    case "playlist":
      return { kind: "playlist", playlistId: detail.playlistId }
  }
}
