import * as React from "react"

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
