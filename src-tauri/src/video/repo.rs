use anyhow::Result;
use rusqlite::{params, Connection};

use super::{Channel, PlaylistVideos};

fn strip_query(url: &str) -> &str {
    url.split_once('?').map_or(url, |(base, _)| base)
}

fn channel_key(channel: &Channel) -> Option<&str> {
    (!channel.id.is_empty()).then_some(channel.id.as_str())
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
