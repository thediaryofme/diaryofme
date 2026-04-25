#!/bin/sh
set -e

REPO="${1:-$(cd "$(dirname "$0")" && pwd)}"
REPO="$(cd "$REPO" && pwd)"
SW="$REPO/service-worker.js"
TIMESTAMP="$(date -u +%s)"

_PAGES_TMP="$(mktemp)"
_MISSING_TMP="$(mktemp)"
trap 'rm -f "$_PAGES_TMP" "$_MISSING_TMP"' EXIT

sed -n '/^const SHELL_PAGE_URLS/,/^]\.map/p' "$SW" > "$_PAGES_TMP"

find "$REPO" -name "index.html" \
  -not -path '*/.git/*' \
  | sort \
  | while IFS= read -r _html; do
      _rel="${_html#$REPO/}"
      _dir="${_rel%index.html}"
      for _url in "./$_dir" "./$_rel"; do
        if ! grep -qF "\"$_url\"" "$_PAGES_TMP"; then
          printf '  "%s",\n' "$_url" >> "$_MISSING_TMP"
        fi
      done
    done

if [ -s "$_MISSING_TMP" ]; then
  _MISSING="$(cat "$_MISSING_TMP")"
  awk -v missing="$_MISSING" '
    /^const SHELL_PAGE_URLS/ { in_shell=1 }
    in_shell && /^]\.map/ {
      printf "%s\n", missing
      in_shell=0
    }
    { print }
  ' "$SW" > "$SW.tmp" && mv "$SW.tmp" "$SW"
  echo "Added missing pages to SHELL_PAGE_URLS in service-worker.js."
fi

sed -i "s/\`\${CACHE_PREFIX}v[^'\`]*\`/\`\${CACHE_PREFIX}v$TIMESTAMP\`/" "$SW"

node "$REPO/scripts/build-csp-hash.js" "$REPO"

echo "Service worker shell list and cache version updated to v$TIMESTAMP."
