import * as React from "react"
import {
  DownloadCloudIcon,
  RefreshCwIcon,
  PencilIcon,
  Trash2Icon,
  AlertCircleIcon,
  CheckIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import type { Playlist } from "@/types"
import { formatTotalDuration } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Thumbnail } from "@/components/ui/thumbnail"
import { MarqueeText } from "@/components/ui/marquee-text"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useLibrary } from "@/hooks/use-library"

interface PlaylistListItemProps {
  playlist: Playlist
  active: boolean
}

export function PlaylistListItem({ playlist, active }: PlaylistListItemProps) {
  const { selectPlaylist, fetchPlaylist, refreshPlaylist, renamePlaylist, deletePlaylist } =
    useLibrary()

  const [renaming, setRenaming] = React.useState(false)
  const [draftTitle, setDraftTitle] = React.useState(playlist.title)
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  const isLoading = playlist.status === "loading"
  const isError = playlist.status === "error"

  const totalSec = playlist.tracks.reduce((sum, t) => sum + t.durationSec, 0)

  function commitRename() {
    const next = draftTitle.trim()
    if (next && next !== playlist.title) {
      // Success/error feedback is handled in renamePlaylist (it knows the
      // backend result).
      renamePlaylist(playlist.id, next)
    }
    setRenaming(false)
  }

  function cancelRename() {
    setDraftTitle(playlist.title)
    setRenaming(false)
  }

  // --- Rename mode: replaces the whole row with an inline editor ----------
  if (renaming) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent p-2">
        <Input
          autoFocus
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename()
            if (e.key === "Escape") cancelRename()
          }}
          className="h-7"
          aria-label="Playlist name"
        />
        <Button size="icon-sm" variant="ghost" onClick={commitRename} aria-label="Save name">
          <CheckIcon />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={cancelRename} aria-label="Cancel rename">
          <XIcon />
        </Button>
      </div>
    )
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            onClick={() => selectPlaylist(playlist.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                selectPlaylist(playlist.id)
              }
            }}
            className={cn(
              "group/item flex cursor-default items-center gap-3 rounded-lg p-2 text-left outline-none transition-colors",
              "hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              active && "bg-sidebar-accent"
            )}
            data-active={active}
            data-marquee-group
          >
            <Thumbnail
              src={playlist.thumbnailUrl}
              alt={playlist.title}
              className="aspect-video h-11 w-auto"
            />

            <div className="min-w-0 flex-1">
              <MarqueeText
                as="p"
                group
                className="text-sm font-medium text-sidebar-foreground"
              >
                {playlist.title}
              </MarqueeText>
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                {isLoading ? (
                  <>
                    <Spinner className="size-3" />
                    <span>
                      {playlist.loadingKind === "refresh"
                        ? "Refreshing…"
                        : "Fetching…"}
                    </span>
                  </>
                ) : isError ? (
                  <span className="flex items-center gap-1 truncate text-destructive">
                    <AlertCircleIcon className="size-3 shrink-0" />
                    <span className="truncate">
                      {playlist.errorMessage ?? "Failed to load"}
                    </span>
                  </span>
                ) : (
                  <>
                    <span>{playlist.tracks.length} tracks</span>
                    <span aria-hidden>·</span>
                    <span className="truncate">{formatTotalDuration(totalSec)}</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-48">
          <ContextMenuItem
            disabled={isLoading}
            onSelect={() => {
              fetchPlaylist(playlist.id)
              toast.message("Re-fetching from source…")
            }}
          >
            <DownloadCloudIcon />
            Fetch from link
          </ContextMenuItem>
          <ContextMenuItem
            disabled={isLoading}
            onSelect={() => {
              refreshPlaylist(playlist.id)
              toast.message("Refreshing…")
            }}
          >
            <RefreshCwIcon />
            Refresh
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() => {
              setDraftTitle(playlist.title)
              setRenaming(true)
            }}
          >
            <PencilIcon />
            Rename
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
            <Trash2Icon />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete playlist?</DialogTitle>
            <DialogDescription>
              "{playlist.title}" will be removed from your library. This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                // Success/error feedback is handled in deletePlaylist.
                deletePlaylist(playlist.id)
                setConfirmOpen(false)
              }}
            >
              <Trash2Icon />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
