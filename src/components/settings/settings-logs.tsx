import * as React from "react"
import { FolderOpenIcon } from "lucide-react"
import { revealItemInDir } from "@tauri-apps/plugin-opener"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { logDirGet } from "@/lib/api"
import { logError } from "@/lib/logger"

export function SettingsLogs() {
  const [dir, setDir] = React.useState<string | null>(null)
  const [failed, setFailed] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false

    logDirGet()
      .then((path) => {
        if (!cancelled) setDir(path)
      })
      .catch((err) => {
        if (cancelled) return
        setFailed(true)
        logError("Failed to read the log directory", err)
      })

    return () => {
      cancelled = true
    }
  }, [])

  function onReveal() {
    if (!dir) return
    revealItemInDir(dir).catch((err) => {
      logError("Failed to open the log folder", err)
      toast.error("Couldn't open the log folder", { description: String(err) })
    })
  }

  return (
    <div className="space-y-3 py-1">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-foreground">Log files</p>
          <p className="text-xs text-muted-foreground">
            ytlist records what it is doing so problems can be traced later.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onReveal} disabled={!dir}>
          <FolderOpenIcon />
          Open log folder
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-muted/40 p-3">
        {failed ? (
          <p className="text-xs text-muted-foreground">
            The log location is unavailable.
          </p>
        ) : dir ? (
          <p className="font-mono text-xs break-all text-muted-foreground select-text">
            {dir}
          </p>
        ) : (
          <Spinner className="size-3.5" />
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        A new file starts each time ytlist opens, and the five most recent are
        kept.
      </p>
    </div>
  )
}
