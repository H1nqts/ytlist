use anyhow::Result;
use rusqlite::{params, params_from_iter, Connection, OptionalExtension, Row, ToSql};

use super::{
    ChannelStat, DailyStat, DetailTarget, HourStat, PlayRecord, PlaylistStat, RankingKind,
    StatsSummary, TrackStat, WeekdayStat,
};

/// Plays of a video missing from `videos` share the NULL group.
const CHANNEL_KEY: &str = "h.channel_id";

/// `COUNT(DISTINCT)` skips NULL, so the NULL group needs a stand-in to be counted.
const CHANNEL_COUNT_KEY: &str = "COALESCE(h.channel_id, '')";

pub const NO_PLAYLIST_NAME: &str = "Outside a playlist";

pub const NO_CHANNEL_NAME: &str = "Unknown channel";

const DEFAULT_ORDER: &str = "listened_ms DESC, play_count DESC";

fn row_to_track(row: &Row) -> rusqlite::Result<TrackStat> {
    Ok(TrackStat {
        video_id: row.get("video_id")?,
        title: row.get("title")?,
        channel_name: row.get("channel_name")?,
        thumbnail: row.get("thumbnail")?,
        play_count: row.get("play_count")?,
        completed_count: row.get("completed_count")?,
        listened_ms: row.get("listened_ms")?,
        last_played_at: row.get("last_played_at")?,
    })
}

fn row_to_channel(row: &Row) -> rusqlite::Result<ChannelStat> {
    Ok(ChannelStat {
        channel_id: row.get("channel_id")?,
        channel_name: row.get("channel_name")?,
        icon: row.get("icon")?,
        play_count: row.get("play_count")?,
        completed_count: row.get("completed_count")?,
        listened_ms: row.get("listened_ms")?,
        last_played_at: row.get("last_played_at")?,
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
        completed_count: row.get("completed_count")?,
        listened_ms: row.get("listened_ms")?,
        last_played_at: row.get("last_played_at")?,
    })
}

pub fn insert(
    conn: &Connection,
    play: &PlayRecord,
    local_date: &str,
    local_month: &str,
    local_hour: i64,
    local_weekday: i64,
) -> Result<()> {
    // The player has no channel id to send, so take it from the stored video.
    conn.execute(
        "INSERT INTO play_history (
            video_id, title, channel_id, channel_name,
            playlist_id, playlist_name,
            started_at, local_date, local_month, local_hour, local_weekday,
            listened_ms, duration_ms, completed
         ) VALUES (
            ?1, ?2, (SELECT channel_id FROM videos WHERE id = ?1), ?3,
            ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13
         )",
        params![
            play.video_id,
            play.title,
            play.channel_name,
            play.playlist_id,
            play.playlist_name,
            play.started_at,
            local_date,
            local_month,
            local_hour,
            local_weekday,
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
                    COUNT(DISTINCT {CHANNEL_COUNT_KEY}) AS unique_channels,
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
    tracks_ranked(conn, from, to, DEFAULT_ORDER, limit, 0)
}

pub fn top_channels(
    conn: &Connection,
    from: &str,
    to: &str,
    limit: usize,
) -> Result<Vec<ChannelStat>> {
    channels_ranked(conn, from, to, DEFAULT_ORDER, limit, 0)
}

pub fn tracks_ranked(
    conn: &Connection,
    from: &str,
    to: &str,
    order_by: &str,
    limit: usize,
    offset: usize,
) -> Result<Vec<TrackStat>> {
    // Not by play_count: a track skipped after a few seconds would outrank one
    // that was played through.
    let mut stmt = conn.prepare(&format!(
        "SELECT h.video_id AS video_id,
                COALESCE(v.title, MAX(h.title)) AS title,
                COALESCE(c.name, MAX(h.channel_name)) AS channel_name,
                v.thumbnail AS thumbnail,
                COUNT(*) AS play_count,
                SUM(h.completed) AS completed_count,
                SUM(h.listened_ms) AS listened_ms,
                MAX(h.started_at) AS last_played_at
         FROM play_history h
         LEFT JOIN videos v ON v.id = h.video_id
         LEFT JOIN channels c ON c.id = v.channel_id
         WHERE h.local_date BETWEEN ?1 AND ?2
         GROUP BY h.video_id
         ORDER BY {order_by}
         LIMIT ?3 OFFSET ?4"
    ))?;
    let rows = stmt.query_map(
        params![from, to, limit as i64, offset as i64],
        row_to_track,
    )?;

    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

pub fn channels_ranked(
    conn: &Connection,
    from: &str,
    to: &str,
    order_by: &str,
    limit: usize,
    offset: usize,
) -> Result<Vec<ChannelStat>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT h.channel_id AS channel_id,
                h.channel_id AS channel_key,
                CASE WHEN h.channel_id IS NULL THEN '{NO_CHANNEL_NAME}'
                     ELSE COALESCE(MAX(c.name), MAX(h.channel_name)) END AS channel_name,
                MAX(c.icon) AS icon,
                COUNT(*) AS play_count,
                SUM(h.completed) AS completed_count,
                SUM(h.listened_ms) AS listened_ms,
                MAX(h.started_at) AS last_played_at
         FROM play_history h
         LEFT JOIN channels c ON c.id = h.channel_id
         WHERE h.local_date BETWEEN ?1 AND ?2
         GROUP BY h.channel_id
         ORDER BY {order_by}
         LIMIT ?3 OFFSET ?4"
    ))?;
    let rows = stmt.query_map(
        params![from, to, limit as i64, offset as i64],
        row_to_channel,
    )?;

    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

pub fn hours(conn: &Connection, from: &str, to: &str) -> Result<Vec<HourStat>> {
    let mut stmt = conn.prepare(
        "SELECT h.local_hour AS hour,
                COUNT(*) AS play_count,
                SUM(h.listened_ms) AS listened_ms
         FROM play_history h
         WHERE h.local_date BETWEEN ?1 AND ?2 AND h.local_hour IS NOT NULL
         GROUP BY h.local_hour
         ORDER BY h.local_hour",
    )?;
    let rows = stmt.query_map(params![from, to], |row| {
        Ok(HourStat {
            hour: row.get("hour")?,
            play_count: row.get("play_count")?,
            listened_ms: row.get("listened_ms")?,
        })
    })?;

    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

pub fn weekdays(conn: &Connection, from: &str, to: &str) -> Result<Vec<WeekdayStat>> {
    let mut stmt = conn.prepare(
        "SELECT h.local_weekday AS weekday,
                COUNT(*) AS play_count,
                SUM(h.listened_ms) AS listened_ms
         FROM play_history h
         WHERE h.local_date BETWEEN ?1 AND ?2 AND h.local_weekday IS NOT NULL
         GROUP BY h.local_weekday
         ORDER BY h.local_weekday",
    )?;
    let rows = stmt.query_map(params![from, to], |row| {
        Ok(WeekdayStat {
            weekday: row.get("weekday")?,
            play_count: row.get("play_count")?,
            listened_ms: row.get("listened_ms")?,
        })
    })?;

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
    let mut stmt = conn.prepare(&format!(
        "{}
         ORDER BY listened_ms DESC",
        playlists_select()
    ))?;
    let rows = stmt.query_map(params![from, to], row_to_playlist)?;

    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

pub fn playlists_ranked(
    conn: &Connection,
    from: &str,
    to: &str,
    order_by: &str,
    limit: usize,
    offset: usize,
) -> Result<Vec<PlaylistStat>> {
    let mut stmt = conn.prepare(&format!(
        "{}
         ORDER BY {order_by}
         LIMIT ?3 OFFSET ?4",
        playlists_select()
    ))?;
    let rows = stmt.query_map(
        params![from, to, limit as i64, offset as i64],
        row_to_playlist,
    )?;

    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

fn playlists_select() -> String {
    format!(
        "SELECT h.playlist_id AS playlist_id,
                COALESCE(MAX(p.name), MAX(h.playlist_name), '{NO_PLAYLIST_NAME}') AS name,
                MAX(p.id IS NOT NULL) AS present,
                COUNT(*) AS play_count,
                SUM(h.completed) AS completed_count,
                SUM(h.listened_ms) AS listened_ms,
                MAX(h.started_at) AS last_played_at
         FROM play_history h
         LEFT JOIN playlists p ON p.id = h.playlist_id
         WHERE h.local_date BETWEEN ?1 AND ?2
         GROUP BY h.playlist_id"
    )
}

pub struct DetailIdentity {
    pub title: String,
    pub subtitle: Option<String>,
    pub image: Option<String>,
    pub present: bool,
    pub duration_ms: Option<i64>,
}

/// A `WHERE` fragment starting at `?3`, with the values to bind after `from` and `to`.
fn detail_filter(target: &DetailTarget) -> (String, Vec<Box<dyn ToSql>>) {
    match target {
        DetailTarget::Track { video_id } => (
            "h.video_id = ?3".to_string(),
            vec![Box::new(video_id.clone())],
        ),
        DetailTarget::Channel { channel_id } => match channel_id {
            Some(id) => (
                "h.channel_id = ?3".to_string(),
                vec![Box::new(id.clone())],
            ),
            None => ("h.channel_id IS NULL".to_string(), Vec::new()),
        },
        DetailTarget::Playlist { playlist_id } => match playlist_id {
            Some(id) => ("h.playlist_id = ?3".to_string(), vec![Box::new(*id)]),
            None => ("h.playlist_id IS NULL".to_string(), Vec::new()),
        },
    }
}

fn detail_params<'a>(
    from: &'a dyn ToSql,
    to: &'a dyn ToSql,
    extra: &'a [Box<dyn ToSql>],
) -> Vec<&'a dyn ToSql> {
    let mut all: Vec<&dyn ToSql> = vec![from, to];
    all.extend(extra.iter().map(|value| value.as_ref()));
    all
}

pub fn detail_summary(
    conn: &Connection,
    from: &str,
    to: &str,
    target: &DetailTarget,
) -> Result<StatsSummary> {
    let (filter, extra) = detail_filter(target);

    let summary = conn.query_row(
        &format!(
            "SELECT COUNT(*) AS play_count,
                    COALESCE(SUM(h.completed), 0) AS completed_count,
                    COALESCE(SUM(h.listened_ms), 0) AS listened_ms,
                    COUNT(DISTINCT h.video_id) AS unique_tracks,
                    COUNT(DISTINCT {CHANNEL_COUNT_KEY}) AS unique_channels,
                    COUNT(DISTINCT h.local_date) AS active_days
             FROM play_history h
             WHERE h.local_date BETWEEN ?1 AND ?2 AND {filter}"
        ),
        params_from_iter(detail_params(&from, &to, &extra)),
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

pub fn detail_daily(
    conn: &Connection,
    from: &str,
    to: &str,
    target: &DetailTarget,
) -> Result<Vec<DailyStat>> {
    let (filter, extra) = detail_filter(target);

    let mut stmt = conn.prepare(&format!(
        "SELECT h.local_date AS date,
                COUNT(*) AS play_count,
                SUM(h.listened_ms) AS listened_ms
         FROM play_history h
         WHERE h.local_date BETWEEN ?1 AND ?2 AND {filter}
         GROUP BY h.local_date
         ORDER BY h.local_date"
    ))?;
    let rows = stmt.query_map(
        params_from_iter(detail_params(&from, &to, &extra)),
        row_to_daily,
    )?;

    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

pub fn detail_bounds(
    conn: &Connection,
    target: &DetailTarget,
) -> Result<(Option<String>, Option<String>)> {
    let (filter, extra) = detail_filter(target);
    let filter = filter.replace("?3", "?1");
    let params: Vec<&dyn ToSql> = extra.iter().map(|value| value.as_ref()).collect();

    let bounds = conn.query_row(
        &format!(
            "SELECT MIN(h.started_at) AS first_played_at,
                    MAX(h.started_at) AS last_played_at
             FROM play_history h
             WHERE {filter}"
        ),
        params_from_iter(params),
        |row| Ok((row.get("first_played_at")?, row.get("last_played_at")?)),
    )?;

    Ok(bounds)
}

pub fn detail_top_tracks(
    conn: &Connection,
    from: &str,
    to: &str,
    target: &DetailTarget,
    limit: usize,
) -> Result<Vec<TrackStat>> {
    let (filter, extra) = detail_filter(target);
    let limit = limit as i64;
    let mut params = detail_params(&from, &to, &extra);
    params.push(&limit);

    let mut stmt = conn.prepare(&format!(
        "SELECT h.video_id AS video_id,
                COALESCE(v.title, MAX(h.title)) AS title,
                COALESCE(c.name, MAX(h.channel_name)) AS channel_name,
                v.thumbnail AS thumbnail,
                COUNT(*) AS play_count,
                SUM(h.completed) AS completed_count,
                SUM(h.listened_ms) AS listened_ms,
                MAX(h.started_at) AS last_played_at
         FROM play_history h
         LEFT JOIN videos v ON v.id = h.video_id
         LEFT JOIN channels c ON c.id = v.channel_id
         WHERE h.local_date BETWEEN ?1 AND ?2 AND {filter}
         GROUP BY h.video_id
         ORDER BY {DEFAULT_ORDER}
         LIMIT ?{}",
        params.len()
    ))?;
    let rows = stmt.query_map(params_from_iter(params), row_to_track)?;

    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

pub fn detail_identity(conn: &Connection, target: &DetailTarget) -> Result<DetailIdentity> {
    match target {
        DetailTarget::Track { video_id } => track_identity(conn, video_id),
        DetailTarget::Channel { channel_id } => {
            channel_identity(conn, channel_id.as_deref())
        }
        DetailTarget::Playlist { playlist_id } => playlist_identity(conn, *playlist_id),
    }
}

fn track_identity(conn: &Connection, video_id: &str) -> Result<DetailIdentity> {
    let live = conn
        .query_row(
            "SELECT v.title AS title,
                    COALESCE(c.name, '') AS channel_name,
                    v.thumbnail AS thumbnail,
                    v.duration AS duration
             FROM videos v
             LEFT JOIN channels c ON c.id = v.channel_id
             WHERE v.id = ?1",
            params![video_id],
            |row| {
                Ok(DetailIdentity {
                    title: row.get("title")?,
                    subtitle: row.get::<_, String>("channel_name").map(|name| {
                        if name.is_empty() {
                            None
                        } else {
                            Some(name)
                        }
                    })?,
                    image: row.get("thumbnail")?,
                    present: true,
                    duration_ms: row.get("duration")?,
                })
            },
        )
        .optional()?;

    if let Some(identity) = live {
        return Ok(identity);
    }

    let historic = conn
        .query_row(
            "SELECT title, channel_name, duration_ms
             FROM play_history
             WHERE video_id = ?1
             ORDER BY started_at DESC
             LIMIT 1",
            params![video_id],
            |row| {
                Ok(DetailIdentity {
                    title: row.get("title")?,
                    subtitle: row.get("channel_name")?,
                    image: None,
                    present: false,
                    duration_ms: row.get("duration_ms")?,
                })
            },
        )
        .optional()?;

    Ok(historic.unwrap_or_else(|| DetailIdentity {
        title: video_id.to_string(),
        subtitle: None,
        image: None,
        present: false,
        duration_ms: None,
    }))
}

fn channel_identity(conn: &Connection, channel_id: Option<&str>) -> Result<DetailIdentity> {
    let Some(id) = channel_id else {
        return Ok(DetailIdentity {
            title: NO_CHANNEL_NAME.to_string(),
            subtitle: None,
            image: None,
            present: true,
            duration_ms: None,
        });
    };

    let live = conn
        .query_row(
            "SELECT name, icon FROM channels WHERE id = ?1",
            params![id],
            |row| {
                Ok(DetailIdentity {
                    title: row.get("name")?,
                    subtitle: None,
                    image: row.get("icon")?,
                    present: true,
                    duration_ms: None,
                })
            },
        )
        .optional()?;

    if let Some(identity) = live {
        return Ok(identity);
    }

    let historic: Option<String> = conn
        .query_row(
            "SELECT channel_name
             FROM play_history
             WHERE channel_id = ?1
             ORDER BY started_at DESC
             LIMIT 1",
            params![id],
            |row| row.get(0),
        )
        .optional()?;

    Ok(DetailIdentity {
        title: historic.unwrap_or_else(|| id.to_string()),
        subtitle: None,
        image: None,
        present: false,
        duration_ms: None,
    })
}

fn playlist_identity(conn: &Connection, playlist_id: Option<i64>) -> Result<DetailIdentity> {
    let Some(id) = playlist_id else {
        return Ok(DetailIdentity {
            title: NO_PLAYLIST_NAME.to_string(),
            subtitle: None,
            image: None,
            present: true,
            duration_ms: None,
        });
    };

    let live = conn
        .query_row(
            "SELECT name, thumbnail_url FROM playlists WHERE id = ?1",
            params![id],
            |row| {
                Ok(DetailIdentity {
                    title: row.get("name")?,
                    subtitle: None,
                    image: row.get("thumbnail_url")?,
                    present: true,
                    duration_ms: None,
                })
            },
        )
        .optional()?;

    if let Some(identity) = live {
        return Ok(identity);
    }

    let historic: Option<String> = conn
        .query_row(
            "SELECT playlist_name
             FROM play_history
             WHERE playlist_id = ?1 AND playlist_name IS NOT NULL
             ORDER BY started_at DESC
             LIMIT 1",
            params![id],
            |row| row.get(0),
        )
        .optional()?;

    Ok(DetailIdentity {
        title: historic.unwrap_or_else(|| NO_PLAYLIST_NAME.to_string()),
        subtitle: None,
        image: None,
        present: false,
        duration_ms: None,
    })
}

pub fn ranked_total(conn: &Connection, from: &str, to: &str, kind: RankingKind) -> Result<i64> {
    let group = match kind {
        RankingKind::Tracks => "h.video_id".to_string(),
        RankingKind::Channels => CHANNEL_KEY.to_string(),
        RankingKind::Playlists => "h.playlist_id".to_string(),
    };

    let total = conn.query_row(
        &format!(
            "SELECT COUNT(*) FROM (
                SELECT 1 FROM play_history h
                WHERE h.local_date BETWEEN ?1 AND ?2
                GROUP BY {group}
             )"
        ),
        params![from, to],
        |row| row.get(0),
    )?;

    Ok(total)
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
