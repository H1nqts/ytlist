use anyhow::Result;
use rusty_ytdl::search::{self, PlaylistSearchOptions};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct Video {
    pub id: String,
    pub title: String,
    pub thumbnail: String,
    pub channel: Channel,
    pub duration: u64,
    pub views: u64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Channel {
    pub id: String,
    pub name: String,
    pub icon: String,
}

pub async fn fetch_for_playlist(list_id: String) -> Result<Vec<Video>> {
    let opts = PlaylistSearchOptions {
        fetch_all: true,
        ..Default::default()
    };
    let mut playlist = search::Playlist::get(list_id, Some(&opts)).await?;
    playlist.fetch(None).await;

    Ok(playlist
        .videos
        .iter()
        .map(|v| Video {
            id: v.id.clone(),
            title: v.title.clone(),
            thumbnail: v
                .thumbnails
                .last()
                .map(|t| t.url.clone())
                .unwrap_or_default(),
            channel: Channel {
                id: v.channel.id.clone(),
                name: v.channel.name.clone(),
                icon: v
                    .channel
                    .icon
                    .last()
                    .map(|i| i.url.clone())
                    .unwrap_or_default(),
            },
            duration: v.duration,
            views: v.views,
        })
        .collect())
}
