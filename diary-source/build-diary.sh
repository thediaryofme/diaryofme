#!/bin/sh
set -e

SOURCE="$(cd "$(dirname "$0")" && pwd)"

# Refresh the service worker shell list, cache version, and CSP hashes.
sh "$SOURCE/update-cache.sh" "$SOURCE"

# Sync to diary folder
mkdir -p "$SOURCE/../diary"
DIARY="$(cd "$SOURCE/../diary" && pwd)"

rsync -a --delete --exclude='.git' --exclude='build-diary.sh' --exclude='scripts/' "$SOURCE/" "$DIARY/"

# Remove host-specific folders not needed on the deployed site
rm -rf "$DIARY/.git" "$DIARY/.github" "$DIARY/.vscode"

# Remove non-code files from diary
find "$DIARY" -not -path '*/.git/*' -type f \
  ! -name "*.js" \
  ! -name "*.css" \
  ! -name "*.html" \
  ! -name "*.svg" \
  ! -name "*.wasm" \
  ! -name "*.webmanifest" \
  ! -name "*.woff2" \
  ! -name "*.siv" \
  ! -name "*.tkey" \
  ! -name "*.mkey" \
  -delete

node "$SOURCE/scripts/minify-static.js" "$DIARY"
find "$DIARY" -type f -name "*.js" -exec sh -c '
  for file do
    tmp="$file.tmp"
    terser "$file" --compress --mangle --comments false -o "$tmp"
    mv "$tmp" "$file"
  done
' sh {} +
node "$SOURCE/scripts/build-csp-hash.js" "$DIARY"

echo "Synced diary-source to diary."
