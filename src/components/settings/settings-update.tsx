import * as React from "react"
import { DownloadIcon, RefreshCwIcon, RotateCcwIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  checkForUpdate,
  installUpdate,
  relaunch,
  type DownloadProgress,
  type Update,
} from "@/lib/updater"

type Status = "idle" | "checking" | "available" | "downloading" | "installed"

export function SettingsUpdate() {
  const [status, setStatus] = React.useState<Status>("idle")
  const [update, setUpdate] = React.useState<Update | null>(null)
  const [progress, setProgress] = React.useState<DownloadProgress | null>(null)
  const cancelled = React.useRef(false)

  React.useEffect(() => {
    cancelled.current = false
    return () => {
      cancelled.current = true
    }
  }, [])

  if (import.meta.env.DEV) {
    return (
      <p className="text-xs text-muted-foreground">
        Updates are only available in an installed build.
      </p>
    )
  }

  function onCheck() {
    setStatus("checking")
    checkForUpdate()
      .then((found) => {
        if (cancelled.current) return
        if (!found) {
          setStatus("idle")
          toast.message("You're on the latest version")
          return
        }
        setUpdate(found)
        setStatus("available")
      })
      .catch((err) => {
        if (cancelled.current) return
        setStatus("idle")
        console.error("Failed to check for updates", err)
        toast.error("Couldn't check for updates", { description: String(err) })
      })
  }

  function onInstall() {
    if (!update) return
    setStatus("downloading")
    setProgress({ downloaded: 0, total: null })

    installUpdate(update, (next) => {
      if (!cancelled.current) setProgress(next)
    })
      .then(() => {
        if (!cancelled.current) setStatus("installed")
      })
      .catch((err) => {
        if (cancelled.current) return
        setStatus("available")
        setProgress(null)
        console.error("Failed to install the update", err)
        toast.error("Couldn't install the update", { description: String(err) })
      })
  }

  function onRelaunch() {
    relaunch().catch((err) => {
      console.error("Failed to relaunch", err)
      toast.error("Couldn't restart ytlist", { description: String(err) })
    })
  }

  if (status === "downloading") {
    const percent =
      progress && progress.total
        ? Math.min(100, Math.round((progress.downloaded / progress.total) * 100))
        : null

    return (
      <div className="w-full space-y-2">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Spinner className="size-3.5" />
          <span>Downloading update{percent === null ? "…" : ` — ${percent}%`}</span>
        </div>
        {percent !== null && (
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-150"
              style={{ width: `${percent}%` }}
            />
          </div>
        )}
      </div>
    )
  }

  if (status === "installed") {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <Button size="sm" onClick={onRelaunch}>
          <RotateCcwIcon />
          Restart now
        </Button>
        <p className="text-xs text-muted-foreground">
          The update installs the next time ytlist starts.
        </p>
      </div>
    )
  }

  if (status === "available" && update) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <Button size="sm" onClick={onInstall}>
          <DownloadIcon />
          Update to {update.version}
        </Button>
        <p className="text-xs text-muted-foreground">You're on {update.currentVersion}.</p>
      </div>
    )
  }

  return (
    <Button variant="outline" size="sm" onClick={onCheck} disabled={status === "checking"}>
      {status === "checking" ? <Spinner className="size-3.5" /> : <RefreshCwIcon />}
      {status === "checking" ? "Checking…" : "Check for updates"}
    </Button>
  )
}
