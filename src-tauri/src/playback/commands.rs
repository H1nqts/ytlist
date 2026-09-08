use tauri::State;

use super::Playback;
use crate::state::AppState;

#[tauri::command]
pub fn playback_get(state: State<AppState>) -> Result<Playback, String> {
    super::get(&state.playback).map_err(|e| format!("{e:#}"))
}

#[tauri::command]
pub fn playback_set(state: State<AppState>, playback: Playback) -> Result<(), String> {
    super::set(&state.playback, playback).map_err(|e| format!("{e:#}"))
}
