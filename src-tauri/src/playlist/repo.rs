use anyhow::Result;
use rusqlite::{params, Connection, Row};
use serde_rusqlite::to_params_named_with_fields;

use super::Playlist;

const FIELDS: [&str; 8] = [
    "id",
    "name",
    "url",
    "channel_name",
    "thumbnail_url",
    "views",
    "last_updated_at",
    "last_synced_at",
];

fn row_to_playlist(row: &Row) -> rusqlite::Result<Playlist> {
    Ok(Playlist {
        id: row.get("id")?,
        name: row.get("name")?,
        url: row.get("url")?,
        channel_name: row.get("channel_name")?,
        thumbnail_url: row.get("thumbnail_url")?,
        views: row.get("views")?,
        last_updated_at: row.get("last_updated_at")?,
        last_synced_at: row.get("last_synced_at")?,
    })
}

pub fn list(conn: &Connection) -> Result<Vec<Playlist>> {
    let mut stmt = conn.prepare("SELECT * FROM playlists ORDER BY id DESC")?;
    let rows = stmt.query_map([], row_to_playlist)?;
    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

pub fn get_by_id(conn: &Connection, id: i64) -> Result<Playlist> {
    let res = conn.query_row(
        "SELECT * FROM playlists WHERE id = ?1",
        [id],
        row_to_playlist,
    )?;
    Ok(res)
}

pub fn create(conn: &Connection, playlist: &Playlist) -> Result<i64> {
    conn.execute(
        "INSERT INTO
            playlists (name, url, channel_name, thumbnail_url, views, last_updated_at, last_synced_at)
            VALUES (:name, :url, :channel_name, :thumbnail_url, :views, :last_updated_at, :last_synced_at)",
        to_params_named_with_fields(playlist, &FIELDS[1..])?
            .to_slice()
            .as_slice(),
    )?;

    Ok(conn.last_insert_rowid())
}

pub fn rename(conn: &Connection, id: i64, name: &str) -> Result<Playlist> {
    let res = conn.query_row(
        "UPDATE playlists SET name = ?1 WHERE id = ?2 RETURNING *",
        params![name, id],
        row_to_playlist,
    )?;
    Ok(res)
}

pub fn delete(conn: &Connection, id: i64) -> Result<()> {
    conn.execute("DELETE FROM playlists WHERE id = ?1", [id])?;
    Ok(())
}
