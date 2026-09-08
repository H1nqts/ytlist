pub mod commands;
mod store;

use anyhow::Result;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

pub use store::Store;

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq, Default)]
#[serde(rename_all = "lowercase")]
pub enum PlayActivation {
    Single,
    #[default]
    Double,
}

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq, Default)]
#[serde(rename_all = "lowercase")]
pub enum RepeatMode {
    #[default]
    Off,
    One,
    All,
}

fn default_volume() -> f64 {
    0.8
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    #[serde(default)]
    pub play_activation: PlayActivation,
    #[serde(default = "default_volume")]
    pub volume: f64,
    #[serde(default)]
    pub muted: bool,
    #[serde(default)]
    pub shuffle: bool,
    #[serde(default)]
    pub repeat: RepeatMode,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            play_activation: PlayActivation::default(),
            volume: default_volume(),
            muted: false,
            shuffle: false,
            repeat: RepeatMode::default(),
        }
    }
}

#[derive(Deserialize, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct SettingsPatch {
    #[serde(default)]
    pub play_activation: Option<PlayActivation>,
    #[serde(default)]
    pub volume: Option<f64>,
    #[serde(default)]
    pub muted: Option<bool>,
    #[serde(default)]
    pub shuffle: Option<bool>,
    #[serde(default)]
    pub repeat: Option<RepeatMode>,
}

impl Settings {
    fn apply(&mut self, patch: SettingsPatch) {
        if let Some(value) = patch.play_activation {
            self.play_activation = value;
        }
        if let Some(value) = patch.volume {
            self.volume = value.clamp(0.0, 1.0);
        }
        if let Some(value) = patch.muted {
            self.muted = value;
        }
        if let Some(value) = patch.shuffle {
            self.shuffle = value;
        }
        if let Some(value) = patch.repeat {
            self.repeat = value;
        }
    }
}

pub fn init(app: &AppHandle) -> Result<Store> {
    Store::new(app)
}

pub fn get(store: &Store) -> Result<Settings> {
    store.get()
}

pub fn update(store: &Store, patch: SettingsPatch) -> Result<Settings> {
    store.update(patch)
}
