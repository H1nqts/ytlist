pub mod commands;

use anyhow::{anyhow, bail, Context, Result};
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::path::{Path, PathBuf};
use std::time::Duration;
use tauri::async_runtime::Mutex;
use tauri::{AppHandle, Emitter, Manager as _};
use url::Url;
use youtube_dl::{download_yt_dlp, Format, Protocol, SingleVideo, YoutubeDl};

pub const STATUS_EVENT: &str = "ytdlp://status";

const AUDIO_FORMAT: &str = "bestaudio";
const PLAYER_CLIENTS: &str = "youtube:player_client=tv_embedded,web,visionos";
const SOCKET_TIMEOUT: &str = "15";
const PROCESS_TIMEOUT: Duration = Duration::from_secs(60);
const UPDATE_TIMEOUT: Duration = Duration::from_secs(120);
const UPDATE_POLL_INTERVAL: Duration = Duration::from_millis(200);
const VIDEO_ID_LEN: usize = 11;

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

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct StreamInfo {
    pub url: String,
    pub ext: Option<String>,
    pub abr: Option<f64>,
    pub acodec: Option<String>,
    /// unix seconds
    pub expires_at: Option<i64>,
}

#[derive(Debug, Clone)]
enum Source {
    /// Owned by the system package manager. Never updated in place.
    System(PathBuf),
    /// Downloaded into the app data dir. Safe to self-update.
    Managed(PathBuf),
}

impl Source {
    fn path(&self) -> &Path {
        match self {
            Source::System(path) | Source::Managed(path) => path,
        }
    }
}

pub struct Manager {
    app: AppHandle,
    dir: PathBuf,
    bin: Mutex<Option<Source>>,
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
        if let Some(source) = bin.as_ref() {
            return Ok(source.path().to_owned());
        }

        let resolved = match system_bin() {
            Some(path) => {
                log::info!("using yt-dlp from PATH: {}", path.display());
                Ok(Source::System(path))
            }
            None => {
                let path = self.dir.join(BIN_NAME);
                if path.is_file() {
                    self.update(&path).await.map(Source::Managed)
                } else {
                    self.download().await.map(Source::Managed)
                }
            }
        };

        match resolved {
            Ok(source) => {
                let path = source.path().to_owned();
                self.set_status(Status::new(State::Ready));
                *bin = Some(source);
                Ok(path)
            }
            Err(e) => {
                log::error!("yt-dlp is unavailable: {e:#}");
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

    pub async fn resolve_stream(&self, video_id: &str) -> Result<StreamInfo> {
        self.resolve_stream_inner(video_id).await.inspect_err(|e| {
            log::error!("failed to resolve a stream for {video_id}: {e:#}");
        })
    }

    async fn resolve_stream_inner(&self, video_id: &str) -> Result<StreamInfo> {
        validate_video_id(video_id)?;
        let bin = self.ensure().await?;

        let output = YoutubeDl::new(format!("https://www.youtube.com/watch?v={video_id}"))
            .youtube_dl_path(bin)
            .format(AUDIO_FORMAT)
            .extra_arg("--no-playlist")
            .extra_arg("--extractor-args")
            .extra_arg(PLAYER_CLIENTS)
            .socket_timeout(SOCKET_TIMEOUT)
            .process_timeout(PROCESS_TIMEOUT)
            .run_async()
            .await
            .context("failed to run yt-dlp")?;

        let video = output
            .into_single_video()
            .context("yt-dlp returned a playlist, expected a single video")?;

        stream_info(video)
    }

    async fn download(&self) -> Result<PathBuf> {
        self.set_status(Status::new(State::Downloading));
        std::fs::create_dir_all(&self.dir)
            .with_context(|| format!("failed to create bin dir: {}", self.dir.display()))?;

        log::info!("downloading yt-dlp into {}", self.dir.display());
        let path = download_yt_dlp(&self.dir)
            .await
            .context("failed to download yt-dlp")?;
        log::info!("downloaded yt-dlp");

        Ok(path)
    }

    async fn update(&self, path: &Path) -> Result<PathBuf> {
        self.set_status(Status::new(State::Updating));
        log::info!("updating yt-dlp");

        match self_update(path.to_owned()).await {
            Ok(()) => return Ok(path.to_owned()),
            Err(e) => log::warn!("yt-dlp self-update failed: {e:#}"),
        }

        match self.download().await {
            Ok(path) => Ok(path),
            Err(e) if path.is_file() => {
                log::warn!("yt-dlp re-download failed, keeping existing binary: {e:#}");
                Ok(path.to_owned())
            }
            Err(e) => Err(e),
        }
    }
}

#[cfg(unix)]
fn system_bin() -> Option<PathBuf> {
    use std::os::unix::fs::PermissionsExt as _;

    let path = std::env::var_os("PATH")?;
    std::env::split_paths(&path).find_map(|dir| {
        let candidate = dir.join(BIN_NAME);
        let meta = candidate.metadata().ok()?;
        (meta.is_file() && meta.permissions().mode() & 0o111 != 0).then_some(candidate)
    })
}

#[cfg(not(unix))]
fn system_bin() -> Option<PathBuf> {
    None
}

fn validate_video_id(id: &str) -> Result<()> {
    let valid = id.len() == VIDEO_ID_LEN
        && id
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_');

    if valid {
        Ok(())
    } else {
        bail!("invalid video id")
    }
}

fn stream_info(video: SingleVideo) -> Result<StreamInfo> {
    if let Some(url) = video.url.filter(|url| !url.is_empty()) {
        return Ok(StreamInfo {
            expires_at: expires_at(&url),
            url,
            ext: video.ext,
            abr: video.abr,
            acodec: video.acodec,
        });
    }

    let format = video
        .formats
        .unwrap_or_default()
        .into_iter()
        .filter(is_playable_audio)
        .max_by(|a, b| {
            a.abr
                .unwrap_or_default()
                .partial_cmp(&b.abr.unwrap_or_default())
                .unwrap_or(Ordering::Equal)
        })
        .context("no playable audio-only format found")?;

    let url = format.url.context("selected format has no url")?;

    Ok(StreamInfo {
        expires_at: expires_at(&url),
        url,
        ext: format.ext,
        abr: format.abr,
        acodec: format.acodec,
    })
}

fn is_playable_audio(format: &Format) -> bool {
    let audio_only = format.acodec.is_some() && format.vcodec.is_none();
    let progressive = matches!(
        format.protocol,
        Some(Protocol::Https) | Some(Protocol::Http)
    );

    audio_only && progressive && format.url.is_some()
}

fn expires_at(url: &str) -> Option<i64> {
    Url::parse(url)
        .ok()?
        .query_pairs()
        .find(|(key, _)| key == "expire")
        .and_then(|(_, value)| value.parse().ok())
}

async fn self_update(path: PathBuf) -> Result<()> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut child = command(&path)
            .arg("--update")
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .context("failed to run yt-dlp --update")?;

        let deadline = std::time::Instant::now() + UPDATE_TIMEOUT;
        let status = loop {
            match child.try_wait().context("failed to poll yt-dlp --update")? {
                Some(status) => break status,
                None if std::time::Instant::now() >= deadline => {
                    let _ = child.kill();
                    let _ = child.wait();
                    bail!("yt-dlp --update timed out");
                }
                None => std::thread::sleep(UPDATE_POLL_INTERVAL),
            }
        };

        if status.success() {
            return Ok(());
        }

        let mut stderr = String::new();
        if let Some(mut reader) = child.stderr.take() {
            use std::io::Read as _;
            let _ = reader.read_to_string(&mut stderr);
        }
        Err(anyhow!(
            "yt-dlp --update exited with {}: {}",
            status,
            stderr.trim_end()
        ))
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
