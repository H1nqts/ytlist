import * as React from "react"
import { Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { statsClear, statsOverview } from "@/lib/api"
import { logError } from "@/lib/logger"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useSettings } from "@/hooks/use-settings"

export function SettingsStats() {
  const { statsEnabled, updateSettings, notifyStatsCleared } = useSettings()
  const [recorded, setRecorded] = React.useState<number | null>(null)
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  const countRecorded = React.useCallback(() => {
    let cancelled = false

    statsOverview("all")
      .then((overview) => {
        if (!cancelled) setRecorded(overview.summary.playCount)
      })
      .catch((err) => {
        if (cancelled) return
        setRecorded(null)
        logError("Failed to count recorded plays", err)
      })

    return () => {
      cancelled = true
    }
  }, [])

  React.useEffect(() => countRecorded(), [countRecorded])

  function onClear() {
    setConfirmOpen(false)
    statsClear()
      .then(() => {
        setRecorded(0)
        notifyStatsCleared()
        toast.success("Statistics cleared")
      })
      .catch((err) => {
        logError("Failed to clear play statistics", err)
        toast.error("Couldn't clear your statistics", {
          description: String(err),
        })
      })
  }

  return (
    <>
      <div className="divide-y divide-border py-1">
        <div className="flex items-center justify-between gap-4 pb-3">
          <div className="space-y-0.5">
            <Label htmlFor="stats-enabled" className="text-sm font-medium">
              Collect usage data
            </Label>
            <p className="text-xs text-muted-foreground">
              Usage data stays on your device and is never uploaded.
            </p>
          </div>
          <Switch
            id="stats-enabled"
            checked={statsEnabled}
            onCheckedChange={(checked) =>
              updateSettings({ statsEnabled: checked })
            }
          />
        </div>

        <div className="flex items-center justify-between gap-4 pt-3">
          <p className="text-sm font-medium text-foreground">Collected data</p>
          <Button
            variant="outline"
            size="sm"
            disabled={!recorded}
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2Icon />
            Clear
          </Button>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete all statistics?</DialogTitle>
            <DialogDescription>
              All {recorded?.toLocaleString()} recorded plays will be deleted.
              This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={onClear}>
              <Trash2Icon />
              Delete all
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
