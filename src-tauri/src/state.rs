use rusqlite::Connection;
use std::sync::{Arc, Mutex};

use crate::ytdlp;

pub struct AppState {
    pub db: Mutex<Connection>,
    pub ytdlp: Arc<ytdlp::Manager>,
}
