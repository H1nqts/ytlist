import * as React from "react"
import { toast } from "sonner"

import type { AppSettings, PlayActivation } from "@/types"
import { settingsGet, settingsUpdate } from "@/lib/api"

interface SettingsContextValue extends AppSettings {
  /** False until the persisted settings have been read (or the read failed). */
  loaded: boolean
  updateSettings: (patch: Partial<AppSettings>) => void
  setPlayActivation: (mode: PlayActivation) => void
}

const defaultSettings: AppSettings = {
  playActivation: "double",
}

const SettingsContext = React.createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<AppSettings>(defaultSettings)
  const [loaded, setLoaded] = React.useState(false)
  const settingsRef = React.useRef(settings)

  React.useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  React.useEffect(() => {
    let cancelled = false

    settingsGet()
      .then((row) => {
        if (!cancelled) setSettings(row)
      })
      .catch((err) => {
        if (cancelled) return
        console.error("Failed to load settings", err)
        toast.error("Couldn't load your settings", { description: String(err) })
      })
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const updateSettings = React.useCallback((patch: Partial<AppSettings>) => {
    const keys = Object.keys(patch) as (keyof AppSettings)[]
    const previous = Object.fromEntries(
      keys.map((key) => [key, settingsRef.current[key]])
    ) as Partial<AppSettings>

    setSettings((s) => ({ ...s, ...patch }))

    settingsUpdate(patch)
      .then((row) => setSettings(row))
      .catch((err) => {
        setSettings((s) => ({ ...s, ...previous }))
        toast.error("Couldn't save your settings", { description: String(err) })
      })
  }, [])

  const setPlayActivation = React.useCallback(
    (mode: PlayActivation) => updateSettings({ playActivation: mode }),
    [updateSettings]
  )

  const value = React.useMemo<SettingsContextValue>(
    () => ({ ...settings, loaded, updateSettings, setPlayActivation }),
    [settings, loaded, updateSettings, setPlayActivation]
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export { SettingsContext }
export type { SettingsContextValue }
export type { AppSettings, PlayActivation } from "@/types"
