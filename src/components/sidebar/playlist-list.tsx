import { ScrollArea } from "@/components/ui/scroll-area"
import { useLibrary } from "@/hooks/use-library"
import { PlaylistListItem } from "@/components/sidebar/playlist-list-item"
import { SidebarEmptyState } from "@/components/sidebar/sidebar-empty-state"

export function PlaylistList() {
  const { playlists, state } = useLibrary()

  if (playlists.length === 0) {
    return <SidebarEmptyState />
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-0.5 p-2">
        {playlists.map((playlist) => (
          <PlaylistListItem
            key={playlist.id}
            playlist={playlist}
            active={playlist.id === state.selectedPlaylistId}
          />
        ))}
      </div>
    </ScrollArea>
  )
}
