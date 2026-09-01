use tauri::State;

use super::Status;
use crate::state::AppState;

#[tauri::command]
pub fn ytdlp_status(state: State<AppState>) -> Status {
    state.ytdlp.status()
}

#[tauri::command]
pub async fn ytdlp_retry(state: State<'_, AppState>) -> Result<Status, String> {
    Ok(state.ytdlp.retry().await)
}
