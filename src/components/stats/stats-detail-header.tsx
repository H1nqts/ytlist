import type { StatsDetail } from "@/lib/api"
import { formatDateTime, formatDuration, formatRelative } from "@/lib/format"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Thumbnail } from "@/components/ui/thumbnail"
import { MarqueeText } from "@/components/ui/marquee-text"
import type { StatsDetailView } from "@/components/stats/stats-sub-view"

const EYEBROWS: Record<StatsDetailView["kind"], string> = {
  track: "Track",
  channel: "Channel",
  playlist: "Playlist",
}

interface StatsDetailHeaderProps {
  kind: StatsDetailView["kind"]
  detail: StatsDetail
}

export function StatsDetailHeader({ kind, detail }: StatsDetailHeaderProps) {
  const facts = [
    detail.subtitle,
    detail.durationMs
      ? formatDuration(Math.round(detail.durationMs / 1000))
      : null,
    detail.firstPlayedAt && `First played ${formatDateTime(detail.firstPlayedAt)}`,
    detail.lastPlayedAt && `Last played ${formatRelative(detail.lastPlayedAt)}`,
  ].filter(Boolean) as string[]

  return (
    <section className="flex items-center gap-4">
      {kind === "channel" ? (
        <Avatar size="lg" className="size-16">
          {detail.image && (
            <AvatarImage src={detail.image} alt={detail.title} />
          )}
          <AvatarFallback className="text-xl">
            {detail.title.slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ) : (
        <Thumbnail
          src={detail.image ?? undefined}
          alt={detail.title}
          className="aspect-video h-20 w-auto rounded-lg"
        />
      )}

      <div className="min-w-0">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {EYEBROWS[kind]}
        </p>
        <MarqueeText as="h2" className="font-heading text-xl font-semibold">
          {detail.title}
        </MarqueeText>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {facts.map((fact, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden>·</span>}
              {fact}
            </span>
          ))}
          {!detail.present && (
            <Badge variant="secondary" className="text-[10px]">
              Removed
            </Badge>
          )}
        </div>
      </div>
    </section>
  )
}
