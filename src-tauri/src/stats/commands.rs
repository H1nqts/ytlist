use tauri::State;

use super::{PlayRecord, StatsOverview, StatsRange};
use crate::state::AppState;

#[tauri::command]
pub fn stats_record(state: State<AppState>, record: PlayRecord) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    super::record(&conn, &record)
        .inspect_err(|e| log::error!("failed to record a play of {}: {e:#}", record.video_id))
        .map_err(|e| format!("{e:#}"))
}

#[tauri::command]
pub fn stats_overview(
    state: State<AppState>,
    range: StatsRange,
    month: Option<String>,
) -> Result<StatsOverview, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    super::overview(&conn, range, month.as_deref())
        .inspect_err(|e| log::error!("failed to read play statistics: {e:#}"))
        .map_err(|e| format!("{e:#}"))
}

#[tauri::command]
pub fn stats_clear(state: State<AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let removed = super::clear(&conn)
        .inspect_err(|e| log::error!("failed to clear play statistics: {e:#}"))
        .map_err(|e| format!("{e:#}"))?;

    log::info!("cleared {removed} play history rows");

    Ok(())
}
