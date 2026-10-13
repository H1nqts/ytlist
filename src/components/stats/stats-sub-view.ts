import type { DetailTarget, RankingKind, RankingSort } from "@/lib/api"

/** Detail views carry a display name so the header renders before the fetch resolves. */
export type StatsSubView =
  | { kind: "overview" }
  | { kind: "ranking"; of: RankingKind; sort: RankingSort; offset: number }
  | { kind: "track"; videoId: string; title: string }
  | { kind: "channel"; channelId: string | null; channelName: string }
  | { kind: "playlist"; playlistId: number | null; name: string }
  | { kind: "patterns" }

export type StatsDetailView = Extract<
  StatsSubView,
  { kind: "track" | "channel" | "playlist" }
>

export function ranking(of: RankingKind): StatsSubView {
  return { kind: "ranking", of, sort: "listenedMs", offset: 0 }
}

const RANKING_TITLES: Record<RankingKind, string> = {
  tracks: "Top tracks",
  channels: "Top channels",
  playlists: "By playlist",
}

export function subViewTitle(sub: StatsSubView): string {
  switch (sub.kind) {
    case "overview":
      return "Statistics"
    case "ranking":
      return RANKING_TITLES[sub.of]
    case "track":
      return sub.title
    case "channel":
      return sub.channelName
    case "playlist":
      return sub.name
    case "patterns":
      return "Listening patterns"
  }
}

/** Drops the display-only fields, keeping the target stable across renders. */
export function toTarget(sub: StatsDetailView): DetailTarget {
  switch (sub.kind) {
    case "track":
      return { kind: "track", videoId: sub.videoId }
    case "channel":
      return { kind: "channel", channelId: sub.channelId }
    case "playlist":
      return { kind: "playlist", playlistId: sub.playlistId }
  }
}
