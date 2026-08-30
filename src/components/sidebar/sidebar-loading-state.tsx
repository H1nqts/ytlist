import { Spinner } from "@/components/ui/spinner"

export function SidebarLoadingState() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <Spinner className="size-5" />
      <p className="text-xs text-muted-foreground">Loading your playlists…</p>
    </div>
  )
}
