import * as React from "react"

export type PlayActivation = "single" | "double"

interface AppSettings {
  /** Whether a single click on a track row starts playback (vs. double click). */
  playActivation: PlayActivation
}

interface SettingsContextValue extends AppSettings {
  setPlayActivation: (mode: PlayActivation) => void
}

// NOTE: settings live in memory only for now (reset on reload).
// Persistence is intentionally left out — to be added later.
const defaultSettings: AppSettings = {
  playActivation: "double",
}

const SettingsContext = React.createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<AppSettings>(defaultSettings)

  const setPlayActivation = React.useCallback((mode: PlayActivation) => {
    setSettings((s) => ({ ...s, playActivation: mode }))
  }, [])

  const value = React.useMemo<SettingsContextValue>(
    () => ({ ...settings, setPlayActivation }),
    [settings, setPlayActivation]
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export { SettingsContext }
export type { SettingsContextValue }
