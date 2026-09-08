pub mod commands;
mod store;

use anyhow::Result;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

pub use store::Store;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct QueueEntry {
    pub key: String,
    pub track_id: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct Playback {
    #[serde(default)]
    pub queue: Vec<QueueEntry>,
    #[serde(default)]
    pub current_track_id: Option<String>,
    #[serde(default)]
    pub current_queue_key: Option<String>,
    #[serde(default)]
    pub current_playlist_id: Option<i64>,
}

pub fn init(app: &AppHandle) -> Result<Store> {
    Store::new(app)
}

pub fn get(store: &Store) -> Result<Playback> {
    store.get()
}

pub fn set(store: &Store, playback: Playback) -> Result<()> {
    store.set(playback)
}
