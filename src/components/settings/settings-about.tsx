import { ListMusicIcon } from "lucide-react"

export function SettingsAbout() {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <ListMusicIcon className="size-7" />
      </div>
      <div>
        <p className="font-heading text-lg font-semibold">ytlist</p>
        <p className="text-xs text-muted-foreground">Version 0.1.0</p>
      </div>
      <p className="max-w-xs text-xs text-muted-foreground">
        A desktop client for browsing and playing your YouTube playlists.
        Built with Tauri, React, and Tailwind CSS.
      </p>
      {/* <p className="text-xs text-muted-foreground">
        Made with ♪ — UI preview build.
      </p> */}
    </div>
  )
}
