import * as React from "react"
import { toast } from "sonner"

import { checkForUpdate } from "@/lib/updater"
import { AppShell } from "@/components/layout/app-shell"
import { LibrarySidebar } from "@/components/sidebar/library-sidebar"
import { TrackView } from "@/components/tracks/track-view"
import { PlayerBar } from "@/components/player/player-bar"
import { QueuePanel } from "@/components/queue/queue-panel"
import { SettingsPanel } from "@/components/settings/settings-panel"
import { Toaster } from "@/components/ui/sonner"

function App() {
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [queueOpen, setQueueOpen] = React.useState(false)

  React.useEffect(() => {
    if (import.meta.env.DEV) return
    let cancelled = false

    checkForUpdate()
      .then((update) => {
        if (cancelled || !update) return
        toast.message(`ytlist ${update.version} is available`, {
          description: "Open Settings › About to install it.",
        })
      })
      .catch((err) => console.error("Failed to check for updates", err))

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <AppShell
        sidebar={<LibrarySidebar onOpenSettings={() => setSettingsOpen(true)} />}
        main={<TrackView />}
        player={<PlayerBar onToggleQueue={() => setQueueOpen((v) => !v)} queueOpen={queueOpen} />}
      />
      <QueuePanel open={queueOpen} onOpenChange={setQueueOpen} />
      <SettingsPanel open={settingsOpen} onOpenChange={setSettingsOpen} />
      <Toaster richColors position="bottom-right" />
    </>
  )
}

export default App
