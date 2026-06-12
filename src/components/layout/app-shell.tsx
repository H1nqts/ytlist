interface AppShellProps {
  sidebar: React.ReactNode
  main: React.ReactNode
  player: React.ReactNode
}

export function AppShell({ sidebar, main, player }: AppShellProps) {
  return (
    <div
      data-slot="app-shell"
      className="grid h-dvh w-screen overflow-hidden bg-background text-foreground"
      style={{
        gridTemplateColumns: "300px 1fr",
        gridTemplateRows: "1fr auto",
        gridTemplateAreas: '"sidebar main" "player player"',
      }}
    >
      <aside
        className="min-h-0 overflow-hidden border-r border-border bg-sidebar text-sidebar-foreground"
        style={{ gridArea: "sidebar" }}
      >
        {sidebar}
      </aside>
      <main className="min-h-0 overflow-hidden" style={{ gridArea: "main" }}>
        {main}
      </main>
      <footer
        className="border-t border-border bg-card"
        style={{ gridArea: "player" }}
      >
        {player}
      </footer>
    </div>
  )
}
