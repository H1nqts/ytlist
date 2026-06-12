import * as React from "react"

import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface SettingRowProps {
  title: string
  description: string
  control: React.ReactNode
  htmlFor?: string
}

function SettingRow({ title, description, control, htmlFor }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="space-y-0.5">
        <Label htmlFor={htmlFor} className="text-sm font-medium">
          {title}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {control}
    </div>
  )
}

export function SettingsPlayback() {
  const [quality, setQuality] = React.useState("auto")
  const [autoplay, setAutoplay] = React.useState(true)
  const [crossfade, setCrossfade] = React.useState(false)
  const [gapless, setGapless] = React.useState(true)

  return (
    <div className="divide-y divide-border">
      <SettingRow
        title="Audio quality"
        description="Higher quality uses more bandwidth."
        control={
          <Select value={quality} onValueChange={setQuality}>
            <SelectTrigger className="w-36" aria-label="Audio quality">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto</SelectItem>
              <SelectItem value="low">Low (96 kbps)</SelectItem>
              <SelectItem value="normal">Normal (128 kbps)</SelectItem>
              <SelectItem value="high">High (256 kbps)</SelectItem>
            </SelectContent>
          </Select>
        }
      />
      <SettingRow
        htmlFor="autoplay"
        title="Autoplay"
        description="Keep playing similar tracks when the queue ends."
        control={
          <Switch id="autoplay" checked={autoplay} onCheckedChange={setAutoplay} />
        }
      />
      <SettingRow
        htmlFor="crossfade"
        title="Crossfade"
        description="Blend the end of one track into the next."
        control={
          <Switch id="crossfade" checked={crossfade} onCheckedChange={setCrossfade} />
        }
      />
      <SettingRow
        htmlFor="gapless"
        title="Gapless playback"
        description="Remove silence between consecutive tracks."
        control={
          <Switch id="gapless" checked={gapless} onCheckedChange={setGapless} />
        }
      />
    </div>
  )
}
