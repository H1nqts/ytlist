use tauri::State;

use super::{repo, Video};
use crate::state::AppState;

#[tauri::command]
pub fn video_get_by_ids(state: State<AppState>, ids: Vec<String>) -> Result<Vec<Video>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    repo::get_by_ids(&conn, &ids)
        .inspect_err(|e| log::error!("failed to read {} videos: {e:#}", ids.len()))
        .map_err(|e| e.to_string())
}
