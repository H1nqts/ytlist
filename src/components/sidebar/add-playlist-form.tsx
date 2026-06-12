import * as React from "react"
import { PlusIcon, LinkIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLibrary } from "@/hooks/use-library"

export function AddPlaylistForm() {
  const { addPlaylist } = useLibrary()
  const [url, setUrl] = React.useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const value = url.trim()
    if (!value) {
      toast.warning("Please paste a playlist link")
      return
    }
    addPlaylist(value)
    toast.message("Fetching playlist…", { description: value })
    setUrl("")
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="relative">
        <LinkIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a YouTube playlist link"
          aria-label="YouTube playlist link"
          className="pl-8"
        />
      </div>
      <Button type="submit" className="w-full" disabled={!url.trim()}>
        <PlusIcon />
        Add playlist
      </Button>
    </form>
  )
}
