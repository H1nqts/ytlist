import { SettingsIcon, ListMusicIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { AddPlaylistForm } from "@/components/sidebar/add-playlist-form"
import { PlaylistList } from "@/components/sidebar/playlist-list"

interface LibrarySidebarProps {
  onOpenSettings: () => void
}

export function LibrarySidebar({ onOpenSettings }: LibrarySidebarProps) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ListMusicIcon className="size-4" />
          </div>
          <span className="font-heading text-sm font-semibold">ytlist</span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={onOpenSettings}
              aria-label="Open settings"
            >
              <SettingsIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Settings</TooltipContent>
        </Tooltip>
      </header>

      <div className="px-3 pb-3">
        <AddPlaylistForm />
      </div>

      <Separator />

      <div className="flex items-baseline justify-between px-3 pt-3 pb-1">
        <p className="px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Library
        </p>
        <p className="text-[10px] text-muted-foreground/70">Right-click for options</p>
      </div>

      <div className="min-h-0 flex-1">
        <PlaylistList />
      </div>
    </div>
  )
}
