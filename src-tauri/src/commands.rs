use crate::{playlist, settings, ytdlp};

pub const COMMAND_HANDLERS: fn(tauri::ipc::Invoke) -> bool = tauri::generate_handler![
    playlist::commands::playlist_add,
    playlist::commands::playlist_rename,
    playlist::commands::playlist_delete,
    playlist::commands::playlist_get_all,
    playlist::commands::playlist_fetch_videos,
    settings::commands::settings_get,
    settings::commands::settings_update,
    ytdlp::commands::ytdlp_status,
    ytdlp::commands::ytdlp_retry,
    ytdlp::commands::stream_resolve,
];
