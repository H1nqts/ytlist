use rusqlite::Connection;
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex};

use crate::{playback, settings, ytdlp};

pub struct AppState {
    pub db: Mutex<Connection>,
    pub ytdlp: Arc<ytdlp::Manager>,
    pub settings: settings::Store,
    pub playback: playback::Store,
    pub closing: AtomicBool,
}
