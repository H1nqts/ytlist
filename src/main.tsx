import ReactDOM from "react-dom/client"

import App from "./App"
import "./index.css"
import { SettingsProvider } from "@/state/settings-context"
import { LibraryProvider } from "@/state/library-context"
import { PlayerProvider } from "@/state/player-context"
import { TooltipProvider } from "@/components/ui/tooltip"

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <SettingsProvider>
    <LibraryProvider>
      <PlayerProvider>
        <TooltipProvider delayDuration={200}>
          <App />
        </TooltipProvider>
      </PlayerProvider>
    </LibraryProvider>
  </SettingsProvider>
)
