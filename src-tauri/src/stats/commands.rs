use tauri::State;

use super::{
    DetailTarget, PlayRecord, RankingKind, RankingSort, StatsDetail, StatsOverview, StatsPatterns,
    StatsRange, StatsRanking,
};
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
#[allow(clippy::too_many_arguments)]
pub fn stats_ranking(
    state: State<AppState>,
    range: StatsRange,
    month: Option<String>,
    kind: RankingKind,
    sort: RankingSort,
    limit: Option<usize>,
    offset: usize,
) -> Result<StatsRanking, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    super::ranking(&conn, range, month.as_deref(), kind, sort, limit, offset)
        .inspect_err(|e| log::error!("failed to read a statistics ranking: {e:#}"))
        .map_err(|e| format!("{e:#}"))
}

#[tauri::command]
pub fn stats_detail(
    state: State<AppState>,
    range: StatsRange,
    month: Option<String>,
    target: DetailTarget,
) -> Result<StatsDetail, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    super::detail(&conn, range, month.as_deref(), &target)
        .inspect_err(|e| log::error!("failed to read item statistics: {e:#}"))
        .map_err(|e| format!("{e:#}"))
}

#[tauri::command]
pub fn stats_patterns(
    state: State<AppState>,
    range: StatsRange,
    month: Option<String>,
) -> Result<StatsPatterns, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    super::patterns(&conn, range, month.as_deref())
        .inspect_err(|e| log::error!("failed to read listening patterns: {e:#}"))
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
