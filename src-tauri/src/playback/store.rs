use anyhow::{anyhow, Context, Result};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Manager as _};

use super::Playback;

const FILE_NAME: &str = "playback.json";
const TEMP_NAME: &str = "playback.json.tmp";
const BACKUP_NAME: &str = "playback.json.bak";

pub struct Store {
    path: PathBuf,
    temp: PathBuf,
    playback: Mutex<Playback>,
}

impl Store {
    pub fn new(app: &AppHandle) -> Result<Self> {
        let dir = app.path().app_data_dir().context("no app data dir")?;
        std::fs::create_dir_all(&dir)
            .with_context(|| format!("failed to create app data dir: {}", dir.display()))?;

        let path = dir.join(FILE_NAME);
        let playback = load(&path, &dir.join(BACKUP_NAME));

        Ok(Self {
            path,
            temp: dir.join(TEMP_NAME),
            playback: Mutex::new(playback),
        })
    }

    pub fn get(&self) -> Result<Playback> {
        let playback = self
            .playback
            .lock()
            .map_err(|e| anyhow!("playback lock poisoned: {e}"))?;
        Ok(playback.clone())
    }

    pub fn set(&self, next: Playback) -> Result<()> {
        let mut playback = self
            .playback
            .lock()
            .map_err(|e| anyhow!("playback lock poisoned: {e}"))?;

        self.save(&next).inspect_err(|e| {
            log::error!("failed to save {}: {e:#}", self.path.display());
        })?;
        *playback = next;

        Ok(())
    }

    fn save(&self, playback: &Playback) -> Result<()> {
        let json =
            serde_json::to_string_pretty(playback).context("failed to serialize playback")?;

        std::fs::write(&self.temp, json)
            .with_context(|| format!("failed to write {}", self.temp.display()))?;
        std::fs::rename(&self.temp, &self.path)
            .with_context(|| format!("failed to replace {}", self.path.display()))?;

        Ok(())
    }
}

fn load(path: &Path, backup: &Path) -> Playback {
    let raw = match std::fs::read_to_string(path) {
        Ok(raw) => raw,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Playback::default(),
        Err(e) => {
            log::warn!("failed to read {}: {e}", path.display());
            return Playback::default();
        }
    };

    match serde_json::from_str(&raw) {
        Ok(playback) => playback,
        Err(e) => {
            log::warn!(
                "{} is not valid playback JSON ({e}); falling back to defaults",
                path.display()
            );
            if let Err(e) = std::fs::rename(path, backup) {
                log::warn!("failed to back up {}: {e}", path.display());
            }
            Playback::default()
        }
    }
}
