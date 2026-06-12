import * as React from "react"

import { PlayerContext } from "@/state/player-context"

export function usePlayer() {
  const ctx = React.useContext(PlayerContext)
  if (!ctx) {
    throw new Error("usePlayer must be used within a PlayerProvider")
  }
  return ctx
}
