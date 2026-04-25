#!/bin/sh
set -e

REPO="$(cd "$(dirname "$0")" && pwd)"
TS="$(date -u +%s)"

# Refresh the service worker shell list, cache version, and CSP hashes.
sh "$REPO/update-cache.sh" "$REPO"

# Push source to GitHub
cd "$REPO"
git add -A
git commit -m "publish $TS"
git push || true

# Push diary to GitHub
DIARY="$(cd "$REPO/../diary" && pwd)"
if [ ! -d "$DIARY/.git" ]; then
  git -C "$DIARY" init
  git -C "$DIARY" remote add origin https://github.com/thediaryofme/diaryofme.git
  git -C "$DIARY" checkout -b main
fi

git -C "$DIARY" add -A
git -C "$DIARY" commit -m "publish $TS"
git -C "$DIARY" push -u origin main
