const SHORTCUTS: { action: string; keys: string[] }[] = [
  { action: "Play / Pause", keys: ["Space"] },
  { action: "Next track", keys: ["Ctrl", "→"] },
  { action: "Previous track", keys: ["Ctrl", "←"] },
  { action: "Volume up", keys: ["Ctrl", "↑"] },
  { action: "Volume down", keys: ["Ctrl", "↓"] },
  { action: "Toggle shuffle", keys: ["S"] },
  { action: "Cycle repeat", keys: ["R"] },
  { action: "Toggle mute", keys: ["M"] },
  { action: "Focus search", keys: ["Ctrl", "F"] },
  { action: "Toggle queue", keys: ["Q"] },
]

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-border bg-muted px-1.5 text-xs font-medium text-foreground">
      {children}
    </kbd>
  )
}

export function SettingsShortcuts() {
  return (
    <div className="divide-y divide-border">
      {SHORTCUTS.map((s) => (
        <div key={s.action} className="flex items-center justify-between gap-4 py-2.5">
          <span className="text-sm text-foreground">{s.action}</span>
          <span className="flex items-center gap-1">
            {s.keys.map((k, i) => (
              <span key={k} className="flex items-center gap-1">
                {i > 0 && <span className="text-xs text-muted-foreground">+</span>}
                <Kbd>{k}</Kbd>
              </span>
            ))}
          </span>
        </div>
      ))}
    </div>
  )
}
