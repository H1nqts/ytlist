import { error } from "@tauri-apps/plugin-log"

export function logError(message: string, err: unknown): void {
  if (import.meta.env.DEV) console.error(message, err)
  void error(`${message}: ${String(err)}`).catch(() => {})
}
