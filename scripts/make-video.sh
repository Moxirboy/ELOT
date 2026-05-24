#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# make-video.sh — render the ELOT marketing video end-to-end.
#
# Reads artifacts/screenshots/{SCRIPT.md + PNGs}, calls Google Cloud Text-
# to-Speech for the voiceover, stitches into a single 1280x720 MP4 with
# ffmpeg + a slow Ken-Burns zoom on each frame.
#
# Prereqs:
#   - gcloud SDK, authed (`gcloud auth login`)
#   - ffmpeg + ffprobe on PATH (brew install ffmpeg)
#   - python3 on PATH (stdlib only, no pip installs needed)
#
# Run:
#   bash scripts/make-video.sh                       # full render
#   TTS_VOICE=en-US-Studio-M bash scripts/make-video.sh   # premium voice
#   RECACHE_TTS=1 bash scripts/make-video.sh         # force re-TTS (else cached)
# ----------------------------------------------------------------------------
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# --- prerequisites ----------------------------------------------------------
for bin in gcloud ffmpeg ffprobe python3; do
  command -v "$bin" >/dev/null 2>&1 || {
    echo "[make-video] missing dependency: $bin" >&2
    exit 1
  }
done

PROJECT="${GCP_PROJECT:-$(gcloud config get-value project 2>/dev/null || true)}"
if [[ -z "$PROJECT" || "$PROJECT" == "(unset)" ]]; then
  echo "[make-video] no GCP project configured." >&2
  echo "[make-video] run: gcloud config set project YOUR_PROJECT" >&2
  exit 1
fi
echo "[make-video] project: $PROJECT"

# --- enable TTS API on first run -------------------------------------------
if ! gcloud services list --enabled --project="$PROJECT" \
       --filter="name:texttospeech.googleapis.com" 2>/dev/null \
     | grep -q texttospeech; then
  echo "[make-video] enabling texttospeech.googleapis.com on $PROJECT…"
  gcloud services enable texttospeech.googleapis.com --project="$PROJECT"
fi

# --- fresh access token (1-hour lifetime, that's fine for a single run) ----
TOKEN="$(gcloud auth print-access-token)"
if [[ -z "$TOKEN" ]]; then
  echo "[make-video] gcloud auth print-access-token returned empty." >&2
  exit 1
fi

# --- run the python orchestrator -------------------------------------------
export GCP_ACCESS_TOKEN="$TOKEN"
export GCP_PROJECT="$PROJECT"
exec python3 "$ROOT/scripts/make-video.py"
