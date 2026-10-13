import type { PlaylistStat } from "@/lib/api"
import { formatTotalDuration } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface StatsPlaylistsProps {
  playlists: PlaylistStat[]
  onSeeAll?: () => void
  onSelect?: (playlistId: number | null) => void
}

export function StatsPlaylists({
  playlists,
  onSeeAll,
  onSelect,
}: StatsPlaylistsProps) {
  if (playlists.length === 0) return null

  const peak = Math.max(1, ...playlists.map((p) => p.listenedMs))

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-foreground">By playlist</h2>
        {onSeeAll && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onSeeAll}
            className="h-6 px-2 text-[11px] text-muted-foreground"
          >
            See all
          </Button>
        )}
      </div>

      <ul className="space-y-1">
        {playlists.map((playlist) => (
          <li
            key={playlist.playlistId ?? "none"}
            className={cn(
              "relative flex items-center gap-2 overflow-hidden rounded-md px-2 py-1.5",
              onSelect && "cursor-pointer hover:bg-accent/50"
            )}
            {...(onSelect && {
              role: "button",
              tabIndex: 0,
              onClick: () => onSelect(playlist.playlistId),
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  onSelect(playlist.playlistId)
                }
              },
            })}
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
