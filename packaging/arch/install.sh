#!/bin/sh
# Installs or updates the ytlist package on Arch Linux.
set -eu

repo=H1nqts/ytlist

url=$(curl -fsSL "https://api.github.com/repos/${repo}/releases/latest" \
  | grep -o '"browser_download_url": *"[^"]*\.pkg\.tar\.zst"' \
  | head -n 1 \
  | cut -d '"' -f 4)

if [ -z "$url" ]; then
  echo "No Arch package found in the latest release." >&2
  exit 1
fi

file=${url##*/}
latest=$(echo "$file" | sed 's/^ytlist-\(.*\)-x86_64\.pkg\.tar\.zst$/\1/')
current=$(pacman -Q ytlist 2>/dev/null | cut -d ' ' -f 2 || true)

if [ "$current" = "$latest" ]; then
  echo "ytlist ${current} is already up to date."
  exit 0
fi

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

echo "Downloading ytlist ${latest}"
curl -fsSL -o "${tmp}/${file}" "$url"

sudo pacman -U --noconfirm "${tmp}/${file}"
