# ytlist

A desktop client for browsing and playing your YouTube playlists.
Built with Tauri, React, and Tailwind CSS.

Audio playback is handled by [yt-dlp](https://github.com/yt-dlp/yt-dlp). On Linux the app uses the yt-dlp from your PATH. On other systems it downloads a copy on first launch. A JS runtime such as [Deno](https://deno.com) is required for yt-dlp to work properly.

## Install on Arch Linux

```sh
curl -fsSL https://raw.githubusercontent.com/H1nqts/ytlist/main/packaging/arch/install.sh | sh
```

## Credits

Inspired by [Fluyer](https://github.com/luneflu/Fluyer).

## License

[MIT](LICENSE) © H1nqts

YouTube is a trademark of Google LLC. ytlist is an independent project and is
not affiliated with, sponsored by, or endorsed by YouTube or Google LLC.
