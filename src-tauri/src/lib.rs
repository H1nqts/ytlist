mod commands;
mod db;
mod playlist;
mod state;
mod video;
mod ytdlp;

use state::AppState;
use std::sync::{Arc, Mutex};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let conn = db::init(app.handle())?;
            let ytdlp = Arc::new(ytdlp::Manager::new(app.handle())?);
            app.manage(AppState {
                db: Mutex::new(conn),
                ytdlp: ytdlp.clone(),
            });

            tauri::async_runtime::spawn(async move {
                let _ = ytdlp.ensure().await;
            });

            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(commands::COMMAND_HANDLERS)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
