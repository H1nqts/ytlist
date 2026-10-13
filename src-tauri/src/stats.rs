pub mod commands;
mod repo;

use anyhow::Result;
use chrono::{DateTime, Datelike, Duration, Local, Timelike};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};

/// Sentinels that keep every range a plain `BETWEEN`, so the `local_date` index applies.
const DATE_MIN: &str = "0000-00-00";
const DATE_MAX: &str = "9999-99-99";

const TOP_LIMIT: usize = 10;

const PAGE_SIZE: usize = 50;
const MAX_PAGE_SIZE: usize = 200;

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PlayRecord {
    pub video_id: String,
    pub title: String,
    pub channel_name: String,
    pub playlist_id: Option<i64>,
    pub playlist_name: Option<String>,
    pub started_at: String,
    pub listened_ms: i64,
    pub duration_ms: i64,
    pub completed: bool,
}

#[derive(Deserialize, Debug, Clone, Copy, PartialEq, Eq)]
pub enum StatsRange {
    #[serde(rename = "last7Days")]
    Last7Days,
    #[serde(rename = "last30Days")]
    Last30Days,
    #[serde(rename = "month")]
    Month,
    #[serde(rename = "all")]
    All,
}

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq)]
pub enum RankingKind {
    #[serde(rename = "tracks")]
    Tracks,
    #[serde(rename = "channels")]
    Channels,
    #[serde(rename = "playlists")]
    Playlists,
}

#[derive(Deserialize, Debug, Clone, Copy, PartialEq, Eq)]
pub enum RankingSort {
    #[serde(rename = "listenedMs")]
    ListenedMs,
    #[serde(rename = "playCount")]
    PlayCount,
    #[serde(rename = "completedCount")]
    CompletedCount,
    #[serde(rename = "lastPlayed")]
    LastPlayed,
    #[serde(rename = "name")]
    Name,
}

impl RankingKind {
    /// The final tiebreaker of the ranking order.
    fn group_key(self) -> &'static str {
        match self {
            Self::Tracks => "video_id",
            Self::Channels => "channel_key",
            Self::Playlists => "playlist_id",
        }
    }

    fn name_key(self) -> &'static str {
        match self {
            Self::Tracks => "title",
            Self::Channels => "channel_name",
            Self::Playlists => "name",
        }
    }
}

impl RankingSort {
    fn order_by(self, kind: RankingKind) -> String {
        let head = match self {
            Self::ListenedMs => "listened_ms DESC, play_count DESC".to_string(),
            Self::PlayCount => "play_count DESC, listened_ms DESC".to_string(),
            Self::CompletedCount => "completed_count DESC, listened_ms DESC".to_string(),
            Self::LastPlayed => "last_played_at DESC".to_string(),
            Self::Name => format!("{} COLLATE NOCASE", kind.name_key()),
        };

        format!("{head}, {}", kind.group_key())
    }
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct StatsSummary {
    pub play_count: i64,
    pub completed_count: i64,
    pub listened_ms: i64,
    pub unique_tracks: i64,
    pub unique_channels: i64,
    pub active_days: i64,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TrackStat {
    pub video_id: String,
    pub title: String,
    pub channel_name: String,
    pub thumbnail: Option<String>,
    pub play_count: i64,
    pub completed_count: i64,
    pub listened_ms: i64,
    pub last_played_at: Option<String>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ChannelStat {
    pub channel_id: Option<String>,
    pub channel_name: String,
    pub icon: Option<String>,
    pub play_count: i64,
    pub completed_count: i64,
    pub listened_ms: i64,
    pub last_played_at: Option<String>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DailyStat {
    pub date: String,
    pub play_count: i64,
    pub listened_ms: i64,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PlaylistStat {
    pub playlist_id: Option<i64>,
    pub name: String,
    pub present: bool,
    pub play_count: i64,
    pub completed_count: i64,
    pub listened_ms: i64,
    pub last_played_at: Option<String>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct StatsOverview {
    pub summary: StatsSummary,
    pub top_tracks: Vec<TrackStat>,
    pub top_channels: Vec<ChannelStat>,
    pub daily: Vec<DailyStat>,
    pub playlists: Vec<PlaylistStat>,
    pub available_months: Vec<String>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct HourStat {
    pub hour: i64,
    pub play_count: i64,
    pub listened_ms: i64,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WeekdayStat {
    /// 0 is Sunday.
    pub weekday: i64,
    pub play_count: i64,
    pub listened_ms: i64,
}

/// Hours and weekdays with no play are absent.
#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct StatsPatterns {
    pub hours: Vec<HourStat>,
    pub weekdays: Vec<WeekdayStat>,
    pub summary: StatsSummary,
}

#[derive(Deserialize, Debug, Clone)]
#[serde(tag = "kind", rename_all = "camelCase", rename_all_fields = "camelCase")]
pub enum DetailTarget {
    Track {
        video_id: String,
    },
    Channel {
        channel_id: Option<String>,
    },
    Playlist {
        playlist_id: Option<i64>,
    },
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct StatsDetail {
    pub title: String,
    pub subtitle: Option<String>,
    pub image: Option<String>,
    pub present: bool,
    pub summary: StatsSummary,
    pub daily: Vec<DailyStat>,
    /// The first and last play ever, not the ones inside the range.
    pub first_played_at: Option<String>,
    pub last_played_at: Option<String>,
    pub duration_ms: Option<i64>,
    /// Empty for a track.
    pub top_tracks: Vec<TrackStat>,
}

/// Only the list named by `kind` is filled.
#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct StatsRanking {
    pub kind: RankingKind,
    pub tracks: Vec<TrackStat>,
    pub channels: Vec<ChannelStat>,
    pub playlists: Vec<PlaylistStat>,
    pub total: i64,
    pub offset: i64,
}

/// Inclusive `local_date` bounds for a range.
fn bounds(range: StatsRange, month: Option<&str>) -> (String, String) {
    let today = Local::now().date_naive();
    let unbounded = || (DATE_MIN.to_string(), DATE_MAX.to_string());

    match range {
        StatsRange::Last7Days => (
            (today - Duration::days(6)).to_string(),
            today.to_string(),
        ),
        StatsRange::Last30Days => (
            (today - Duration::days(29)).to_string(),
            today.to_string(),
        ),
        // "YYYY-MM-DD" is fixed width, so lexical order is chronological and no
        // month can hold a 31st that does not exist.
        StatsRange::Month => month.map_or_else(unbounded, |m| {
            (format!("{m}-01"), format!("{m}-31"))
        }),
        StatsRange::All => unbounded(),
    }
}

/// (date, month, hour, weekday)
/// weekday counts from Sunday.
fn local_parts(started_at: &str) -> (String, String, i64, i64) {
    let at = DateTime::parse_from_rfc3339(started_at)
        .map(|t| t.with_timezone(&Local))
        .unwrap_or_else(|e| {
            log::warn!("unparsable startedAt {started_at} ({e}); dating it now");
            Local::now()
        });

    (
        at.format("%Y-%m-%d").to_string(),
        at.format("%Y-%m").to_string(),
        at.hour() as i64,
        at.weekday().num_days_from_sunday() as i64,
    )
}

pub fn record(conn: &Connection, play: &PlayRecord) -> Result<()> {
    let (date, month, hour, weekday) = local_parts(&play.started_at);
    repo::insert(conn, play, &date, &month, hour, weekday)
}

pub fn overview(
    conn: &Connection,
    range: StatsRange,
    month: Option<&str>,
) -> Result<StatsOverview> {
    let (from, to) = bounds(range, month);

    Ok(StatsOverview {
        summary: repo::summary(conn, &from, &to)?,
        top_tracks: repo::top_tracks(conn, &from, &to, TOP_LIMIT)?,
        top_channels: repo::top_channels(conn, &from, &to, TOP_LIMIT)?,
        daily: repo::daily(conn, &from, &to)?,
        playlists: repo::playlists(conn, &from, &to)?,
        available_months: repo::available_months(conn)?,
    })
}

pub fn patterns(
    conn: &Connection,
    range: StatsRange,
    month: Option<&str>,
) -> Result<StatsPatterns> {
    let (from, to) = bounds(range, month);

    Ok(StatsPatterns {
        hours: repo::hours(conn, &from, &to)?,
        weekdays: repo::weekdays(conn, &from, &to)?,
        summary: repo::summary(conn, &from, &to)?,
    })
}

pub fn detail(
    conn: &Connection,
    range: StatsRange,
    month: Option<&str>,
    target: &DetailTarget,
) -> Result<StatsDetail> {
    let (from, to) = bounds(range, month);
    let identity = repo::detail_identity(conn, target)?;
    let (first_played_at, last_played_at) = repo::detail_bounds(conn, target)?;

    let top_tracks = match target {
        DetailTarget::Track { .. } => Vec::new(),
        _ => repo::detail_top_tracks(conn, &from, &to, target, TOP_LIMIT)?,
    };

    Ok(StatsDetail {
        title: identity.title,
        subtitle: identity.subtitle,
        image: identity.image,
        present: identity.present,
        summary: repo::detail_summary(conn, &from, &to, target)?,
        daily: repo::detail_daily(conn, &from, &to, target)?,
        first_played_at,
        last_played_at,
        duration_ms: identity.duration_ms,
        top_tracks,
    })
}

pub fn ranking(
    conn: &Connection,
    range: StatsRange,
    month: Option<&str>,
    kind: RankingKind,
    sort: RankingSort,
    limit: Option<usize>,
    offset: usize,
) -> Result<StatsRanking> {
    let (from, to) = bounds(range, month);
    let limit = limit.unwrap_or(PAGE_SIZE).clamp(1, MAX_PAGE_SIZE);
    let order_by = sort.order_by(kind);

    let mut ranking = StatsRanking {
        kind,
        tracks: Vec::new(),
        channels: Vec::new(),
        playlists: Vec::new(),
        total: repo::ranked_total(conn, &from, &to, kind)?,
        offset: offset as i64,
    };

    match kind {
        RankingKind::Tracks => {
            ranking.tracks = repo::tracks_ranked(conn, &from, &to, &order_by, limit, offset)?
        }
        RankingKind::Channels => {
            ranking.channels = repo::channels_ranked(conn, &from, &to, &order_by, limit, offset)?
        }
        RankingKind::Playlists => {
            ranking.playlists = repo::playlists_ranked(conn, &from, &to, &order_by, limit, offset)?
        }
    }

    Ok(ranking)
}

pub fn clear(conn: &Connection) -> Result<usize> {
    repo::clear(conn)
}
