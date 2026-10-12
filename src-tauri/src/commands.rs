use crate::{logs, playback, playlist, settings, stats, video, ytdlp};

pub const COMMAND_HANDLERS: fn(tauri::ipc::Invoke) -> bool = tauri::generate_handler![
    logs::commands::log_dir_get,
    playlist::commands::playlist_add,
    playlist::commands::playlist_rename,
    playlist::commands::playlist_delete,
    playlist::commands::playlist_get_all,
    playlist::commands::playlist_fetch_videos,
    playlist::commands::playlist_get_videos,
    video::commands::video_get_by_ids,
    settings::commands::settings_get,
    settings::commands::settings_update,
    playback::commands::playback_get,
    playback::commands::playback_set,
    stats::commands::stats_record,
    stats::commands::stats_overview,
    stats::commands::stats_ranking,
    stats::commands::stats_clear,
    ytdlp::commands::ytdlp_status,
    ytdlp::commands::ytdlp_retry,
    ytdlp::commands::stream_resolve,
];
