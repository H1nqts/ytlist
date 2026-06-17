import type { Track } from "@/types"

// ---------------------------------------------------------------------------
// Fabricate track lists for playlists. The backend doesn't return tracks yet,
// so these helpers stand in for real track data. (Seed playlists were removed —
// the library now starts empty and is populated from the backend.)
// ---------------------------------------------------------------------------

function thumbFor(seed: string): string {
  return `https://picsum.photos/seed/${seed}/320/180`
}

function avatarFor(seed: string): string {
  return `https://picsum.photos/seed/${seed}-ch/80/80`
}

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
 * Build a stand-in track list for a playlist. The number and content of tracks
 * is derived deterministically from the playlist id + url, so it's stable
 * across renders until the backend starts returning real tracks.
 */
export function mockTracksForPlaylist(
  playlistId: string,
  url: string,
  createdAt: number
): Track[] {
  const trackCount = 8 + seededInt(url, 7, 10) // 8..17

  return Array.from({ length: trackCount }, (_, i) => {
    const tid = `${playlistId}-t${i + 1}`
    const titleIdx = seededInt(url + i, 3, SAMPLE_TITLES.length)
    const channelIdx = seededInt(url + i, 11, CHANNELS.length)
    const channel = CHANNELS[channelIdx]
    return {
      id: tid,
      title: SAMPLE_TITLES[(titleIdx + i) % SAMPLE_TITLES.length],
      channel,
      channelAvatarUrl: avatarFor(`${playlistId}-${channel}`),
      thumbnailUrl: thumbFor(tid),
      durationSec: 150 + seededInt(url + i, 5, 230), // 150..379
      views: 5_000 + seededInt(url + i, 13, 50_000_000),
      addedAt: new Date(createdAt - (trackCount - i) * 60_000).toISOString(),
    }
  })
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
