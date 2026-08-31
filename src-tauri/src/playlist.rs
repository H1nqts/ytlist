pub mod commands;
mod repo;

use anyhow::Result;
use chrono::Local;
use rusqlite::Connection;
use rusty_ytdl::search::{self, PlaylistSearchOptions};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct Playlist {
    pub id: i64,
    pub name: String,
    pub url: String,
    pub channel_name: String,
    pub thumbnail_url: String,
    pub views: i64,
    pub last_updated_at: Option<String>,
    pub last_synced_at: String,
}

pub async fn fetch(list_id: &str) -> Result<Playlist> {
    let opts = PlaylistSearchOptions {
        limit: 0,
        fetch_all: false,
        ..Default::default()
    };
    let mut playlist = search::Playlist::get(list_id, Some(&opts)).await?;
    playlist.fetch(None).await;

    Ok(Playlist {
        id: 0,
        name: playlist.name,
        url: playlist.url,
        channel_name: playlist.channel.name,
        thumbnail_url: playlist
            .thumbnails
            .first()
            .map(|t| t.url.clone())
            .unwrap_or_default(),
        views: playlist.views as i64,
        last_updated_at: playlist.last_update,
        last_synced_at: Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
    })
}

pub fn get_by_id(conn: &Connection, id: i64) -> Result<Playlist> {
    repo::get_by_id(conn, id)
}

pub fn save(conn: &Connection, playlist: &Playlist) -> Result<Playlist> {
    let id = repo::create(conn, playlist)?;
    repo::get_by_id(conn, id)
}

pub fn rename(conn: &Connection, id: i64, name: &str) -> Result<Playlist> {
    repo::rename(conn, id, name)
}

pub fn delete(conn: &Connection, id: i64) -> Result<()> {
    repo::delete(conn, id)
}

pub fn list(conn: &Connection) -> Result<Vec<Playlist>> {
    repo::list(conn)
}
