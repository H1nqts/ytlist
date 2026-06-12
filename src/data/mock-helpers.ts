import type { Playlist, Track } from "@/types"
import { avatarFor, thumbFor } from "@/data/mock-playlists"

// ---------------------------------------------------------------------------
// Fabricate playlists from a pasted link. There is no real YouTube parsing —
// these helpers simulate a successful fetch (or surface an error) so the UI's
// loading / success / error paths can all be exercised.
// ---------------------------------------------------------------------------

/**
 * Returns true for links that should fail the (mock) fetch:
 * empty, non-YouTube, or anything mentioning "private".
 */
export function isLikelyInvalidUrl(url: string): boolean {
  const trimmed = url.trim()
  if (trimmed.length === 0) return true
  const lower = trimmed.toLowerCase()
  if (lower.includes("private")) return true
  const isYouTube =
    lower.includes("youtube.com") || lower.includes("youtu.be")
  return !isYouTube
}

/** A human-facing error for an invalid/unfetchable link. */
export function fetchErrorFor(url: string): string {
  const lower = url.trim().toLowerCase()
  if (url.trim().length === 0) return "Please paste a playlist link"
  if (lower.includes("private")) return "This playlist is private"
  if (!(lower.includes("youtube.com") || lower.includes("youtu.be")))
    return "Not a valid YouTube playlist link"
  return "Couldn't fetch this playlist"
}

const TITLE_WORDS = [
  "Vibes",
  "Mix",
  "Sessions",
  "Collection",
  "Favorites",
  "Radio",
  "Essentials",
  "Picks",
]
const CHANNELS = [
  "Topic",
  "Vevo",
  "Sessions Live",
  "Audio Library",
  "Indie Sounds",
  "The Lab",
  "Night Owl",
]
const SAMPLE_TITLES = [
  "Golden Hour",
  "Paper Planes",
  "Velvet Sky",
  "Neon Streets",
  "Slow Motion",
  "Afterglow",
  "Open Road",
  "Tidal Wave",
  "Dreamcatcher",
  "Heartlines",
  "Static",
  "Glass Animals",
  "Echoes",
  "Daydream",
  "Northern Lights",
  "Comet",
  "Wildfire",
  "Saltwater",
  "Lantern",
  "Horizon",
]

/**
 * Deterministic pseudo-random based on a string seed — avoids Math.random()
 * so repeated calls with the same url are stable within a session.
 */
function seededInt(seed: string, salt: number, max: number): number {
  let h = salt
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0
  }
  return h % max
}

/**
 * Build a fresh playlist for a (presumed valid) link. The number and content
 * of tracks is derived deterministically from the url.
 */
export function createPlaylistFromUrl(url: string, createdAt: number): Playlist {
  const id = `pl-${createdAt.toString(36)}`
  const trackCount = 8 + seededInt(url, 7, 10) // 8..17

  const tracks: Track[] = Array.from({ length: trackCount }, (_, i) => {
    const tid = `${id}-t${i + 1}`
    const titleIdx = seededInt(url + i, 3, SAMPLE_TITLES.length)
    const channelIdx = seededInt(url + i, 11, CHANNELS.length)
    const channel = CHANNELS[channelIdx]
    return {
      id: tid,
      title: SAMPLE_TITLES[(titleIdx + i) % SAMPLE_TITLES.length],
      channel,
      channelAvatarUrl: avatarFor(`${id}-${channel}`),
      thumbnailUrl: thumbFor(tid),
      durationSec: 150 + seededInt(url + i, 5, 230), // 150..379
      views: 5_000 + seededInt(url + i, 13, 50_000_000),
      addedAt: new Date(createdAt - (trackCount - i) * 60_000).toISOString(),
    }
  })

  const word = TITLE_WORDS[seededInt(url, 17, TITLE_WORDS.length)]
  const isoNow = new Date(createdAt).toISOString()

  return {
    id,
    title: `Imported ${word}`,
    sourceUrl: url.trim(),
    thumbnailUrl: thumbFor(`${id}-cover`),
    tracks,
    status: "idle",
    lastSyncedAt: isoNow,
  }
}

/** Re-fetch produces a slightly different track set, simulating an updated source. */
export function refetchTracks(playlistId: string, sourceUrl: string, at: number): Track[] {
  const count = 8 + seededInt(sourceUrl + at.toString(), 7, 12)
  return Array.from({ length: count }, (_, i) => {
    const tid = `${playlistId}-r${at.toString(36)}-t${i + 1}`
    const titleIdx = seededInt(sourceUrl + i + at.toString(), 3, SAMPLE_TITLES.length)
    const channelIdx = seededInt(sourceUrl + i, 11, CHANNELS.length)
    const channel = CHANNELS[channelIdx]
    return {
      id: tid,
      title: SAMPLE_TITLES[titleIdx],
      channel,
      channelAvatarUrl: avatarFor(`${playlistId}-${channel}`),
      thumbnailUrl: thumbFor(tid),
      durationSec: 150 + seededInt(sourceUrl + i + at.toString(), 5, 230),
      views: 5_000 + seededInt(sourceUrl + i + at.toString(), 13, 50_000_000),
      addedAt: new Date(at - (count - i) * 60_000).toISOString(),
    }
  })
}
