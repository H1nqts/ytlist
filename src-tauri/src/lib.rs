mod commands;
mod db;
mod playlist;
mod state;
mod video;

use state::AppState;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let conn = db::init(app.handle())?;
            app.manage(AppState {
                db: Mutex::new(conn),
            });
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(commands::COMMAND_HANDLERS)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
