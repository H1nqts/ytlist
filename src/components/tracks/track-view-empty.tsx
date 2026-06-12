import { ListMusicIcon } from "lucide-react"

import { EmptyState } from "@/components/ui/empty-state"

export function TrackViewEmpty() {
  return (
    <EmptyState
      icon={ListMusicIcon}
      title="Select a playlist"
      description="Choose a playlist from your library, or add a new one to get started."
    />
  )
}
