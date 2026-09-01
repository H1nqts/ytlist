pub mod commands;

use anyhow::{anyhow, Context, Result};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::async_runtime::Mutex;
use tauri::{AppHandle, Emitter, Manager as _};
use youtube_dl::download_yt_dlp;

pub const STATUS_EVENT: &str = "ytdlp://status";

const BIN_NAME: &str = if cfg!(windows) {
    "yt-dlp.exe"
} else {
    "yt-dlp"
};

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum State {
    Checking,
    Downloading,
    Updating,
    Ready,
    Error,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Status {
    pub state: State,
    pub message: Option<String>,
}

impl Status {
    fn new(state: State) -> Self {
        Self {
            state,
            message: None,
        }
    }

    fn error(message: String) -> Self {
        Self {
            state: State::Error,
            message: Some(message),
        }
    }
}

pub struct Manager {
    app: AppHandle,
    dir: PathBuf,
    bin: Mutex<Option<PathBuf>>,
    status: std::sync::Mutex<Status>,
}

impl Manager {
    pub fn new(app: &AppHandle) -> Result<Self> {
        let dir = app
            .path()
            .app_data_dir()
            .context("no app data dir")?
            .join("bin");

        Ok(Self {
            app: app.clone(),
            dir,
            bin: Mutex::new(None),
            status: std::sync::Mutex::new(Status::new(State::Checking)),
        })
    }

    pub fn status(&self) -> Status {
        match self.status.lock() {
            Ok(status) => status.clone(),
            Err(poisoned) => poisoned.into_inner().clone(),
        }
    }

    fn set_status(&self, status: Status) {
        match self.status.lock() {
            Ok(mut current) => *current = status.clone(),
            Err(poisoned) => *poisoned.into_inner() = status.clone(),
        }
        let _ = self.app.emit(STATUS_EVENT, status);
    }

    pub async fn ensure(&self) -> Result<PathBuf> {
        let mut bin = self.bin.lock().await;
        if let Some(path) = bin.as_ref() {
            return Ok(path.clone());
        }

        let path = self.dir.join(BIN_NAME);
        let resolved = if path.is_file() {
            self.update(&path).await
        } else {
            self.download().await
        };

        match resolved {
            Ok(path) => {
                self.set_status(Status::new(State::Ready));
                *bin = Some(path.clone());
                Ok(path)
            }
            Err(e) => {
                self.set_status(Status::error(e.to_string()));
                Err(e)
            }
        }
    }

    pub async fn retry(&self) -> Status {
        if self.status().state == State::Error {
            self.set_status(Status::new(State::Checking));
        }
        let _ = self.ensure().await;
        self.status()
    }

    async fn download(&self) -> Result<PathBuf> {
        self.set_status(Status::new(State::Downloading));
        std::fs::create_dir_all(&self.dir)
            .with_context(|| format!("failed to create bin dir: {}", self.dir.display()))?;
        download_yt_dlp(&self.dir)
            .await
            .context("failed to download yt-dlp")
    }

    async fn update(&self, path: &Path) -> Result<PathBuf> {
        self.set_status(Status::new(State::Updating));

        match self_update(path.to_owned()).await {
            Ok(()) => return Ok(path.to_owned()),
            Err(e) => eprintln!("warning: yt-dlp self-update failed: {e}"),
        }

        match self.download().await {
            Ok(path) => Ok(path),
            Err(e) if path.is_file() => {
                eprintln!("warning: yt-dlp re-download failed, keeping existing binary: {e}");
                Ok(path.to_owned())
            }
            Err(e) => Err(e),
        }
    }
}

async fn self_update(path: PathBuf) -> Result<()> {
    tauri::async_runtime::spawn_blocking(move || {
        let output = command(&path)
            .arg("--update")
            .output()
            .context("failed to run yt-dlp --update")?;

        if output.status.success() {
            Ok(())
        } else {
            Err(anyhow!(
                "yt-dlp --update exited with {}: {}",
                output.status,
                String::from_utf8_lossy(output.stderr.trim_ascii_end())
            ))
        }
    })
    .await
    .context("yt-dlp --update task failed")?
}

#[cfg(windows)]
fn command(path: &Path) -> std::process::Command {
    use std::os::windows::process::CommandExt;

    const CREATE_NO_WINDOW: u32 = 0x0800_0000;

    let mut command = std::process::Command::new(path);
    command.creation_flags(CREATE_NO_WINDOW);
    command
}

#[cfg(not(windows))]
fn command(path: &Path) -> std::process::Command {
    std::process::Command::new(path)
}
