use tauri::State;

use super::{Settings, SettingsPatch};
use crate::state::AppState;

#[tauri::command]
pub fn settings_get(state: State<AppState>) -> Result<Settings, String> {
    super::get(&state.settings).map_err(|e| format!("{e:#}"))
}

#[tauri::command]
pub fn settings_update(
    state: State<AppState>,
    patch: SettingsPatch,
) -> Result<Settings, String> {
    super::update(&state.settings, patch).map_err(|e| format!("{e:#}"))
}
