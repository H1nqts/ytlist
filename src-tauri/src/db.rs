use anyhow::{Context, Result};
use rusqlite::Connection;
use tauri::{AppHandle, Manager};

pub fn init(app: &AppHandle) -> Result<Connection> {
    let dir = app.path().app_data_dir().context("no app data dir")?;
    std::fs::create_dir_all(&dir)
        .with_context(|| format!("failed to create app data dir: {}", dir.display()))?;

    let conn = Connection::open(dir.join("data.db")).context("failed to open data.db")?;
    configure(&conn)?;
    migrate(&conn).context("failed to migrate the schema")?;

    Ok(conn)
}

fn configure(conn: &Connection) -> Result<()> {
    let mode: String = conn
        .query_row("PRAGMA journal_mode = WAL", [], |row| row.get(0))
        .context("failed to set journal_mode=WAL")?;
    if mode.to_lowercase() != "wal" {
        log::warn!("journal_mode is '{}', not WAL", mode);
    }

    conn.pragma_update(None, "foreign_keys", "ON")
        .context("failed to enable foreign_keys")?;

    Ok(())
}

const SCHEMA_VERSION: i64 = 1;

const V1: &str = "
    CREATE TABLE IF NOT EXISTS playlists (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        channel_name TEXT NOT NULL,
        thumbnail_url TEXT NOT NULL,
        views INTEGER NOT NULL,
        last_updated_at TEXT,
        last_synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS channels (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS videos (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        thumbnail TEXT NOT NULL,
        channel_id TEXT REFERENCES channels(id) ON DELETE SET NULL,
        duration INTEGER NOT NULL,
        views INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS playlist_videos (
        playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
        video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        PRIMARY KEY (playlist_id, position)
    );

    CREATE INDEX IF NOT EXISTS playlist_videos_video
        ON playlist_videos (video_id);

    CREATE TABLE IF NOT EXISTS playlist_skipped (
        playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
        entry_index INTEGER NOT NULL,
        video_id TEXT,
        reason TEXT NOT NULL,
        detail TEXT
    );

    CREATE INDEX IF NOT EXISTS playlist_skipped_playlist
        ON playlist_skipped (playlist_id);
";

fn migrate(conn: &Connection) -> Result<()> {
    let version: i64 = conn
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .context("failed to read user_version")?;

    if version >= SCHEMA_VERSION {
        return Ok(());
    }

    if version < 1 {
        conn.execute_batch(V1).context("failed to apply v1")?;
    }

    conn.pragma_update(None, "user_version", SCHEMA_VERSION)
        .context("failed to set user_version")?;

    log::info!("migrated the schema from version {version} to {SCHEMA_VERSION}");

    Ok(())
}
