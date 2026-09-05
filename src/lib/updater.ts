import { check, type Update } from "@tauri-apps/plugin-updater"
import { relaunch } from "@tauri-apps/plugin-process"

export type { Update }

export interface DownloadProgress {
  downloaded: number
  total: number | null
}

function isMissingRelease(err: unknown): boolean {
  return String(err).includes("Could not fetch a valid release JSON")
}

export async function checkForUpdate(): Promise<Update | null> {
  try {
    return await check()
  } catch (err) {
    if (isMissingRelease(err)) return null
    throw err
  }
}

export function installUpdate(
  update: Update,
  onProgress: (progress: DownloadProgress) => void
): Promise<void> {
  let downloaded = 0
  let total: number | null = null

  return update.downloadAndInstall((event) => {
    switch (event.event) {
      case "Started":
        total = event.data.contentLength ?? null
        break
      case "Progress":
        downloaded += event.data.chunkLength
        break
      case "Finished":
        downloaded = total ?? downloaded
        break
    }
    onProgress({ downloaded, total })
  })
}

export { relaunch }
