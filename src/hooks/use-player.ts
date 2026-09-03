import * as React from "react"

import { PlayerContext, PlayerProgressContext } from "@/state/player-context"

export function usePlayer() {
  const ctx = React.useContext(PlayerContext)
  if (!ctx) {
    throw new Error("usePlayer must be used within a PlayerProvider")
  }
  return ctx
}

export function usePlayerProgress() {
  const ctx = React.useContext(PlayerProgressContext)
  if (!ctx) {
    throw new Error("usePlayerProgress must be used within a PlayerProvider")
  }
  return ctx
}
