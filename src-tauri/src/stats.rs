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
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ChannelStat {
    pub channel_id: Option<String>,
    pub channel_name: String,
    pub icon: Option<String>,
    pub play_count: i64,
    pub listened_ms: i64,
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
    pub listened_ms: i64,
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

pub fn clear(conn: &Connection) -> Result<usize> {
    repo::clear(conn)
}
