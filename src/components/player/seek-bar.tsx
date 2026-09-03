import { formatDuration } from "@/lib/format"
import { Slider } from "@/components/ui/slider"
import { usePlayer, usePlayerProgress } from "@/hooks/use-player"

export function SeekBar() {
  const { currentTrack, seek } = usePlayer()
  const { progressSec, durationSec } = usePlayerProgress()

  const duration = currentTrack ? durationSec : 0
  const progress = currentTrack ? progressSec : 0

  return (
    <div className="flex w-full items-center gap-2">
      <span className="w-10 text-right text-[11px] tabular-nums text-muted-foreground">
        {formatDuration(progress)}
      </span>
      <Slider
        value={[progress]}
        min={0}
        max={duration || 1}
        step={1}
        disabled={!currentTrack}
        onValueChange={(v) => seek(v[0])}
        aria-label="Seek"
        className="flex-1"
      />
      <span className="w-10 text-[11px] tabular-nums text-muted-foreground">
        {formatDuration(duration)}
      </span>
    </div>
  )
}
