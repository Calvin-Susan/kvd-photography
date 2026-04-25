#!/usr/bin/env bash
# Scans the photos/ directory and writes photos.json.
# Newest files (by mtime) appear first.

set -euo pipefail

cd "$(dirname "$0")"

PHOTOS_DIR="photos"
OUT="photos.json"

if [ ! -d "$PHOTOS_DIR" ]; then
  echo "No '$PHOTOS_DIR' directory found." >&2
  exit 1
fi

# Collect image files (case-insensitive), sorted by mtime descending.
files=$(find "$PHOTOS_DIR" -maxdepth 1 -type f \
  \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \
     -o -iname "*.webp" -o -iname "*.avif" -o -iname "*.gif" \
     -o -iname "*.heic" -o -iname "*.heif" \) \
  -print0 2>/dev/null \
  | xargs -0 stat -f "%m %N" 2>/dev/null \
  | sort -rn \
  | cut -d' ' -f2-)

{
  echo "["
  first=1
  while IFS= read -r path; do
    [ -z "$path" ] && continue
    # Strip leading "./" if present
    rel="${path#./}"
    if [ $first -eq 1 ]; then
      first=0
    else
      echo ","
    fi
    # JSON-escape the path (handles backslashes and quotes only — fine for filenames).
    esc=$(printf '%s' "$rel" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g')
    printf '  "%s"' "$esc"
  done <<< "$files"
  echo
  echo "]"
} > "$OUT"

count=$(grep -c '^  "' "$OUT" || true)
echo "Wrote $OUT with $count photo(s)."
