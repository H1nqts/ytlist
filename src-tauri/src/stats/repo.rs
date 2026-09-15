use anyhow::Result;
use rusqlite::{params, Connection, Row};

use super::{ChannelStat, DailyStat, PlayRecord, PlaylistStat, StatsSummary, TrackStat};

/// Videos scraped without a channel id carry an empty string, not NULL.
const CHANNEL_KEY: &str = "COALESCE(NULLIF(h.channel_id, ''), h.channel_name)";

fn row_to_track(row: &Row) -> rusqlite::Result<TrackStat> {
    Ok(TrackStat {
        video_id: row.get("video_id")?,
        title: row.get("title")?,
        channel_name: row.get("channel_name")?,
        thumbnail: row.get("thumbnail")?,
        play_count: row.get("play_count")?,
        completed_count: row.get("completed_count")?,
        listened_ms: row.get("listened_ms")?,
    })
}

fn row_to_channel(row: &Row) -> rusqlite::Result<ChannelStat> {
    Ok(ChannelStat {
        channel_id: row.get("channel_id")?,
        channel_name: row.get("channel_name")?,
        icon: row.get("icon")?,
        play_count: row.get("play_count")?,
        listened_ms: row.get("listened_ms")?,
    })
}

fn row_to_daily(row: &Row) -> rusqlite::Result<DailyStat> {
    Ok(DailyStat {
        date: row.get("date")?,
        play_count: row.get("play_count")?,
        listened_ms: row.get("listened_ms")?,
    })
}

fn row_to_playlist(row: &Row) -> rusqlite::Result<PlaylistStat> {
    Ok(PlaylistStat {
        playlist_id: row.get("playlist_id")?,
        name: row.get("name")?,
        present: row.get::<_, i64>("present")? != 0,
        play_count: row.get("play_count")?,
        listened_ms: row.get("listened_ms")?,
    })
}

pub fn insert(
    conn: &Connection,
    play: &PlayRecord,
    local_date: &str,
    local_month: &str,
) -> Result<()> {
    conn.execute(
        "INSERT INTO play_history (
            video_id, title, channel_id, channel_name,
            playlist_id, playlist_name,
            started_at, local_date, local_month,
            listened_ms, duration_ms, completed
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        params![
            play.video_id,
            play.title,
            play.channel_id,
            play.channel_name,
            play.playlist_id,
            play.playlist_name,
            play.started_at,
            local_date,
            local_month,
            play.listened_ms,
            play.duration_ms,
            play.completed as i64,
        ],
    )?;

    Ok(())
}

pub fn summary(conn: &Connection, from: &str, to: &str) -> Result<StatsSummary> {
    let summary = conn.query_row(
        &format!(
            "SELECT COUNT(*) AS play_count,
                    COALESCE(SUM(h.completed), 0) AS completed_count,
                    COALESCE(SUM(h.listened_ms), 0) AS listened_ms,
                    COUNT(DISTINCT h.video_id) AS unique_tracks,
                    COUNT(DISTINCT {CHANNEL_KEY}) AS unique_channels,
                    COUNT(DISTINCT h.local_date) AS active_days
             FROM play_history h
             WHERE h.local_date BETWEEN ?1 AND ?2"
        ),
        params![from, to],
        |row| {
            Ok(StatsSummary {
                play_count: row.get("play_count")?,
                completed_count: row.get("completed_count")?,
                listened_ms: row.get("listened_ms")?,
                unique_tracks: row.get("unique_tracks")?,
                unique_channels: row.get("unique_channels")?,
                active_days: row.get("active_days")?,
            })
        },
    )?;

    Ok(summary)
}

pub fn top_tracks(
    conn: &Connection,
    from: &str,
    to: &str,
    limit: usize,
) -> Result<Vec<TrackStat>> {
    // Not by play_count: a track skipped after a few seconds would outrank one
    // that was played through.
    let mut stmt = conn.prepare(
        "SELECT h.video_id AS video_id,
                COALESCE(v.title, MAX(h.title)) AS title,
                COALESCE(c.name, MAX(h.channel_name)) AS channel_name,
                v.thumbnail AS thumbnail,
                COUNT(*) AS play_count,
                SUM(h.completed) AS completed_count,
                SUM(h.listened_ms) AS listened_ms
         FROM play_history h
         LEFT JOIN videos v ON v.id = h.video_id
         LEFT JOIN channels c ON c.id = v.channel_id
         WHERE h.local_date BETWEEN ?1 AND ?2
         GROUP BY h.video_id
         ORDER BY listened_ms DESC, play_count DESC
         LIMIT ?3",
    )?;
    let rows = stmt.query_map(params![from, to, limit as i64], row_to_track)?;

    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

pub fn top_channels(
    conn: &Connection,
    from: &str,
    to: &str,
    limit: usize,
) -> Result<Vec<ChannelStat>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT NULLIF(h.channel_id, '') AS channel_id,
                COALESCE(MAX(c.name), MAX(h.channel_name)) AS channel_name,
                MAX(c.icon) AS icon,
                COUNT(*) AS play_count,
                SUM(h.listened_ms) AS listened_ms
         FROM play_history h
         LEFT JOIN channels c ON c.id = NULLIF(h.channel_id, '')
         WHERE h.local_date BETWEEN ?1 AND ?2
         GROUP BY {CHANNEL_KEY}
         ORDER BY listened_ms DESC, play_count DESC
         LIMIT ?3"
    ))?;
    let rows = stmt.query_map(params![from, to, limit as i64], row_to_channel)?;

    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

pub fn daily(conn: &Connection, from: &str, to: &str) -> Result<Vec<DailyStat>> {
    let mut stmt = conn.prepare(
        "SELECT h.local_date AS date,
                COUNT(*) AS play_count,
                SUM(h.listened_ms) AS listened_ms
         FROM play_history h
         WHERE h.local_date BETWEEN ?1 AND ?2
         GROUP BY h.local_date
         ORDER BY h.local_date",
    )?;
    let rows = stmt.query_map(params![from, to], row_to_daily)?;

    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

pub fn playlists(conn: &Connection, from: &str, to: &str) -> Result<Vec<PlaylistStat>> {
    // Plays made outside a playlist share the NULL group.
    let mut stmt = conn.prepare(
        "SELECT h.playlist_id AS playlist_id,
                COALESCE(MAX(p.name), MAX(h.playlist_name), 'Outside a playlist') AS name,
                MAX(p.id IS NOT NULL) AS present,
                COUNT(*) AS play_count,
                SUM(h.listened_ms) AS listened_ms
         FROM play_history h
         LEFT JOIN playlists p ON p.id = h.playlist_id
         WHERE h.local_date BETWEEN ?1 AND ?2
         GROUP BY h.playlist_id
         ORDER BY listened_ms DESC",
    )?;
    let rows = stmt.query_map(params![from, to], row_to_playlist)?;

    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

pub fn available_months(conn: &Connection) -> Result<Vec<String>> {
    let mut stmt = conn.prepare(
        "SELECT DISTINCT local_month FROM play_history ORDER BY local_month DESC",
    )?;
    let rows = stmt.query_map([], |row| row.get(0))?;

    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

pub fn clear(conn: &Connection) -> Result<usize> {
    let removed = conn.execute("DELETE FROM play_history", [])?;
    if let Err(e) = conn.execute_batch("VACUUM") {
        log::warn!("failed to vacuum after clearing play history: {e}");
    }

    Ok(removed)
}
