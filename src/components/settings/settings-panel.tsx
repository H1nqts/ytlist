import { HandIcon, InfoIcon } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { SettingsAccessibility } from "@/components/settings/settings-accessibility"
import { SettingsAbout } from "@/components/settings/settings-about"
// Hidden for now — kept for later. See SettingsPlayback / SettingsShortcuts.
// import { Volume2Icon, KeyboardIcon } from "lucide-react"
// import { SettingsPlayback } from "@/components/settings/settings-playback"
// import { SettingsShortcuts } from "@/components/settings/settings-shortcuts"

interface SettingsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsPanel({ open, onOpenChange }: SettingsPanelProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Adjust how you interact with your library.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="accessibility" className="mt-1">
          <TabsList className="w-full">
            <TabsTrigger value="accessibility">
              <HandIcon />
              Accessibility
            </TabsTrigger>
            {/* <TabsTrigger value="playback">
              <Volume2Icon />
              Playback
            </TabsTrigger>
            <TabsTrigger value="shortcuts">
              <KeyboardIcon />
              Shortcuts
            </TabsTrigger> */}
            <TabsTrigger value="about">
              <InfoIcon />
              About
            </TabsTrigger>
          </TabsList>

          <TabsContent value="accessibility" className="pt-2">
            <SettingsAccessibility />
          </TabsContent>
          {/* <TabsContent value="playback" className="pt-2">
            <SettingsPlayback />
          </TabsContent>
          <TabsContent value="shortcuts" className="max-h-80 overflow-y-auto pt-2">
            <SettingsShortcuts />
          </TabsContent> */}
          <TabsContent value="about" className="pt-2">
            <SettingsAbout />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
