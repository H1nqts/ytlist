use anyhow::{Context, Result};
use rusqlite::Connection;
use tauri::{AppHandle, Manager};

pub fn init(app: &AppHandle) -> Result<Connection> {
    let dir = app.path().app_data_dir().context("no app data dir")?;
    std::fs::create_dir_all(&dir)
        .with_context(|| format!("failed to create app data dir: {}", dir.display()))?;

    let conn = Connection::open(dir.join("data.db")).context("failed to open data.db")?;
    configure(&conn)?;
    create_tables(&conn).context("failed to create tables")?;

    Ok(conn)
}

fn configure(conn: &Connection) -> Result<()> {
    let mode: String = conn
        .query_row("PRAGMA journal_mode = WAL", [], |row| row.get(0))
        .context("failed to set journal_mode=WAL")?;
    if mode.to_lowercase() != "wal" {
        eprintln!("warning: journal_mode is '{}', not WAL", mode);
    }

    conn.pragma_update(None, "foreign_keys", "ON")
        .context("failed to enable foreign_keys")?;

    Ok(())
}

fn create_tables(conn: &Connection) -> Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS playlists (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            url TEXT NOT NULL,
            channel_name TEXT NOT NULL,
            thumbnail_url TEXT NOT NULL,
            views INTEGER NOT NULL,
            last_updated_at TEXT,
            last_synced_at TEXT
        )",
        [],
    )?;

    Ok(())
}
