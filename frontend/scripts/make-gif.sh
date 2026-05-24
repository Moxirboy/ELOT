#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# make-gif.sh — convert artifacts/demo/elot-demo.webm to two GIFs
#
#   elot-demo.gif         full demo, 12fps, 960px wide  (~good readme size)
#   elot-demo-short.gif   first 12 seconds, 14fps, 960px wide (twitter loop)
#
# Uses ffmpeg's palettegen + paletteuse two-pass for clean colors at small
# file sizes. Requires ffmpeg in PATH.
# ----------------------------------------------------------------------------
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEMO_DIR="$ROOT/artifacts/demo"
SRC="$DEMO_DIR/elot-demo.webm"
FULL_GIF="$DEMO_DIR/elot-demo.gif"
SHORT_GIF="$DEMO_DIR/elot-demo-short.gif"
PALETTE="$DEMO_DIR/.palette.png"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg not found in PATH — install it (brew install ffmpeg) first." >&2
  exit 1
fi

if [[ ! -f "$SRC" ]]; then
  echo "Source video not found: $SRC" >&2
  echo "Run \`npm run demo:record\` first." >&2
  exit 1
fi

# Cleanup palette on exit so a half-built run doesn't poison the next.
trap 'rm -f "$PALETTE"' EXIT

# Tunables — override from the environment for one-off renders.
WIDTH="${ELOT_GIF_WIDTH:-960}"
FPS_FULL="${ELOT_GIF_FPS:-12}"
FPS_SHORT="${ELOT_GIF_SHORT_FPS:-14}"
SHORT_SECONDS="${ELOT_GIF_SHORT_DURATION:-12}"

echo "[make-gif] source : $SRC"
echo "[make-gif] target : $FULL_GIF (full, ${FPS_FULL}fps, ${WIDTH}px)"
echo "[make-gif] target : $SHORT_GIF (first ${SHORT_SECONDS}s, ${FPS_SHORT}fps, ${WIDTH}px)"

# ---------------------------- Full demo GIF ---------------------------------
echo "[make-gif] (1/4) generating palette for full GIF…"
ffmpeg -y -loglevel error \
  -i "$SRC" \
  -vf "fps=${FPS_FULL},scale=${WIDTH}:-1:flags=lanczos,palettegen=stats_mode=diff" \
  "$PALETTE"

echo "[make-gif] (2/4) rendering full GIF…"
ffmpeg -y -loglevel error \
  -i "$SRC" -i "$PALETTE" \
  -lavfi "fps=${FPS_FULL},scale=${WIDTH}:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4" \
  "$FULL_GIF"

# ---------------------------- Short GIF -------------------------------------
echo "[make-gif] (3/4) generating palette for short GIF…"
ffmpeg -y -loglevel error \
  -t "$SHORT_SECONDS" -i "$SRC" \
  -vf "fps=${FPS_SHORT},scale=${WIDTH}:-1:flags=lanczos,palettegen=stats_mode=diff" \
  "$PALETTE"

echo "[make-gif] (4/4) rendering short GIF…"
ffmpeg -y -loglevel error \
  -t "$SHORT_SECONDS" -i "$SRC" -i "$PALETTE" \
  -lavfi "fps=${FPS_SHORT},scale=${WIDTH}:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4" \
  "$SHORT_GIF"

# ---------------------------- Summary ---------------------------------------
sizeof() {
  if [[ -f "$1" ]]; then
    # macOS `stat -f%z`, Linux `stat -c%s`
    if stat -f%z "$1" >/dev/null 2>&1; then
      stat -f%z "$1"
    else
      stat -c%s "$1"
    fi
  else
    echo 0
  fi
}

echo ""
echo "[make-gif] done."
printf "  %-30s %10s bytes\n" "$(basename "$SRC")"        "$(sizeof "$SRC")"
printf "  %-30s %10s bytes\n" "$(basename "$FULL_GIF")"   "$(sizeof "$FULL_GIF")"
printf "  %-30s %10s bytes\n" "$(basename "$SHORT_GIF")"  "$(sizeof "$SHORT_GIF")"
