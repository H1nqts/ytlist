use tauri::State;
use url::Url;

use super::Playlist;
use crate::{
    state::AppState,
    video::{fetch_for_playlist, PlaylistVideos},
};

const ALLOWED_HOSTS: [&str; 6] = [
    "www.youtube.com",
    "youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "youtu.be",
    "www.youtu.be",
];

fn extract_list_id(url: &str) -> Result<String, String> {
    let parsed = Url::parse(url).map_err(|e| e.to_string())?;

    if parsed.scheme() != "https" {
        return Err(format!("Unsupported scheme: {}", parsed.scheme()));
    }

    let host = parsed.host_str().ok_or("URL has no host")?;
    if !ALLOWED_HOSTS.contains(&host) {
        return Err(format!("Unsupported host: {host}"));
    }

    parsed
        .query_pairs()
        .find(|(key, _)| key == "list")
        .map(|(_, value)| value.into_owned())
        .ok_or_else(|| "URL is missing the `list` query parameter".to_string())
}

#[tauri::command]
pub async fn playlist_add(state: State<'_, AppState>, url: String) -> Result<Playlist, String> {
    let list_id = extract_list_id(&url)?;
    let playlist = super::fetch(&list_id)
        .await
        .inspect_err(|e| log::error!("failed to fetch playlist {list_id}: {e:#}"))
        .map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let saved = super::save(&conn, &playlist)
        .inspect_err(|e| log::error!("failed to save playlist {list_id}: {e:#}"))
        .map_err(|e| e.to_string())?;

    log::info!("added playlist {} ({})", saved.id, saved.name);

    Ok(saved)
}

#[tauri::command]
pub fn playlist_rename(state: State<AppState>, id: i64, name: &str) -> Result<Playlist, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    super::rename(&conn, id, name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn playlist_delete(state: State<AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let name = super::delete(&conn, id)
        .inspect_err(|e| log::error!("failed to delete playlist {id}: {e:#}"))
        .map_err(|e| e.to_string())?;

    log::info!("deleted playlist {id} ({name})");

    Ok(())
}

#[tauri::command]
pub fn playlist_get_all(state: State<AppState>) -> Result<Vec<Playlist>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    super::list(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn playlist_fetch_videos(
    state: State<'_, AppState>,
    id: i64,
) -> Result<PlaylistVideos, String> {
    let list_id = {
        let conn = state.db.lock().map_err(|e| e.to_string())?;
        let playlist = super::get_by_id(&conn, id).map_err(|e| e.to_string())?;
        extract_list_id(&playlist.url)?
    };
    fetch_for_playlist(list_id)
        .await
        .inspect_err(|e| log::error!("failed to fetch videos for playlist {id}: {e:#}"))
        .map_err(|e| e.to_string())
}
