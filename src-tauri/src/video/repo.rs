use anyhow::Result;
use rusqlite::{params, params_from_iter, Connection, Row};

use super::{Channel, FetchOutcome, PlaylistVideos, SkippedVideo, Video};

/// SQLite's default cap on host parameters per statement.
const MAX_PARAMS: usize = 999;

const SELECT_VIDEO: &str = "
    SELECT v.id, v.title, v.thumbnail, v.duration, v.views,
           v.channel_id, c.name AS channel_name, c.icon AS channel_icon
    FROM videos v
    LEFT JOIN channels c ON c.id = v.channel_id
";

fn strip_query(url: &str) -> &str {
    url.split_once('?').map_or(url, |(base, _)| base)
}

fn channel_key(channel: &Channel) -> Option<&str> {
    (!channel.id.is_empty()).then_some(channel.id.as_str())
}

fn row_to_video(row: &Row) -> rusqlite::Result<Video> {
    Ok(Video {
        id: row.get("id")?,
        title: row.get("title")?,
        thumbnail: row.get("thumbnail")?,
        channel: Channel {
            id: row.get::<_, Option<String>>("channel_id")?.unwrap_or_default(),
            name: row.get::<_, Option<String>>("channel_name")?.unwrap_or_default(),
            icon: row.get::<_, Option<String>>("channel_icon")?.unwrap_or_default(),
        },
        duration: row.get::<_, i64>("duration")? as u64,
        views: row.get::<_, i64>("views")? as u64,
    })
}

fn row_to_skipped(row: &Row) -> rusqlite::Result<SkippedVideo> {
    Ok(SkippedVideo {
        index: row.get::<_, i64>("entry_index")? as usize,
        video_id: row.get("video_id")?,
        reason: row.get("reason")?,
        detail: row.get("detail")?,
    })
}

pub fn save_fetched(
    conn: &mut Connection,
    playlist_id: i64,
    fetched: &PlaylistVideos,
) -> Result<()> {
    let tx = conn.transaction()?;

    tx.execute(
        "DELETE FROM playlist_videos WHERE playlist_id = ?1",
        [playlist_id],
    )?;
    tx.execute(
        "DELETE FROM playlist_skipped WHERE playlist_id = ?1",
        [playlist_id],
    )?;

    {
        let mut upsert_channel = tx.prepare(
            "INSERT INTO channels (id, name, icon) VALUES (?1, ?2, ?3)
             ON CONFLICT(id) DO UPDATE SET name = excluded.name, icon = excluded.icon",
        )?;
        let mut upsert_video = tx.prepare(
            "INSERT INTO videos (id, title, thumbnail, channel_id, duration, views)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                thumbnail = excluded.thumbnail,
                channel_id = excluded.channel_id,
                duration = excluded.duration,
                views = excluded.views",
        )?;
        let mut link = tx.prepare(
            "INSERT INTO playlist_videos (playlist_id, video_id, position) VALUES (?1, ?2, ?3)",
        )?;
        let mut skip = tx.prepare(
            "INSERT INTO playlist_skipped (playlist_id, entry_index, video_id, reason, detail)
             VALUES (?1, ?2, ?3, ?4, ?5)",
        )?;

        for (position, video) in fetched.videos.iter().enumerate() {
            let channel_id = channel_key(&video.channel);
            if let Some(id) = channel_id {
                upsert_channel.execute(params![id, video.channel.name, video.channel.icon])?;
            }

            upsert_video.execute(params![
                video.id,
                video.title,
                strip_query(&video.thumbnail),
                channel_id,
                video.duration as i64,
                video.views as i64,
            ])?;

            link.execute(params![playlist_id, video.id, position as i64])?;
        }

        for entry in &fetched.skipped {
            skip.execute(params![
                playlist_id,
                entry.index as i64,
                entry.video_id,
                entry.reason,
                entry.detail,
            ])?;
        }
    }

    tx.commit()?;

    Ok(())
}

pub fn get_for_playlist(conn: &Connection, playlist_id: i64) -> Result<PlaylistVideos> {
    let mut stmt = conn.prepare(&format!(
        "{SELECT_VIDEO}
         JOIN playlist_videos pv ON pv.video_id = v.id
         WHERE pv.playlist_id = ?1
         ORDER BY pv.position"
    ))?;
    let videos = stmt
        .query_map([playlist_id], row_to_video)?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    let mut stmt = conn.prepare(
        "SELECT entry_index, video_id, reason, detail
         FROM playlist_skipped
         WHERE playlist_id = ?1
         ORDER BY rowid",
    )?;
    let skipped = stmt
        .query_map([playlist_id], row_to_skipped)?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    Ok(PlaylistVideos {
        videos,
        skipped,
        outcome: FetchOutcome::stored(),
    })
}

pub fn get_by_ids(conn: &Connection, ids: &[String]) -> Result<Vec<Video>> {
    let mut found = Vec::with_capacity(ids.len());

    for chunk in ids.chunks(MAX_PARAMS) {
        let placeholders = vec!["?"; chunk.len()].join(",");
        let mut stmt = conn.prepare(&format!("{SELECT_VIDEO} WHERE v.id IN ({placeholders})"))?;

        for video in stmt.query_map(params_from_iter(chunk), row_to_video)? {
            found.push(video?);
        }
    }

    Ok(found)
}
