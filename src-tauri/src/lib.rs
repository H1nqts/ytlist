mod commands;
mod db;
mod logs;
mod playback;
mod playlist;
mod settings;
mod state;
mod video;
mod ytdlp;

use state::AppState;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{Emitter as _, Manager, WindowEvent};

const FLUSH_EVENT: &str = "app://flush";

const FLUSH_TIMEOUT: std::time::Duration = std::time::Duration::from_millis(2000);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(logs::plugin())
        .setup(|app| {
            log::info!("starting ytlist {}", app.package_info().version);

            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;

            let conn = db::init(app.handle())?;
            let settings = settings::init(app.handle())?;
            let playback = playback::init(app.handle())?;
            let ytdlp = Arc::new(ytdlp::Manager::new(app.handle())?);
            app.manage(AppState {
                db: Mutex::new(conn),
                ytdlp: ytdlp.clone(),
                settings,
                playback,
                closing: AtomicBool::new(false),
            });

            tauri::async_runtime::spawn(async move {
                let _ = ytdlp.ensure().await;
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            let WindowEvent::CloseRequested { api, .. } = event else {
                return;
            };

            // Let the webview save first, but only once: the close it asks for
            // afterwards has to go through.
            if window.state::<AppState>().closing.swap(true, Ordering::SeqCst) {
                return;
            }
            if window.emit(FLUSH_EVENT, ()).is_err() {
                return;
            }
            api.prevent_close();

            let window = window.clone();
            std::thread::spawn(move || {
                std::thread::sleep(FLUSH_TIMEOUT);
                let _ = window.close();
            });
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(commands::COMMAND_HANDLERS)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
