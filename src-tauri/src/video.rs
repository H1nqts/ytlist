pub mod commands;
pub mod repo;

use anyhow::Result;
use rusty_ytdl::search::{self, FetchStop, PlaylistSearchOptions, SkipReason};
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

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SkippedVideo {
    pub index: usize,
    pub video_id: Option<String>,
    pub reason: String,
    pub detail: Option<String>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FetchOutcome {
    pub stop: &'static str,
    pub detail: Option<String>,
    pub complete: bool,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PlaylistVideos {
    pub videos: Vec<Video>,
    pub skipped: Vec<SkippedVideo>,
    pub outcome: FetchOutcome,
}

impl SkippedVideo {
    fn from_entry(entry: &search::SkippedEntry) -> Self {
        let (reason, detail) = match &entry.reason {
            SkipReason::MissingContentId => ("missingContentId", None),
            SkipReason::EmptyContentId => ("emptyContentId", None),
            SkipReason::MissingVideoId => ("missingVideoId", None),
            SkipReason::Unplayable => ("unplayable", None),
            SkipReason::UnknownRendererType(keys) => ("unknownRendererType", Some(keys.clone())),
            SkipReason::ContainerNotArray => ("containerNotArray", None),
        };

        Self {
            index: entry.index,
            video_id: entry.video_id.clone(),
            reason: reason.to_string(),
            detail,
        }
    }
}

impl FetchOutcome {
    fn from_stop(stop: Option<&FetchStop>) -> Self {
        match stop {
            None => Self::complete("notFetched"),
            Some(FetchStop::Completed) => Self::complete("completed"),
            Some(FetchStop::NoContinuationToken) => Self::complete("noContinuationToken"),
            Some(FetchStop::LimitReached) => Self::truncated("limitReached", None),
            Some(FetchStop::RequestFailed(err)) => {
                Self::truncated("requestFailed", Some(err.clone()))
            }
            Some(FetchStop::ResponseShapeChanged) => Self::truncated("responseShapeChanged", None),
            Some(FetchStop::EmptyPage) => Self::truncated("emptyPage", None),
        }
    }

    /// A truncated fetch is never saved, so anything read back was complete.
    pub fn stored() -> Self {
        Self::complete("stored")
    }

    fn complete(stop: &'static str) -> Self {
        Self {
            stop,
            detail: None,
            complete: true,
        }
    }

    fn truncated(stop: &'static str, detail: Option<String>) -> Self {
        Self {
            stop,
            detail,
            complete: false,
        }
    }
}

pub async fn fetch_for_playlist(list_id: String) -> Result<PlaylistVideos> {
    let opts = PlaylistSearchOptions {
        limit: u64::MAX,
        fetch_all: true,
        include_unavailable: true,
        ..Default::default()
    };
    let mut playlist = search::Playlist::get(list_id, Some(&opts)).await?;
    playlist.fetch(None).await;

    let videos: Vec<Video> = playlist
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
        .collect();

    let skipped: Vec<SkippedVideo> = playlist
        .skipped
        .iter()
        .map(SkippedVideo::from_entry)
        .collect();

    let outcome = FetchOutcome::from_stop(playlist.fetch_stopped.as_ref());

    if !skipped.is_empty() || !outcome.complete {
        log::warn!(
            "playlist {} yielded {} videos, skipped {} entries, stopped at {}",
            playlist.id,
            videos.len(),
            skipped.len(),
            outcome.stop,
        );
    }

    Ok(PlaylistVideos {
        videos,
        skipped,
        outcome,
    })
}
