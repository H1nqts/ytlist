import { Dialog as DialogPrimitive } from "radix-ui"
import { ListVideoIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { EmptyState } from "@/components/ui/empty-state"
import { useLibrary } from "@/hooks/use-library"
import { usePlayer } from "@/hooks/use-player"
import { QueueItem } from "@/components/queue/queue-item"

interface QueuePanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QueuePanel({ open, onOpenChange }: QueuePanelProps) {
  const { currentTrack, state } = usePlayer()
  const { getTrack } = useLibrary()

  const queueTracks = state.queue
    .map((id) => getTrack(id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t))

  const isEmpty = !currentTrack && queueTracks.length === 0

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex w-80 flex-col border-l border-border bg-card text-card-foreground shadow-xl outline-none",
            "duration-200 data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right"
          )}
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3.5">
            <DialogPrimitive.Title className="flex items-center gap-2 font-heading text-sm font-semibold">
              <ListVideoIcon className="size-4" />
              Play queue
            </DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <Button size="icon-sm" variant="ghost" aria-label="Close queue">
                <XIcon />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="sr-only">
            Currently playing track and upcoming tracks.
          </DialogPrimitive.Description>
          <Separator />

          {isEmpty ? (
            <EmptyState
              icon={ListVideoIcon}
              title="Queue is empty"
              description="Play a track or add tracks to the queue to see them here."
            />
          ) : (
            <ScrollArea className="min-h-0 flex-1">
              <div className="flex flex-col gap-3 p-3">
                {currentTrack && (
                  <div>
                    <p className="mb-1 px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Now playing
                    </p>
                    <QueueItem track={currentTrack} current />
                  </div>
                )}

                {queueTracks.length > 0 && (
                  <div>
                    <p className="mb-1 px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Next up · {queueTracks.length}
                    </p>
                    <div className="flex flex-col gap-0.5">
                      {queueTracks.map((track) => (
                        <QueueItem key={track.id} track={track} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
