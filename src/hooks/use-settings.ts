import * as React from "react"

import { SettingsContext } from "@/state/settings-context"

export function useSettings() {
  const ctx = React.useContext(SettingsContext)
  if (!ctx) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }
  return ctx
}
