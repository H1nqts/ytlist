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

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    #[serde(default)]
    pub play_activation: PlayActivation,
}

#[derive(Deserialize, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct SettingsPatch {
    #[serde(default)]
    pub play_activation: Option<PlayActivation>,
}

impl Settings {
    fn apply(&mut self, patch: SettingsPatch) {
        if let Some(value) = patch.play_activation {
            self.play_activation = value;
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
