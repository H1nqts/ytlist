import type { Playlist, Track } from "@/types"

// ---------------------------------------------------------------------------
// Deterministic mock content. No network is required to render the UI:
// thumbnails point at picsum.photos but every consumer also renders a fallback.
// ---------------------------------------------------------------------------

export function thumbFor(seed: string): string {
  return `https://picsum.photos/seed/${seed}/320/180`
}

export function avatarFor(seed: string): string {
  return `https://picsum.photos/seed/${seed}-ch/80/80`
}

interface TrackSeed {
  title: string
  channel: string
  durationSec: number
  views: number
}

function makeTracks(playlistId: string, seeds: TrackSeed[]): Track[] {
  // Stagger addedAt so "original order" and "added recently" are distinguishable.
  const base = Date.UTC(2024, 9, 1, 12, 0, 0)
  return seeds.map((seed, i) => {
    const id = `${playlistId}-t${i + 1}`
    return {
      id,
      title: seed.title,
      channel: seed.channel,
      channelAvatarUrl: avatarFor(`${playlistId}-${seed.channel}`),
      thumbnailUrl: thumbFor(id),
      durationSec: seed.durationSec,
      views: seed.views,
      addedAt: new Date(base + i * 36 * 60 * 60 * 1000).toISOString(),
    }
  })
}

const lofiTracks = makeTracks("pl-lofi", [
  { title: "Midnight Study Session", channel: "Lofi Girl", durationSec: 184, views: 12_400_000 },
  { title: "Rainy Window Beats", channel: "Chillhop Music", durationSec: 212, views: 8_930_000 },
  { title: "Coffee & Code", channel: "Lofi Girl", durationSec: 167, views: 3_200_000 },
  { title: "Late Night Drive", channel: "College Music", durationSec: 241, views: 21_700_000 },
  { title: "Soft Piano Loops", channel: "Chillhop Music", durationSec: 198, views: 1_050_000 },
  { title: "Warm Tape Hiss", channel: "Ambient Worlds", durationSec: 223, views: 642_000 },
  { title: "Sunday Morning Jazz Hop", channel: "Lofi Girl", durationSec: 256, views: 5_400_000 },
  { title: "Focus Flow (1 Hour Mix)", channel: "College Music", durationSec: 3_842, views: 48_300_000 },
  { title: "Quiet Hours", channel: "Ambient Worlds", durationSec: 175, views: 318_000 },
  { title: "Stargaze", channel: "Chillhop Music", durationSec: 204, views: 2_760_000 },
  { title: "Dusty Vinyl", channel: "Lofi Girl", durationSec: 189, views: 990_000 },
  { title: "Endless Scroll", channel: "College Music", durationSec: 233, views: 4_120_000 },
])

const rockTracks = makeTracks("pl-rock", [
  { title: "Smells Like Teen Spirit", channel: "Nirvana", durationSec: 301, views: 1_870_000_000 },
  { title: "Black Hole Sun", channel: "Soundgarden", durationSec: 318, views: 412_000_000 },
  { title: "Wonderwall", channel: "Oasis", durationSec: 258, views: 980_000_000 },
  { title: "Killing in the Name", channel: "Rage Against the Machine", durationSec: 313, views: 256_000_000 },
  { title: "Creep", channel: "Radiohead", durationSec: 238, views: 760_000_000 },
  { title: "Loser", channel: "Beck", durationSec: 234, views: 88_400_000 },
  { title: "Today", channel: "The Smashing Pumpkins", durationSec: 200, views: 134_000_000 },
  { title: "Come As You Are", channel: "Nirvana", durationSec: 219, views: 690_000_000 },
  { title: "Plush", channel: "Stone Temple Pilots", durationSec: 314, views: 73_000_000 },
  { title: "1979", channel: "The Smashing Pumpkins", durationSec: 264, views: 152_000_000 },
  { title: "No Excuses", channel: "Alice in Chains", durationSec: 254, views: 41_800_000 },
])

const popTracks = makeTracks("pl-pop", [
  { title: "Espresso", channel: "Sabrina Carpenter", durationSec: 175, views: 540_000_000 },
  { title: "Birds of a Feather", channel: "Billie Eilish", durationSec: 210, views: 320_000_000 },
  { title: "Not Like Us", channel: "Kendrick Lamar", durationSec: 274, views: 410_000_000 },
  { title: "Good Luck, Babe!", channel: "Chappell Roan", durationSec: 218, views: 188_000_000 },
  { title: "Too Sweet", channel: "Hozier", durationSec: 250, views: 142_000_000 },
  { title: "Beautiful Things", channel: "Benson Boone", durationSec: 180, views: 295_000_000 },
  { title: "Houdini", channel: "Dua Lipa", durationSec: 187, views: 176_000_000 },
  { title: "Lose Control", channel: "Teddy Swims", durationSec: 211, views: 233_000_000 },
  { title: "Stargazing", channel: "Myles Smith", durationSec: 168, views: 64_000_000 },
  { title: "I Had Some Help", channel: "Post Malone", durationSec: 178, views: 121_000_000 },
  { title: "Please Please Please", channel: "Sabrina Carpenter", durationSec: 186, views: 210_000_000 },
  { title: "A Bar Song (Tipsy)", channel: "Shaboozey", durationSec: 171, views: 158_000_000 },
])

const focusTracks = makeTracks("pl-focus", [
  { title: "Weightless", channel: "Marconi Union", durationSec: 488, views: 92_000_000 },
  { title: "Deep Theta Waves", channel: "Brainwave Lab", durationSec: 3_605, views: 7_300_000 },
  { title: "Spiegel im Spiegel", channel: "Arvo Pärt", durationSec: 552, views: 18_400_000 },
  { title: "Gymnopédie No. 1", channel: "Erik Satie", durationSec: 213, views: 36_000_000 },
  { title: "Clair de Lune", channel: "Claude Debussy", durationSec: 305, views: 54_000_000 },
  { title: "On the Nature of Daylight", channel: "Max Richter", durationSec: 366, views: 27_900_000 },
  { title: "Una Mattina", channel: "Ludovico Einaudi", durationSec: 211, views: 41_200_000 },
  { title: "Experience", channel: "Ludovico Einaudi", durationSec: 312, views: 88_700_000 },
  { title: "Nuvole Bianche", channel: "Ludovico Einaudi", durationSec: 359, views: 73_500_000 },
  { title: "White Noise — 2 Hours", channel: "Sleep Tube", durationSec: 7_212, views: 4_100_000 },
])

const workoutTracks = makeTracks("pl-workout", [
  { title: "Till I Collapse", channel: "Eminem", durationSec: 297, views: 690_000_000 },
  { title: "Stronger", channel: "Kanye West", durationSec: 312, views: 320_000_000 },
  { title: "POWER", channel: "Kanye West", durationSec: 292, views: 145_000_000 },
  { title: "Can't Hold Us", channel: "Macklemore & Ryan Lewis", durationSec: 258, views: 1_100_000_000 },
  { title: "HUMBLE.", channel: "Kendrick Lamar", durationSec: 177, views: 880_000_000 },
  { title: "Eye of the Tiger", channel: "Survivor", durationSec: 245, views: 560_000_000 },
  { title: "Lose Yourself", channel: "Eminem", durationSec: 326, views: 920_000_000 },
  { title: "Believer", channel: "Imagine Dragons", durationSec: 204, views: 1_700_000_000 },
  { title: "Thunder", channel: "Imagine Dragons", durationSec: 187, views: 1_400_000_000 },
  { title: "Industry Baby", channel: "Lil Nas X", durationSec: 212, views: 510_000_000 },
  { title: "Run This Town", channel: "Jay-Z", durationSec: 267, views: 230_000_000 },
])

function totalThumb(playlistId: string): string {
  return thumbFor(`${playlistId}-cover`)
}

export const MOCK_PLAYLISTS: Playlist[] = [
  {
    id: "pl-lofi",
    title: "Lo-Fi Beats to Study",
    sourceUrl: "https://www.youtube.com/playlist?list=PLlofi",
    thumbnailUrl: totalThumb("pl-lofi"),
    tracks: lofiTracks,
    status: "idle",
    lastSyncedAt: new Date(Date.UTC(2024, 10, 2, 9, 30)).toISOString(),
  },
  {
    id: "pl-rock",
    title: "90s Rock Anthems",
    sourceUrl: "https://www.youtube.com/playlist?list=PLrock",
    thumbnailUrl: totalThumb("pl-rock"),
    tracks: rockTracks,
    status: "idle",
    lastSyncedAt: new Date(Date.UTC(2024, 9, 28, 18, 5)).toISOString(),
  },
  {
    id: "pl-pop",
    title: "Top Pop Hits 2024",
    sourceUrl: "https://www.youtube.com/playlist?list=PLpop",
    thumbnailUrl: totalThumb("pl-pop"),
    tracks: popTracks,
    status: "idle",
    lastSyncedAt: new Date(Date.UTC(2024, 10, 4, 14, 12)).toISOString(),
  },
  {
    id: "pl-focus",
    title: "Deep Focus Instrumental",
    sourceUrl: "https://www.youtube.com/playlist?list=PLfocus",
    thumbnailUrl: totalThumb("pl-focus"),
    tracks: focusTracks,
    status: "idle",
    lastSyncedAt: new Date(Date.UTC(2024, 9, 20, 7, 45)).toISOString(),
  },
  {
    id: "pl-workout",
    title: "Workout Energy Mix",
    sourceUrl: "https://www.youtube.com/playlist?list=PLworkout",
    thumbnailUrl: totalThumb("pl-workout"),
    // Seeded as an error state to showcase the error UI without user action.
    tracks: workoutTracks,
    status: "error",
    errorMessage: "This playlist is private",
    lastSyncedAt: new Date(Date.UTC(2024, 9, 10, 11, 0)).toISOString(),
  },
]
