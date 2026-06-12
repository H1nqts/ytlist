// Display formatting helpers. All output strings are English.

/** 225 -> "3:45", 3753 -> "1:02:33" */
export function formatDuration(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const pad = (n: number) => n.toString().padStart(2, "0")
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`
  return `${m}:${pad(s)}`
}

/** 5040 -> "1 hr 24 min", 225 -> "3 min", 45 -> "45 sec" */
export function formatTotalDuration(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return m > 0 ? `${h} hr ${m} min` : `${h} hr`
  if (m > 0) return `${m} min`
  return `${sec} sec`
}

/** 1200000 -> "1.2M views", 853000 -> "853K views", 1100000000 -> "1.1B views" */
export function formatViews(n: number): string {
  return `${formatCount(n)} views`
}

function formatCount(n: number): string {
  if (n < 1_000) return `${n}`
  if (n < 1_000_000) return `${trim(n / 1_000)}K`
  if (n < 1_000_000_000) return `${trim(n / 1_000_000)}M`
  return `${trim(n / 1_000_000_000)}B`
}

function trim(value: number): string {
  // 1.0 -> "1", 1.2 -> "1.2"
  return value.toFixed(1).replace(/\.0$/, "")
}

/** ISO timestamp -> "just now" / "5 min ago" / "2 days ago" / "3 weeks ago" */
export function formatRelative(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime()
  const diffSec = Math.max(0, Math.floor((now - then) / 1000))

  const units: [number, string][] = [
    [60, "sec"],
    [60, "min"],
    [24, "hour"],
    [7, "day"],
    [4.345, "week"],
    [12, "month"],
    [Number.POSITIVE_INFINITY, "year"],
  ]

  if (diffSec < 45) return "just now"

  let value = diffSec
  for (let i = 0; i < units.length; i++) {
    const [size, label] = units[i]
    if (value < size) {
      const rounded = Math.round(value)
      return `${rounded} ${label}${rounded === 1 ? "" : "s"} ago`
    }
    value = value / size
  }
  return "a long time ago"
}
