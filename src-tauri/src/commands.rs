use crate::playlist;

pub const COMMAND_HANDLERS: fn(tauri::ipc::Invoke) -> bool = tauri::generate_handler![
    playlist::commands::playlist_add,
    playlist::commands::playlist_rename,
    playlist::commands::playlist_delete,
    playlist::commands::playlist_get_all,
];
