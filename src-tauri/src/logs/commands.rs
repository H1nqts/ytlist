use tauri::AppHandle;

#[tauri::command]
pub fn log_dir_get(app: AppHandle) -> Result<String, String> {
    super::dir(&app)
        .map(|dir| dir.to_string_lossy().into_owned())
        .map_err(|e| format!("{e:#}"))
}
