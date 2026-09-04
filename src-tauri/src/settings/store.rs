use anyhow::{anyhow, Context, Result};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Manager as _};

use super::{Settings, SettingsPatch};

const FILE_NAME: &str = "settings.json";
const TEMP_NAME: &str = "settings.json.tmp";
const BACKUP_NAME: &str = "settings.json.bak";

pub struct Store {
    path: PathBuf,
    temp: PathBuf,
    settings: Mutex<Settings>,
}

impl Store {
    pub fn new(app: &AppHandle) -> Result<Self> {
        let dir = app.path().app_data_dir().context("no app data dir")?;
        std::fs::create_dir_all(&dir)
            .with_context(|| format!("failed to create app data dir: {}", dir.display()))?;

        let path = dir.join(FILE_NAME);
        let settings = load(&path, &dir.join(BACKUP_NAME));

        Ok(Self {
            path,
            temp: dir.join(TEMP_NAME),
            settings: Mutex::new(settings),
        })
    }

    pub fn get(&self) -> Result<Settings> {
        let settings = self
            .settings
            .lock()
            .map_err(|e| anyhow!("settings lock poisoned: {e}"))?;
        Ok(settings.clone())
    }

    pub fn update(&self, patch: SettingsPatch) -> Result<Settings> {
        let mut settings = self
            .settings
            .lock()
            .map_err(|e| anyhow!("settings lock poisoned: {e}"))?;

        let mut next = settings.clone();
        next.apply(patch);
        self.save(&next)?;
        *settings = next.clone();

        Ok(next)
    }

    fn save(&self, settings: &Settings) -> Result<()> {
        let json =
            serde_json::to_string_pretty(settings).context("failed to serialize settings")?;

        std::fs::write(&self.temp, json)
            .with_context(|| format!("failed to write {}", self.temp.display()))?;
        std::fs::rename(&self.temp, &self.path)
            .with_context(|| format!("failed to replace {}", self.path.display()))?;

        Ok(())
    }
}

fn load(path: &Path, backup: &Path) -> Settings {
    let raw = match std::fs::read_to_string(path) {
        Ok(raw) => raw,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Settings::default(),
        Err(e) => {
            eprintln!("warning: failed to read {}: {e}", path.display());
            return Settings::default();
        }
    };

    match serde_json::from_str(&raw) {
        Ok(settings) => settings,
        Err(e) => {
            eprintln!(
                "warning: {} is not valid settings JSON ({e}); falling back to defaults",
                path.display()
            );
            if let Err(e) = std::fs::rename(path, backup) {
                eprintln!("warning: failed to back up {}: {e}", path.display());
            }
            Settings::default()
        }
    }
}
