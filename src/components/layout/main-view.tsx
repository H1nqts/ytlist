import { useLibrary } from "@/hooks/use-library"
import { TrackView } from "@/components/tracks/track-view"
import { StatsView } from "@/components/stats/stats-view"

// Keeps App out of the library context, which would re-render the whole shell.
export function MainView() {
  const { view } = useLibrary()

  return view === "stats" ? <StatsView /> : <TrackView />
}
