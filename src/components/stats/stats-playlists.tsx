import type { PlaylistStat } from "@/lib/api"
import { formatTotalDuration } from "@/lib/format"
import { Badge } from "@/components/ui/badge"

interface StatsPlaylistsProps {
  playlists: PlaylistStat[]
}

export function StatsPlaylists({ playlists }: StatsPlaylistsProps) {
  if (playlists.length === 0) return null

  const peak = Math.max(1, ...playlists.map((p) => p.listenedMs))

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium text-foreground">By playlist</h2>

      <ul className="space-y-1">
        {playlists.map((playlist) => (
          <li
            key={playlist.playlistId ?? "none"}
            className="relative flex items-center gap-2 overflow-hidden rounded-md px-2 py-1.5"
          >
            <div
              aria-hidden
              style={{ width: `${(playlist.listenedMs / peak) * 100}%` }}
              className="absolute inset-y-0 left-0 bg-primary/8"
            />
            <span className="relative min-w-0 flex-1 truncate text-xs text-foreground">
              {playlist.name}
            </span>
            {!playlist.present && playlist.playlistId !== null && (
              <Badge variant="secondary" className="relative text-[10px]">
                Removed
              </Badge>
            )}
            <span className="relative shrink-0 text-[11px] text-muted-foreground tabular-nums">
              {playlist.playCount.toLocaleString()} ·{" "}
              {formatTotalDuration(Math.round(playlist.listenedMs / 1000))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
