import { ListMusicIcon } from "lucide-react"

import { Separator } from "@/components/ui/separator"
import { getVersion } from '@tauri-apps/api/app'
import { useEffect, useState } from "react";

const LICENSES: { license: string; packages: string }[] = [
  {
    license: "MIT / Apache-2.0",
    packages:
      "Tauri, rusty_ytdl, serde, anyhow, chrono, url, youtube_dl, and other dual-licensed crates",
  },
  {
    license: "MIT",
    packages:
      "React, Radix UI, Tailwind CSS, sonner, next-themes, clsx, tailwind-merge, rusqlite, SQLite bindings",
  },
  { license: "Apache-2.0", packages: "class-variance-authority" },
  { license: "ISC", packages: "lucide-react" },
  { license: "SIL OFL 1.1", packages: "Geist (typeface)" },
]

function LicenseRow({
  license,
  packages,
}: {
  license: string
  packages: string
}) {
  return (
    <div className="flex gap-3 py-1.5">
      <span className="w-28 shrink-0 text-xs font-medium text-foreground">
        {license}
      </span>
      <span className="flex-1 text-xs text-muted-foreground">{packages}</span>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
      {children}
    </p>
  )
}

export function SettingsAbout() {
  const [version, setVersion] = useState<string | null>(null)

  useEffect(() => {
    getVersion().then(setVersion).catch(() => setVersion(null))
  }, [])

  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <ListMusicIcon className="size-7" />
      </div>
      <div>
        <p className="font-heading text-lg font-semibold">ytlist</p>
        <p className="text-xs text-muted-foreground">Version {version}</p>
      </div>
      <p className="max-w-xs text-xs text-muted-foreground">
        A desktop client for browsing and playing your YouTube playlists.
        Built with Tauri, React, and Tailwind CSS.
      </p>

      <Separator className="my-1 w-full" />

      <section className="w-full text-left select-text">
        <SectionTitle>Open source licenses</SectionTitle>
        <p className="text-xs text-muted-foreground">
          ytlist is released under the MIT License and builds on the work of
          these projects.
        </p>
        <div className="mt-2 divide-y divide-border">
          {LICENSES.map((l) => (
            <LicenseRow
              key={l.license}
              license={l.license}
              packages={l.packages}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          rusty_ytdl is used through a fork of Mithronn/rusty-ytdl — Copyright
          (c) 2023 Deniz Kiziroğlu, MIT License.
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Playback uses yt-dlp (Unlicense), which is downloaded from its
          official releases at runtime rather than bundled with this app.
        </p>
      </section>

      <Separator className="my-1 w-full" />

      <p className="max-w-xs text-xs text-muted-foreground">
        YouTube is a trademark of Google LLC. ytlist is an independent project
        and is not affiliated with, sponsored by, or endorsed by YouTube or
        Google LLC.
      </p>
    </div>
  )
}
