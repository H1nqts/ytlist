use tauri::State;

use super::{Status, StreamInfo};
use crate::state::AppState;

#[tauri::command]
pub fn ytdlp_status(state: State<AppState>) -> Status {
    state.ytdlp.status()
}

#[tauri::command]
pub async fn ytdlp_retry(state: State<'_, AppState>) -> Result<Status, String> {
    Ok(state.ytdlp.retry().await)
}

#[tauri::command]
pub async fn stream_resolve(
    state: State<'_, AppState>,
    video_id: String,
) -> Result<StreamInfo, String> {
    state
        .ytdlp
        .resolve_stream(&video_id)
        .await
        .map_err(|e| e.to_string())
}
