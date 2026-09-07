use log::{Level, LevelFilter};
use tauri::{Runtime, plugin::TauriPlugin};
use tauri_plugin_log::{
    FileOpenStrategy, RotationStrategy, Target, TargetKind, TimezoneStrategy, WEBVIEW_TARGET,
};

const FILE_NAME: &str = "ytlist";
const MAX_FILE_SIZE: u128 = 5 * 1024 * 1024;
const KEPT_FILES: usize = 5;

const OWN_CRATE: &str = "ytlist_lib";

pub fn plugin<R: Runtime>() -> TauriPlugin<R> {
    let level = if cfg!(debug_assertions) {
        LevelFilter::Debug
    } else {
        LevelFilter::Info
    };

    tauri_plugin_log::Builder::new()
        .targets([
            Target::new(TargetKind::LogDir {
                file_name: Some(FILE_NAME.into()),
            }),
            Target::new(TargetKind::Stdout),
        ])
        .max_file_size(MAX_FILE_SIZE)
        .rotation_strategy(RotationStrategy::KeepSome(KEPT_FILES))
        .file_open_strategy(FileOpenStrategy::Rotate)
        .timezone_strategy(TimezoneStrategy::UseLocal)
        .level(level)
        .filter(is_own_record)
        .build()
}

fn is_own_record(metadata: &log::Metadata) -> bool {
    let target = metadata.target();
    let own = target.starts_with(OWN_CRATE) || target.starts_with(WEBVIEW_TARGET);

    own || metadata.level() <= Level::Warn
}
