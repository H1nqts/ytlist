import { ListMusicIcon } from "lucide-react"

import { EmptyState } from "@/components/ui/empty-state"

export function SidebarEmptyState() {
  return (
    <EmptyState
      icon={ListMusicIcon}
      title="No playlists yet"
      description="Paste a YouTube playlist link above to start building your library."
      className="py-12"
    />
  )
}
