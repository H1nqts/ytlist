import { ListChecksIcon, TriangleAlertIcon } from "lucide-react"

import type { FetchOutcome, SkipReason, SkippedVideo } from "@/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { EmptyState } from "@/components/ui/empty-state"

function describeSkipReason(reason: SkipReason, detail: string | null): string {
  switch (reason) {
    case "missingContentId":
      return "The entry carried no video id."
    case "emptyContentId":
      return "The entry carried an empty video id."
    case "missingVideoId":
      return "The entry looked like a video but had no id."
    case "unplayable":
      return "Deleted, private or otherwise unavailable."
    case "unknownRendererType":
      return detail
        ? `Unrecognised entry format (${detail}). YouTube likely changed its response.`
        : "Unrecognised entry format. YouTube likely changed its response."
    case "containerNotArray":
      return "A whole page of entries could not be read."
  }
}

function describeFetchOutcome(outcome: FetchOutcome): string | null {
  if (outcome.complete) return null
  switch (outcome.stop) {
    case "requestFailed":
      return outcome.detail
        ? `Loading stopped early because a request to YouTube failed: ${outcome.detail}`
        : "Loading stopped early because a request to YouTube failed."
    case "responseShapeChanged":
      return "Loading stopped early because YouTube returned an unexpected response."
    case "emptyPage":
      return "Loading stopped early because YouTube returned an empty page."
    case "limitReached":
      return "Loading stopped early because the fetch limit was reached."
    default:
      return "Loading stopped early, so this list may be incomplete."
  }
}

interface SkippedDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  skipped: SkippedVideo[]
  outcome?: FetchOutcome
}

export function SkippedDialog({
  open,
  onOpenChange,
  skipped,
  outcome,
}: SkippedDialogProps) {
  const truncation = outcome ? describeFetchOutcome(outcome) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Entries left out</DialogTitle>
          <DialogDescription>
            These playlist entries can't be played or couldn't be read, so they
            aren't in the track list.
          </DialogDescription>
        </DialogHeader>

        {truncation && (
          <p className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
            <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
            <span>{truncation}</span>
          </p>
        )}

        {skipped.length === 0 ? (
          <EmptyState
            icon={ListChecksIcon}
            title="Nothing was left out"
            description="Every entry on the pages that loaded was read."
          />
        ) : (
          <ScrollArea className="max-h-80 min-h-0">
            <ul className="flex flex-col gap-2 pr-3">
              {skipped.map((entry, i) => (
                <li
                  key={`${entry.videoId ?? "unknown"}-${entry.index}-${i}`}
                  className="rounded-lg bg-muted/40 p-3"
                >
                  <div className="flex items-center gap-2">
                    {entry.videoId ? (
                      <code className="truncate font-mono text-xs">
                        {entry.videoId}
                      </code>
                    ) : (
                      <span className="text-xs italic text-muted-foreground">
                        No video id
                      </span>
                    )}
                    <Badge variant="outline" className="ml-auto shrink-0">
                      #{entry.index}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {describeSkipReason(entry.reason, entry.detail)}
                  </p>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
